// Copyright 2025 The Perses Authors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package dac

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/perses/perses/go-sdk/dashboard"
	"github.com/perses/perses/go-sdk/datasource"
	panelgroup "github.com/perses/perses/go-sdk/panel-group"
	variablegroup "github.com/perses/perses/go-sdk/variable-group"
	listVar "github.com/perses/perses/go-sdk/variable/list-variable"
	txtVar "github.com/perses/perses/go-sdk/variable/text-variable"
	promDs "github.com/perses/plugins/prometheus/sdk/go/datasource"
	labelNamesVar "github.com/perses/plugins/prometheus/sdk/go/variable/label-names"
	labelValuesVar "github.com/perses/plugins/prometheus/sdk/go/variable/label-values"
	promqlVar "github.com/perses/plugins/prometheus/sdk/go/variable/promql"
	staticlist "github.com/perses/plugins/staticlistvariable/sdk/go"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestDashboardBuilder(t *testing.T) {
	builder, buildErr := dashboard.New("ContainersMonitoring",
		dashboard.Name("Containers monitoring"),
		dashboard.ProjectName("MyProject"),

		// VARIABLES
		dashboard.AddVariable("stack",
			listVar.List(
				labelValuesVar.PrometheusLabelValues("stack",
					labelValuesVar.Matchers("thanos_build_info{}"),
					labelValuesVar.Datasource("promDemo"),
				),
				listVar.DisplayName("PaaS"),
				listVar.CapturingRegexp("(.+)"),
			),
		),
		dashboard.AddVariable("prometheus",
			txtVar.Text("platform", txtVar.Constant(true)),
		),
		dashboard.AddVariable("prometheus_namespace",
			listVar.List(
				staticlist.StaticList(staticlist.Values("observability", "monitoring")),
				listVar.Description("to reduce the query scope thus improve performances"),
			),
		),
		dashboard.AddVariable("namespace", listVar.List(
			promqlVar.PrometheusPromQL("group by (namespace) (kube_namespace_labels{stack=~\"$stack\",prometheus=~\"$prometheus\",prometheus_namespace=~\"$prometheus_namespace\"})", promqlVar.LabelName("namespace"), promqlVar.Datasource("promDemo")),
			listVar.AllowMultiple(true),
		)),
		dashboard.AddVariable("namespaceLabels", listVar.List(
			labelNamesVar.PrometheusLabelNames(
				labelNamesVar.Matchers("kube_namespace_labels{stack=~\"$stack\",prometheus=~\"$prometheus\",prometheus_namespace=~\"$prometheus_namespace\",namespace=~\"$namespace\"}"),
				labelNamesVar.Datasource("promDemo"),
			),
		)),
		dashboard.AddVariable("pod", listVar.List(
			promqlVar.PrometheusPromQL("group by (pod) (kube_pod_info{stack=~\"$stack\",prometheus=~\"$prometheus\",prometheus_namespace=~\"$prometheus_namespace\",namespace=~\"$namespace\"})", promqlVar.LabelName("pod"), promqlVar.Datasource("promDemo")),
			listVar.AllowMultiple(true),
			listVar.AllowAllValue(true),
		)),
		dashboard.AddVariable("container", listVar.List(
			promqlVar.PrometheusPromQL("group by (container) (kube_pod_container_info{stack=~\"$stack\",prometheus=~\"$prometheus\",prometheus_namespace=~\"$prometheus_namespace\",namespace=~\"$namespace\",pod=~\"$pod\"})", promqlVar.LabelName("container"), promqlVar.Datasource("promDemo")),
			listVar.AllowMultiple(true),
			listVar.AllowAllValue(true),
			listVar.CustomAllValue(".*"),
		)),
		dashboard.AddVariable("containerLabels", listVar.List(
			listVar.Description("simply the list of labels for the considered metric"),
			listVar.Hidden(true),
			labelNamesVar.PrometheusLabelNames(
				labelNamesVar.Matchers("kube_pod_container_info{stack=~\"$stack\",prometheus=~\"$prometheus\",prometheus_namespace=~\"$prometheus_namespace\",namespace=~\"$namespace\",pod=~\"$pod\",container=~\"$container\"}"),
				labelNamesVar.Datasource("promDemo"),
			),
			listVar.SortingBy("alphabetical-ci-desc"),
		)),

		// PANEL GROUPS
		dashboard.AddPanelGroup("Resource usage",
			panelgroup.PanelsPerLine(3),

			// PANELS
			buildMemoryPanel(""),
			buildCPUPanel(""),
		),
		dashboard.AddPanelGroup("Resource usage bis",
			panelgroup.PanelsPerLine(1),
			panelgroup.PanelHeight(4),

			// PANELS
			buildCPUPanel(grouping),
			buildMemoryPanel(grouping),
		),
		dashboard.AddPanelGroup("Misc",
			panelgroup.PanelsPerLine(1),

			// PANELS
			buildTargetStatusPanel(),
		),

		// DATASOURCES
		dashboard.AddDatasource("myPromDemo",
			datasource.Default(true),
			promDs.Prometheus(
				promDs.DirectURL("http://localhost:9090"),
			),
		),

		// TIME
		dashboard.Duration(3*time.Hour),
		dashboard.RefreshInterval(30*time.Second),
	)

	builderOutput, marshErr := json.Marshal(builder.Dashboard)
	outputJSONFilePath := filepath.Join("..", "..", "internal", "test", "dac", "expected_output.json")
	expectedOutput, readErr := os.ReadFile(outputJSONFilePath)

	t.Run("classic dashboard", func(t *testing.T) {
		assert.NoError(t, buildErr)
		assert.NoError(t, marshErr)
		assert.NoError(t, readErr)
		require.JSONEq(t, string(expectedOutput), string(builderOutput))
	})
}

func TestDashboardBuilderWithGroupedVariables(t *testing.T) {
	builder, buildErr := dashboard.New("ContainersMonitoring",
		dashboard.Name("Containers monitoring"),
		dashboard.ProjectName("MyProject"),
		dashboard.Description("A dashboard to monitor containers"),

		// VARIABLES
		dashboard.AddVariableGroup(
			variablegroup.AddVariable("stack",
				listVar.List(
					labelValuesVar.PrometheusLabelValues("stack",
						labelValuesVar.Matchers("thanos_build_info"),
						labelValuesVar.Datasource("promDemo"),
					),
					listVar.DisplayName("PaaS"),
					listVar.CapturingRegexp("(.+)"),
				),
			),
			variablegroup.AddVariable("prometheus",
				txtVar.Text("platform", txtVar.Constant(true)),
			),
			variablegroup.AddVariable("prometheus_namespace",
				listVar.List(
					staticlist.StaticList(staticlist.Values("observability", "monitoring")),
					listVar.Description("to reduce the query scope thus improve performances"),
				),
			),
			variablegroup.AddVariable("namespace", listVar.List(
				promqlVar.PrometheusPromQL("group by (namespace) (kube_namespace_labels{stack=~\"$stack\",prometheus=~\"$prometheus\",prometheus_namespace=~\"$prometheus_namespace\"})", promqlVar.LabelName("namespace"), promqlVar.Datasource("promDemo")),
				listVar.AllowMultiple(true),
			)),
			variablegroup.AddIgnoredVariable("namespaceLabels", listVar.List(
				labelNamesVar.PrometheusLabelNames(
					labelNamesVar.Matchers("kube_namespace_labels"),
					labelNamesVar.Datasource("promDemo"),
				),
			)),
			variablegroup.AddVariable("pod", listVar.List(
				promqlVar.PrometheusPromQL("group by (pod) (kube_pod_info{stack=~\"$stack\",prometheus=~\"$prometheus\",prometheus_namespace=~\"$prometheus_namespace\",namespace=~\"$namespace\"})", promqlVar.LabelName("pod"), promqlVar.Datasource("promDemo")),
				listVar.AllowMultiple(true),
				listVar.AllowAllValue(true),
			)),
			variablegroup.AddVariable("container", listVar.List(
				promqlVar.PrometheusPromQL("group by (container) (kube_pod_container_info{stack=~\"$stack\",prometheus=~\"$prometheus\",prometheus_namespace=~\"$prometheus_namespace\",namespace=~\"$namespace\",pod=~\"$pod\"})", promqlVar.LabelName("container"), promqlVar.Datasource("promDemo")),
				listVar.AllowMultiple(true),
				listVar.AllowAllValue(true),
				listVar.CustomAllValue(".*"),
			)),
			variablegroup.AddIgnoredVariable("containerLabels", listVar.List(
				listVar.Description("simply the list of labels for the considered metric"),
				listVar.Hidden(true),
				labelNamesVar.PrometheusLabelNames(
					labelNamesVar.Matchers("kube_pod_container_info"),
					labelNamesVar.Datasource("promDemo"),
				),
				listVar.SortingBy("alphabetical-ci-desc"),
			)),
		),

		// PANEL GROUPS
		dashboard.AddPanelGroup("Resource usage",
			panelgroup.PanelsPerLine(3),

			// PANELS
			buildMemoryPanel(""),
			buildCPUPanel(""),
		),
		dashboard.AddPanelGroup("Resource usage bis",
			panelgroup.PanelsPerLine(1),
			panelgroup.PanelHeight(4),

			// PANELS
			buildCPUPanel(grouping),
			buildMemoryPanel(grouping),
		),
		dashboard.AddPanelGroup("Misc",
			panelgroup.PanelsPerLine(1),

			// PANELS
			buildTargetStatusPanel(),
		),

		// DATASOURCES
		dashboard.AddDatasource("myPromDemo",
			datasource.Default(true),
			promDs.Prometheus(
				promDs.DirectURL("http://localhost:9090"),
			),
		),

		// TIME
		dashboard.Duration(3*time.Hour),
		dashboard.RefreshInterval(30*time.Second),
	)

	builderOutput, marshErr := json.Marshal(builder.Dashboard)

	outputJSONFilePath := filepath.Join("..", "..", "internal", "test", "dac", "expected_output.json")
	expectedOutput, readErr := os.ReadFile(outputJSONFilePath)

	t.Run("dashboard with grouped variables", func(t *testing.T) {
		assert.NoError(t, buildErr)
		assert.NoError(t, marshErr)
		assert.NoError(t, readErr)
		require.JSONEq(t, string(expectedOutput), string(builderOutput))
	})
}
