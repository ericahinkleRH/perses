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

import { CardHeader, CardHeaderProps, Stack, Typography } from '@mui/material';
import { combineSx } from '@perses-dev/components';
import { Link, TimeSeriesData } from '@perses-dev/core';
import { QueryData, useReplaceVariablesInString } from '@perses-dev/plugin-system';
import { ReactElement, ReactNode, useMemo } from 'react';
import { HEADER_ACTIONS_CONTAINER_NAME } from '../../constants';
import { PanelActions, PanelActionsProps } from './PanelActions';

type OmittedProps = 'children' | 'action' | 'title' | 'disableTypography';

export interface PanelHeaderProps extends Omit<CardHeaderProps, OmittedProps> {
  id: string;
  title: string;
  description?: string;
  links?: Link[];
  extra?: ReactNode;
  queryResults: QueryData[];
  readHandlers?: PanelActionsProps['readHandlers'];
  editHandlers?: PanelActionsProps['editHandlers'];
  projectName?: string; // Add project name for CSV export
  // Optional prop to explicitly specify the data type if auto-detection isn't sufficient
  dataType?: 'timeseries' | 'table' | 'barchart' | 'undefined';
}

export interface TableData {
  columns: Array<{ name: string; displayName: string }>;
  rows: Array<Record<string, any>>;
}

export interface BarChartData {
  categories: string[];
  series: Array<{
    name: string;
    displayName: string;
    data: any[];
    color?: string;
  }>;
  xAxis?: { title: string };
  yAxis?: { title: string };
  metadata?: any;
}

// Enhanced data detection and extraction
const extractDataForExport = (queryResults: QueryData[]): {
  data: TimeSeriesData | TableData | BarChartData | undefined;
  detectedType: 'timeseries' | 'table' | 'barchart' | 'unknown';
} => {
  for (const query of queryResults) {
    if (!query.data) continue;

    // Check for time series data
    if ('series' in query.data && Array.isArray(query.data.series)) {
      return {
        data: query.data as TimeSeriesData,
        detectedType: 'timeseries'
      };
    }

    // Check for table data
    if ('columns' in query.data && 'rows' in query.data) {
      return {
        data: query.data as TableData,
        detectedType: 'table'
      };
    }

    // Check for bar chart data
    if ('categories' in query.data && 'series' in query.data) {
      const barData = query.data as any;

      if (
        Array.isArray(barData.categories) &&
        Array.isArray(barData.series) &&
        barData.series.every(
          (s: any) =>
            typeof s.name === 'string' &&
            Array.isArray(s.data)
        )
      ) {
        return {
          data: {
            categories: barData.categories,
            series: barData.series,
            xAxis: barData.xAxis,
            yAxis: barData.yAxis,
            metadata: barData.metadata
          } as BarChartData,
          detectedType: 'barchart'
        };
      }
    }

    // Additional heuristics for different data formats
    // Sometimes data might be structured differently depending on the source
    
    // Check if it's a flattened table format
    if (Array.isArray(query.data) && query.data.length > 0) {
      const firstItem = query.data[0];
      if (typeof firstItem === 'object' && firstItem !== null) {
        // Convert array of objects to table format
        const keys = Object.keys(firstItem);
        const tableData: TableData = {
          columns: keys.map(key => ({ name: key, displayName: key })),
          rows: query.data as Array<Record<string, any>>
        };
        return {
          data: tableData,
          detectedType: 'table'
        };
      }
    }

    // Check for chart data with different structure
    if (typeof query.data === 'object') {
      const dataObj = query.data as any;
      
      // Alternative bar chart format
      if (dataObj.labels && dataObj.datasets) {
        const barChartData: BarChartData = {
          categories: dataObj.labels,
          series: dataObj.datasets.map((dataset: any, index: number) => ({
            name: dataset.label || `Dataset ${index + 1}`,
            displayName: dataset.label || `Dataset ${index + 1}`,
            data: dataset.data || [],
            color: dataset.backgroundColor || dataset.borderColor
          })),
          xAxis: dataObj.xAxis || { title: 'Categories' },
          yAxis: dataObj.yAxis || { title: 'Values' }
        };
        return {
          data: barChartData,
          detectedType: 'barchart'
        };
      }

      // Alternative time series format
      if (dataObj.datasets && Array.isArray(dataObj.datasets)) {
        const hasTimeData = dataObj.datasets.some((dataset: any) => 
          dataset.data && Array.isArray(dataset.data) && 
          dataset.data.some((point: any) => 
            (Array.isArray(point) && point.length >= 2) || 
            (typeof point === 'object' && (point.x !== undefined || point.t !== undefined))
          )
        );
        
        if (hasTimeData) {
          // Convert to TimeSeriesData format
          const timeSeriesData: TimeSeriesData = {
            series: dataObj.datasets.map((dataset: any) => ({
              name: dataset.label || 'Series',
              displayName: dataset.label || 'Series',
              values: dataset.data.map((point: any) => {
                if (Array.isArray(point)) return point;
                if (typeof point === 'object') {
                  const time = point.x || point.t || point.timestamp;
                  const value = point.y || point.value;
                  return [time, value];
                }
                return [0, point]; // fallback
              })
            }))
          };
          return {
            data: timeSeriesData,
            detectedType: 'timeseries'
          };
        }
      }
    }
  }

  return {
    data: undefined,
    detectedType: 'unknown'
  };
};

// Enhanced project name extraction with URL fallback
const getProjectNameFromContext = (explicitProjectName?: string): string | undefined => {
  // 1. Use explicit project name first
  if (explicitProjectName && explicitProjectName.trim()) {
    return explicitProjectName.trim();
  }

  // 2. Extract from URL with multiple patterns
  const path = window.location.pathname;
  
  const urlPatterns = [
    /\/projects\/([^\/]+)/,           // /projects/project-name
    /\/project\/([^\/]+)/,            // /project/project-name  
    /\/p\/([^\/]+)/,                  // /p/project-name
    /\/([^\/]+)\/dashboards/,         // /project-name/dashboards
    /\/([^\/]+)\/panels/,             // /project-name/panels
    /\/orgs\/[^\/]+\/projects\/([^\/]+)/, // /orgs/org-name/projects/project-name
  ];

  for (const pattern of urlPatterns) {
    const match = path.match(pattern);
    if (match && match[1] && match[1].trim()) {
      return decodeURIComponent(match[1].trim());
    }
  }

  // 3. Try to extract from query parameters
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const projectFromQuery = urlParams.get('project') || urlParams.get('projectName');
    if (projectFromQuery && projectFromQuery.trim()) {
      return projectFromQuery.trim();
    }
  } catch (error) {
    // Ignore URL parsing errors
  }

  // 4. Default fallback
  return 'Dashboard';
};

export function PanelHeader({
  id,
  title: rawTitle,
  description: rawDescription,
  links,
  queryResults,
  readHandlers,
  editHandlers,
  sx,
  extra,
  dataType,
  projectName: explicitProjectName,
  ...rest
}: PanelHeaderProps): ReactElement {
  const titleElementId = `${id}-title`;
  const descriptionTooltipId = `${id}-description`;

  const title = useReplaceVariablesInString(rawTitle) as string;
  const description = useReplaceVariablesInString(rawDescription);

  // Enhanced data extraction with multiple format support
  const { exportableData, detectedDataType } = useMemo(() => {
    const { data, detectedType } = extractDataForExport(queryResults);
    return {
      exportableData: data,
      detectedDataType: dataType || detectedType
    };
  }, [queryResults, dataType]);

  // Enhanced project name resolution
  const resolvedProjectName = useMemo(() => {
    const projectName = getProjectNameFromContext(explicitProjectName);
    
    // Debug logging in development
    if (process.env.NODE_ENV === 'development') {
      console.log('PanelHeader project name resolution:', {
        explicit: explicitProjectName,
        resolved: projectName,
        url: window.location.pathname,
        hasQueryResults: queryResults.length > 0,
        dataType: detectedDataType
      });
    }
    
    return projectName;
  }, [explicitProjectName, detectedDataType]);

  return (
    <CardHeader
      id={id}
      component="header"
      aria-labelledby={titleElementId}
      aria-describedby={descriptionTooltipId}
      disableTypography
      title={
        <Stack direction="row">
          <Typography
            id={titleElementId}
            variant="subtitle1"
            sx={{
              lineHeight: '24px',
              minHeight: '26px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {title}
          </Typography>
          <PanelActions
            title={title}
            projectName={resolvedProjectName}
            description={description}
            descriptionTooltipId={descriptionTooltipId}
            links={links}
            queryResults={exportableData}
            dataType={detectedDataType === 'unknown' ? undefined : (detectedDataType as 'timeseries' | 'table' | 'barchart')}
            readHandlers={readHandlers}
            editHandlers={editHandlers}
            extra={extra}
          />
        </Stack>
      }
      sx={combineSx(
        (theme) => ({
          containerType: 'inline-size',
          containerName: HEADER_ACTIONS_CONTAINER_NAME,
          padding: theme.spacing(1),
          borderBottom: `solid 1px ${theme.palette.divider}`,
          '.MuiCardHeader-content': {
            overflow: 'hidden',
          },
        }),
        sx
      )}
      {...rest}
    />
  );
}