// Copyright 2023 The Perses Authors
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

import { Card, CardContent, CardProps } from '@mui/material';
import { ErrorAlert, ErrorBoundary, combineSx, useChartsTheme, useId } from '@perses-dev/components';
import { PanelDefinition } from '@perses-dev/core';
import { useDataQueriesContext } from '@perses-dev/plugin-system';
import { ReactNode, memo, useMemo, useState } from 'react';
import useResizeObserver from 'use-resize-observer';
import { PanelGroupItemId } from '../../context';
import { PanelContent } from './PanelContent';
import { PanelHeader, PanelHeaderProps } from './PanelHeader';

export interface PanelProps extends CardProps<'section'> {
  definition: PanelDefinition;
  readHandlers?: PanelHeaderProps['readHandlers'];
  editHandlers?: PanelHeaderProps['editHandlers'];
  panelOptions?: PanelOptions;
  panelGroupItemId?: PanelGroupItemId;
  // Add project name prop
  projectName?: string;
}

export type PanelOptions = {
  /**
   * Allow you to hide the panel header if desired.
   * This can be useful in embedded mode for example.
   */
  hideHeader?: boolean;
  /**
   * Content to render in right of the panel header. (top right of the panel)
   * It will only be rendered when the panel is in edit mode.
   */
  extra?: (props: PanelExtraProps) => ReactNode;
};

export type PanelExtraProps = {
  /**
   * The PanelDefinition for the panel.
   */
  panelDefinition?: PanelDefinition;
  /**
   * The PanelGroupItemId for the panel.
   */
  panelGroupItemId?: PanelGroupItemId;
};

// Enhanced helper function to extract project name from various sources
const getProjectName = (
  explicitProjectName?: string,
  definition?: PanelDefinition
): string | undefined => {
  // 1. Use explicitly passed project name first
  if (explicitProjectName) {
    return explicitProjectName;
  }

  // 2. Try to extract from panel definition using safe property access
  if (definition) {
    // Try different possible paths where project name might be stored
    const def = definition as any; // Use any to safely access potentially undefined properties
    
    // Check common metadata paths
    const metadataPaths = [
      def.metadata?.project,
      def.metadata?.labels?.project,
      def.metadata?.annotations?.project,
      def.metadata?.annotations?.['project.name'],
      def.metadata?.annotations?.['perses.dev/project'],
      def.spec?.metadata?.project,
      def.spec?.project,
      def.project,
      def.projectName
    ];

    for (const path of metadataPaths) {
      if (typeof path === 'string' && path.trim()) {
        return path.trim();
      }
    }

    // Check if the definition has a name that includes project info
    if (def.metadata?.name && typeof def.metadata.name === 'string') {
      // Look for patterns like "project-name-panel-name" or "project.panel"
      const nameParts = def.metadata.name.split(/[-._]/);
      if (nameParts.length > 1) {
        // Return the first part as potential project name
        return nameParts[0];
      }
    }
  }

  // 3. Extract from URL - multiple possible patterns
  const path = window.location.pathname;
  
  // Common Perses URL patterns
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
    if (match && match[1]) {
      return decodeURIComponent(match[1]);
    }
  }

  // 4. Try to extract from query parameters
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const projectFromQuery = urlParams.get('project') || urlParams.get('projectName');
    if (projectFromQuery) {
      return projectFromQuery;
    }
  } catch (error) {
    // Ignore URL parsing errors
  }

  // 5. Try to extract from hash
  try {
    const hash = window.location.hash;
    const hashMatch = hash.match(/project[=/]([^&/#]+)/i);
    if (hashMatch && hashMatch[1]) {
      return decodeURIComponent(hashMatch[1]);
    }
  } catch (error) {
    // Ignore hash parsing errors
  }

  return undefined;
};

/**
 * Renders a PanelDefinition's content inside of a Card.
 *
 * Internal structure:
 * <Panel>                  // renders an entire panel, incl. header and action buttons
 *   <PanelContent>         // renders loading, error or panel based on the queries' status
 *     <PanelPluginLoader>  // loads a panel plugin from the plugin registry and renders the PanelComponent with data from props.queryResults
 */
export const Panel = memo(function Panel(props: PanelProps) {
  const {
    definition,
    readHandlers,
    editHandlers,
    onMouseEnter,
    onMouseLeave,
    sx,
    panelOptions,
    panelGroupItemId,
    projectName: explicitProjectName, // Extract the new prop
    ...others
  } = props;

  // Make sure we have an ID we can use for aria attributes
  const generatedPanelId = useId('Panel');
  const headerId = `${generatedPanelId}-header`;

  const [contentElement, setContentElement] = useState<HTMLElement | null>(null);

  const { width, height } = useResizeObserver({ ref: contentElement });

  const contentDimensions = useMemo(() => {
    if (width === undefined || height === undefined) return undefined;
    return { width, height };
  }, [width, height]);

  const chartsTheme = useChartsTheme();

  const { queryResults } = useDataQueriesContext();

  // Get the project name from various sources with enhanced fallback logic
  const projectName = useMemo(() => {
    const extractedName = getProjectName(explicitProjectName, definition);
    
    // Log for debugging purposes (remove in production)
    if (process.env.NODE_ENV === 'development') {
      console.log('Project name extraction:', {
        explicit: explicitProjectName,
        extracted: extractedName,
        url: window.location.pathname,
        definition: definition
      });
    }
    
    return extractedName;
  }, [explicitProjectName, definition]);

  const handleMouseEnter: CardProps['onMouseEnter'] = (e) => {
    onMouseEnter?.(e);
  };

  const handleMouseLeave: CardProps['onMouseLeave'] = (e) => {
    onMouseLeave?.(e);
  };

  return (
    <Card
      component="section"
      sx={combineSx(
        {
          width: '100%',
          height: '100%',
          display: 'flex',
          flexFlow: 'column nowrap',
          ':hover': { '--panel-hover': 'block' },
        },
        sx
      )}
      variant="outlined"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      aria-labelledby={headerId}
      aria-describedby={headerId}
      data-testid="panel"
      {...others}
    >
      {!panelOptions?.hideHeader && (
        <PanelHeader
          extra={panelOptions?.extra?.({ panelDefinition: definition, panelGroupItemId })}
          id={headerId}
          title={definition.spec.display.name}
          description={definition.spec.display.description}
          queryResults={queryResults}
          readHandlers={readHandlers}
          editHandlers={editHandlers}
          links={definition.spec.links}
          projectName={projectName} // Pass the project name to PanelHeader
          sx={{ paddingX: `${chartsTheme.container.padding.default}px` }}
        />
      )}
      <CardContent
        component="figure"
        sx={{
          position: 'relative',
          overflow: 'hidden',
          flexGrow: 1,
          margin: 0,
          padding: 0,
          // Override MUI default style for last-child
          ':last-child': {
            padding: 0,
          },
        }}
        ref={setContentElement}
      >
        <ErrorBoundary FallbackComponent={ErrorAlert} resetKeys={[definition.spec]}>
          <PanelContent
            definition={definition}
            panelPluginKind={definition.spec.plugin.kind}
            spec={definition.spec.plugin.spec}
            contentDimensions={contentDimensions}
            queryResults={queryResults}
          />
        </ErrorBoundary>
      </CardContent>
    </Card>
  );
});