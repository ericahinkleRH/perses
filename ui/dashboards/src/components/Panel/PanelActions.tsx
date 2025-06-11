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

import { Stack, Box, Popover, CircularProgress, styled, PopoverPosition } from '@mui/material';
import { isValidElement, PropsWithChildren, ReactNode, useMemo, useState } from 'react';
import { InfoTooltip } from '@perses-dev/components';
import ArrowCollapseIcon from 'mdi-material-ui/ArrowCollapse';
import ArrowExpandIcon from 'mdi-material-ui/ArrowExpand';
import PencilIcon from 'mdi-material-ui/PencilOutline';
import DeleteIcon from 'mdi-material-ui/DeleteOutline';
import DragIcon from 'mdi-material-ui/DragVertical';
import ContentCopyIcon from 'mdi-material-ui/ContentCopy';
import MenuIcon from 'mdi-material-ui/Menu';
import { QueryData } from '@perses-dev/plugin-system';
import AlertIcon from 'mdi-material-ui/Alert';
import InformationOutlineIcon from 'mdi-material-ui/InformationOutline';
import DownloadIcon from 'mdi-material-ui/Download'; 
import { Link, TimeSeriesData } from '@perses-dev/core';
import {
  ARIA_LABEL_TEXT,
  HEADER_ACTIONS_CONTAINER_NAME,
  HEADER_MEDIUM_WIDTH,
  HEADER_SMALL_WIDTH,
  TOOLTIP_TEXT,
} from '../../constants';
import { HeaderIconButton } from './HeaderIconButton';
import { PanelLinks } from './PanelLinks';

// Enhanced data types for different chart types
export interface TableData {
  columns: Array<{
    name: string;
    displayName?: string;
    type?: string;
  }>;
  rows: Array<Record<string, any>>;
  metadata?: {
    title?: string;
    description?: string;
  };
}

export interface BarChartData {
  categories: string[];
  series: Array<{
    name: string;
    displayName?: string;
    data: number[];
    color?: string;
  }>;
  xAxis?: {
    title?: string;
    categories?: string[];
  };
  yAxis?: {
    title?: string;
    min?: number;
    max?: number;
  };
  metadata?: {
    title?: string;
    description?: string;
  };
}

export interface PanelActionsProps {
  title: string;
  description?: string;
  descriptionTooltipId: string;
  links?: Link[];
  extra?: React.ReactNode;
  editHandlers?: {
    onEditPanelClick: () => void;
    onDuplicatePanelClick: () => void;
    onDeletePanelClick: () => void;
  };
  readHandlers?: {
    isPanelViewed?: boolean;
    onViewPanelClick: () => void;
  };
  queryResults: TimeSeriesData | TableData | BarChartData | undefined;
  dataType?: 'timeseries' | 'table' | 'barchart';
}

const ConditionalBox = styled(Box)({
  display: 'none',
  alignItems: 'center',
  flexGrow: 1,
  justifyContent: 'flex-end',
});

// Enhanced data type detection
const detectDataType = (data: any): 'timeseries' | 'table' | 'barchart' | 'unknown' => {
  if (!data) return 'unknown';
  
  // Check for time series data
  if (data.series && Array.isArray(data.series) && data.series.length > 0) {
    const firstSeries = data.series[0];
    if (firstSeries.values && Array.isArray(firstSeries.values)) {
      return 'timeseries';
    }
  }
  
  // Check for table data
  if (data.columns && Array.isArray(data.columns) && data.rows && Array.isArray(data.rows)) {
    return 'table';
  }
  
  // Check for bar chart data
  if (data.categories && Array.isArray(data.categories) && data.series && Array.isArray(data.series)) {
    const firstSeries = data.series[0];
    if (firstSeries && firstSeries.data && Array.isArray(firstSeries.data)) {
      return 'barchart';
    }
  }
  
  return 'unknown';
};

// Function to check if we have exportable data
const hasExportableData = (data: any): boolean => {
  const dataType = detectDataType(data);
  return dataType !== 'unknown';
};

// Function to get the actual legend display name from the series
const getSeriesLegendName = (series: any, seriesIndex: number) => {
  const legendName = series.formattedName || 
                    series.legendName || 
                    series.displayName || 
                    series.legend || 
                    series.name || 
                    `Series ${seriesIndex + 1}`;
    
  return {
    legendName: legendName,
    columnName: `Series_${seriesIndex + 1}`
  };
};

// Enhanced CSV export handler for multiple data types
const createCsvExportHandler = (
  title: string, 
  queryResults: TimeSeriesData | TableData | BarChartData | undefined,
  dataType?: 'timeseries' | 'table' | 'barchart'
) => {
  return () => {
    if (!queryResults) {
      console.warn('No data available to export to CSV');
      return;
    }

    const detectedType = dataType || detectDataType(queryResults);
    let csvString = '';

    // Common header information
    csvString += `# Chart: ${title}\n`;
    csvString += `# Data Type: ${detectedType}\n`;
    csvString += `# Exported: ${new Date().toISOString()}\n`;

    switch (detectedType) {
      case 'timeseries':
        csvString += exportTimeSeriesData(queryResults as TimeSeriesData, title);
        break;
      case 'table':
        csvString += exportTableData(queryResults as TableData, title);
        break;
      case 'barchart':
        csvString += exportBarChartData(queryResults as BarChartData, title);
        break;
      default:
        console.warn('Unknown data type for export');
        return;
    }

    // Create and download the file
    const blobCsvData = new Blob([csvString], { type: 'text/csv' });
    const csvURL = URL.createObjectURL(blobCsvData);
    const link = document.createElement('a');
    link.href = csvURL;
    link.download = `${title}_${detectedType}_data.csv`;
    link.click();
    URL.revokeObjectURL(csvURL);
  };
};

// Time series data export
const exportTimeSeriesData = (data: TimeSeriesData, title: string): string => {
  let csvString = '';
  const result: Record<string, Record<string, any>> = {};
  const seriesInfo: Array<{legendName: string, columnName: string}> = [];

  if (!data.series || !Array.isArray(data.series) || data.series.length === 0) {
    console.warn('No time series data available');
    return '';
  }

  // Process each series
  for (let i = 0; i < data.series.length; i++) {
    const series = data.series[i];
    if (!series || !Array.isArray(series.values)) continue;

    const seriesMetadata = getSeriesLegendName(series, i);
    seriesInfo.push(seriesMetadata);

    for (const entry of series.values) {
      if (!Array.isArray(entry) || entry.length < 2) continue;

      const timestamp = entry[0];
      const value = entry[1];
      
      let dateTime: string;
      if (typeof timestamp === 'number') {
        const timestampMs = timestamp > 1e10 ? timestamp : timestamp * 1000;
        dateTime = new Date(timestampMs).toISOString();
      } else if (typeof timestamp === 'string') {
        dateTime = new Date(timestamp).toISOString();
      } else {
        continue;
      }

      if (!result[dateTime]) {
        result[dateTime] = {};
      }
      
      result[dateTime]![seriesMetadata.columnName] = value;
    }
  }

  // Add legend information
  csvString += `# Legend Information:\n`;
  for (const info of seriesInfo) {
    csvString += `# ${info.columnName}: ${info.legendName}\n`;
  }
  csvString += `#\n`;

  // Add headers and data
  const columnNames = seriesInfo.map(info => info.columnName);
  csvString += `DateTime,${columnNames.join(',')}\n`;

  const sortedDateTimes = Object.keys(result).sort();
  for (const dateTime of sortedDateTimes) {
    const rowData = result[dateTime];
    const temp: any[] = [];
    
    for (const columnName of columnNames) {
      temp.push(rowData?.[columnName] ?? '');
    }
    
    csvString += `${dateTime},${temp.join(',')}\n`;
  }

  return csvString;
};

// Table data export
const exportTableData = (data: TableData, title: string): string => {
  let csvString = '';

  if (!data.columns || !data.rows) {
    console.warn('Invalid table data structure');
    return '';
  }

  // Add column information
  csvString += `# Column Information:\n`;
  for (const column of data.columns) {
    const displayName = column.displayName || column.name;
    const type = column.type ? ` (${column.type})` : '';
    csvString += `# ${column.name}: ${displayName}${type}\n`;
  }
  csvString += `#\n`;

  // Add headers
  const headers = data.columns.map(col => col.displayName || col.name);
  csvString += `${headers.join(',')}\n`;

  // Add data rows
  for (const row of data.rows) {
    const values = data.columns.map(col => {
      const value = row[col.name];
      // Handle different data types appropriately
      if (value === null || value === undefined) return '';
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return String(value);
    });
    csvString += `${values.join(',')}\n`;
  }

  return csvString;
};

// Bar chart data export
const exportBarChartData = (data: BarChartData, title: string): string => {
  let csvString = '';

  if (!data.categories || !data.series) {
    console.warn('Invalid bar chart data structure');
    return '';
  }

  // Add axis information
  csvString += `# Axis Information:\n`;
  if (data.xAxis?.title) {
    csvString += `# X-Axis: ${data.xAxis.title}\n`;
  }
  if (data.yAxis?.title) {
    csvString += `# Y-Axis: ${data.yAxis.title}\n`;
  }

  // Add series information
  csvString += `# Series Information:\n`;
  for (let i = 0; i < data.series.length; i++) {
    const series = data.series[i];
    if (!series) continue;
    const displayName = series.displayName || series.name;
    csvString += `# Series_${i + 1}: ${displayName}\n`;
  }
  csvString += `#\n`;

  // Add headers
  const seriesHeaders = data.series.map((_, index) => `Series_${index + 1}`);
  csvString += `Category,${seriesHeaders.join(',')}\n`;

  // Add data rows
  for (let i = 0; i < data.categories.length; i++) {
    const category = data.categories[i];
    const values = data.series.map(series => {
      const value = series.data[i];
      return value !== undefined ? String(value) : '';
    });
    csvString += `${category},${values.join(',')}\n`;
  }

  return csvString;
};

export const PanelActions: React.FC<PanelActionsProps> = ({
  editHandlers,
  readHandlers,
  extra,
  title,
  description,
  descriptionTooltipId,
  links,
  queryResults,
  dataType,
}) => {
  // Check if current data is exportable
  const hasExportableDataCheck = useMemo(() => hasExportableData(queryResults), [queryResults]);
  const csvExportHandler = useMemo(() => 
    createCsvExportHandler(title, queryResults, dataType), 
    [title, queryResults, dataType]
  );

  const csvExportButton = useMemo(() => {
    if (!hasExportableDataCheck) {
      return null;
    }

    const detectedType = dataType || detectDataType(queryResults);
    const tooltipText = `Export ${detectedType} data as CSV`;

    return (
      <InfoTooltip description={tooltipText}>
        <HeaderIconButton
          aria-label={`CSV Export ${detectedType} data`}
          size="small"
          onClick={csvExportHandler}
        >
          <DownloadIcon fontSize="inherit" />
        </HeaderIconButton>
      </InfoTooltip>
    );
  }, [hasExportableDataCheck, csvExportHandler, dataType, queryResults]);

  const descriptionAction = useMemo(() => {
    if (description && description.trim().length > 0) {
      return (
        <InfoTooltip id={descriptionTooltipId} description={description} enterDelay={100}>
          <HeaderIconButton aria-label="panel description" size="small">
            <InformationOutlineIcon
              aria-describedby="info-tooltip"
              aria-hidden={false}
              fontSize="inherit"
              sx={{ color: (theme) => theme.palette.text.secondary }}
            />
          </HeaderIconButton>
        </InfoTooltip>
      );
    }
    return undefined;
  }, [descriptionTooltipId, description]);

  const linksAction = links && links.length > 0 && <PanelLinks links={links} />;
  const extraActions = editHandlers === undefined && extra;

  const queryStateIndicator = useMemo(() => {
    const hasData = queryResults && (
      (queryResults as any).series?.length > 0 || 
      (queryResults as any).rows?.length > 0 ||
      (queryResults as any).categories?.length > 0
    );
    const isFetching = false;
    const queryErrors: any[] = [];
    
    if (isFetching && hasData) {
      return <CircularProgress aria-label="loading" size="1.125rem" />;
    } else if (queryErrors.length > 0) {
      const errorTexts = queryErrors
        .map((q) => q.error)
        .map((e: any) => e?.message ?? e?.toString() ?? 'Unknown error')
        .join('\n');

      return (
        <InfoTooltip description={errorTexts}>
          <HeaderIconButton aria-label="panel errors" size="small">
            <AlertIcon fontSize="inherit" />
          </HeaderIconButton>
        </InfoTooltip>
      );
    }
  }, [queryResults]);

  const readActions = useMemo(() => {
    if (readHandlers !== undefined) {
      return (
        <InfoTooltip description={TOOLTIP_TEXT.viewPanel}>
          <HeaderIconButton
            aria-label={ARIA_LABEL_TEXT.viewPanel(title)}
            size="small"
            onClick={readHandlers.onViewPanelClick}
          >
            {readHandlers.isPanelViewed ? (
              <ArrowCollapseIcon fontSize="inherit" />
            ) : (
              <ArrowExpandIcon fontSize="inherit" />
            )}
          </HeaderIconButton>
        </InfoTooltip>
      );
    }
    return undefined;
  }, [readHandlers, title]);

  const editActions = useMemo(() => {
    if (editHandlers !== undefined) {
      return (
        <>
          <InfoTooltip description={TOOLTIP_TEXT.editPanel}>
            <HeaderIconButton
              aria-label={ARIA_LABEL_TEXT.editPanel(title)}
              size="small"
              onClick={editHandlers.onEditPanelClick}
            >
              <PencilIcon fontSize="inherit" />
            </HeaderIconButton>
          </InfoTooltip>
          <InfoTooltip description={TOOLTIP_TEXT.duplicatePanel}>
            <HeaderIconButton
              aria-label={ARIA_LABEL_TEXT.duplicatePanel(title)}
              size="small"
              onClick={editHandlers.onDuplicatePanelClick}
            >
              <ContentCopyIcon
                fontSize="inherit"
                sx={{
                  transform: 'scale(0.925)',
                }}
              />
            </HeaderIconButton>
          </InfoTooltip>
          <InfoTooltip description={TOOLTIP_TEXT.deletePanel}>
            <HeaderIconButton
              aria-label={ARIA_LABEL_TEXT.deletePanel(title)}
              size="small"
              onClick={editHandlers.onDeletePanelClick}
            >
              <DeleteIcon fontSize="inherit" />
            </HeaderIconButton>
          </InfoTooltip>
        </>
      );
    }
    return undefined;
  }, [editHandlers, title]);

  const moveAction = useMemo(() => {
    if (editActions && !readHandlers?.isPanelViewed) {
      return (
        <InfoTooltip description={TOOLTIP_TEXT.movePanel}>
          <HeaderIconButton aria-label={ARIA_LABEL_TEXT.movePanel(title)} size="small">
            <DragIcon className="drag-handle" sx={{ cursor: 'grab' }} fontSize="inherit" />
          </HeaderIconButton>
        </InfoTooltip>
      );
    }
    return undefined;
  }, [editActions, readHandlers, title]);

  const divider = <Box sx={{ flexGrow: 1 }}></Box>;

  const OnHover = ({ children }: PropsWithChildren): ReactNode =>
    editHandlers === undefined && !readHandlers?.isPanelViewed ? (
      <Box sx={{ display: 'var(--panel-hover, none)' }}>{children}</Box>
    ) : (
      <>{children}</>
    );

  return (
    <>
      {/* small panel width: move all icons except move/grab to overflow menu */}
      <ConditionalBox
        sx={(theme) => ({
          [theme.containerQueries(HEADER_ACTIONS_CONTAINER_NAME).between(0, HEADER_SMALL_WIDTH)]: { display: 'flex' },
        })}
      >
        {divider}
        <OnHover>
          <OverflowMenu title={title}>
            {descriptionAction} {linksAction} {queryStateIndicator} {extraActions} {readActions} {editActions}
            {csvExportButton}
          </OverflowMenu>
          {moveAction}
        </OnHover>
      </ConditionalBox>

      {/* medium panel width: move edit icons to overflow menu */}
      <ConditionalBox
        sx={(theme) => ({
          [theme.containerQueries(HEADER_ACTIONS_CONTAINER_NAME).between(HEADER_SMALL_WIDTH, HEADER_MEDIUM_WIDTH)]: {
            display: 'flex',
          },
        })}
      >
        <OnHover>
          {descriptionAction} {linksAction}
        </OnHover>
        {divider} {queryStateIndicator}
        <OnHover>
          {extraActions} {readActions}
          <OverflowMenu title={title}>
            {editActions}
            {csvExportButton} 
          </OverflowMenu>
          {moveAction}
        </OnHover>
      </ConditionalBox>

      {/* large panel width: show all icons in panel header */}
      <ConditionalBox
        sx={(theme) => ({
          display: 'flex',
          [theme.containerQueries(HEADER_ACTIONS_CONTAINER_NAME).down(HEADER_MEDIUM_WIDTH)]: { display: 'none' },
        })}
      >
        <OnHover>
          {descriptionAction} {linksAction}
        </OnHover>
        {divider} {queryStateIndicator}
        <OnHover>
          {extraActions} {readActions} {editActions} {moveAction}
          <OverflowMenu title={title}>
            {csvExportButton}
          </OverflowMenu>
        </OnHover>
      </ConditionalBox>
    </>
  );
};

const OverflowMenu: React.FC<PropsWithChildren<{ title: string }>> = ({ children, title }) => {
  const [anchorPosition, setAnchorPosition] = useState<PopoverPosition>();

  const hasContent = isValidElement(children) || (Array.isArray(children) && children.some(isValidElement));
  if (!hasContent) {
    return undefined;
  }

  const handleClick = (event: React.MouseEvent<HTMLElement>): undefined => {
    setAnchorPosition(event.currentTarget.getBoundingClientRect());
  };

  const handleClose = (): undefined => {
    setAnchorPosition(undefined);
  };

  const open = Boolean(anchorPosition);
  const id = open ? 'actions-menu' : undefined;

  return (
    <>
      <HeaderIconButton
        className="show-actions"
        aria-describedby={id}
        onClick={handleClick}
        aria-label={ARIA_LABEL_TEXT.showPanelActions(title)}
        size="small"
      >
        <MenuIcon fontSize="inherit" />
      </HeaderIconButton>
      <Popover
        id={id}
        open={open}
        anchorReference="anchorPosition"
        anchorPosition={anchorPosition}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
      >
        <Stack direction="row" alignItems="center" sx={{ padding: 1 }} onClick={handleClose}>
          {children}
        </Stack>
      </Popover>
    </>
  );
};