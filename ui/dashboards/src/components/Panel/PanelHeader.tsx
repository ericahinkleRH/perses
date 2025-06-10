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
import { Link } from '@perses-dev/core';
import { QueryData, useReplaceVariablesInString } from '@perses-dev/plugin-system';
import { ReactElement, ReactNode } from 'react';
import { HEADER_ACTIONS_CONTAINER_NAME } from '../../constants';
import { PanelActions, PanelActionsProps } from './PanelActions';

// Import the data type interfaces from PanelActions or define them here
interface BarChartData {
  categories?: string[];
  series?: Array<{
    name: string;
    data: number[];
  }>;
  data?: Array<{
    category: string;
    value: number;
    series?: string;
  }>;
}

interface TableData {
  columns: string[];
  rows: any[][];
}

interface TraceData {
  traceID?: string;
  spans: Array<{
    spanID: string;
    operationName: string;
    startTimeUnixNano: string;
    durationNano: string;
    parentSpanID?: string;
    tags?: Array<{ key: string; value: string }>;
    logs?: Array<{ timestamp: string; fields: Array<{ key: string; value: string }> }>;
    references?: Array<{ refType: string; traceID: string; spanID: string }>;
  }>;
  warnings?: string[];
  processes?: Record<string, { serviceName: string; tags: Array<{ key: string; value: string }> }>;
}

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
  panelType?: 'timeseries' | 'bar' | 'table' | 'other';
}

// Type guard functions (same as in PanelActions)
const isTimeSeriesData = (data: any): data is TimeSeriesData => {
  return data && typeof data === 'object' && 'series' in data && Array.isArray(data.series);
};

const isBarChartData = (data: any): data is BarChartData => {
  return data && typeof data === 'object' && 
    (('categories' in data && 'series' in data) || 
     ('data' in data && Array.isArray(data.data)));
};

const isTableData = (data: any): data is TableData => {
  return data && typeof data === 'object' && 'columns' in data && 'rows' in data;
};

const isTraceData = (data: any): data is TraceData => {
  return data && typeof data === 'object' && 'spans' in data && Array.isArray(data.spans);
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
  panelType = 'timeseries', //default to timeseries
  ...rest
}: PanelHeaderProps): ReactElement {
  const titleElementId = `${id}-title`;
  const descriptionTooltipId = `${id}-description`;

  const title = useReplaceVariablesInString(rawTitle) as string;
  const description = useReplaceVariablesInString(rawDescription);

<<<<<<< Updated upstream
=======
// Enhanced data extraction to support different panel types
  const dataForExport = useMemo(() => {
    if (!queryResults || queryResults.length === 0) {
      return undefined;
    }

    // Try to find the appropriate data based on panel type
    for (const query of queryResults) {
      if (query.data) {
        // Check if the data matches the expected panel type
        switch (panelType) {
          case 'timeseries':
            if (isTimeSeriesData(query.data)) {
              return query.data as TimeSeriesData;
            }
            break;
          case 'bar':
            if (isBarChartData(query.data)) {
              return query.data as BarChartData;
            }
            break;
          case 'table':
            if (isTableData(query.data)) {
              return query.data as TableData;
            }
            break;
          case 'other':
            // For 'other' type, check for trace data first
            if (isTraceData(query.data)) {
              return query.data as TraceData;
            }
            // Then return the first available data
            return query.data;
        }
      }
    }

    // For other panel types, return the first available data
    for (const query of queryResults) {
      if (query.data) {
        return query.data;
      }
    }

    // If no structured data found, return the raw query results
    return queryResults.length === 1 ? queryResults[0] : queryResults;
  }, [queryResults, panelType]);

  // Determine if CSV export should be available based on panel type
  const csvExportAvailable = panelType === 'timeseries' || panelType === 'bar' || panelType === 'table';


>>>>>>> Stashed changes
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
              // `minHeight` guarantees that the header has the correct height
              // when there is no title (i.e. in the preview)
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
            description={description}
            descriptionTooltipId={descriptionTooltipId}
            links={links}
<<<<<<< Updated upstream
            queryResults={queryResults}
=======
            queryResults={dataForExport}
            panelType={panelType} //passes the panel type to panel actions
>>>>>>> Stashed changes
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
