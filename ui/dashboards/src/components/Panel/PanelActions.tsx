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
import { Link } from '@perses-dev/core';
import {
  ARIA_LABEL_TEXT,
  HEADER_ACTIONS_CONTAINER_NAME,
  HEADER_MEDIUM_WIDTH,
  HEADER_SMALL_WIDTH,
  TOOLTIP_TEXT,
} from '../../constants';
import { HeaderIconButton } from './HeaderIconButton';
import { PanelLinks } from './PanelLinks';

//ADDED THIS INTERFACE
// Interface definitions for different data types
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
<<<<<<< Updated upstream
  queryResults: QueryData[];
=======
  queryResults?: TimeSeriesData | BarChartData | TableData | TraceData | QueryData | QueryData[] | any | undefined;
  panelType?: 'timeseries' | 'bar' | 'table' | 'other';
>>>>>>> Stashed changes
}

// Type guard functions
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

//END MY CODE

const ConditionalBox = styled(Box)({
  display: 'none',
  alignItems: 'center',
  flexGrow: 1,
  justifyContent: 'flex-end',
});

export const PanelActions: React.FC<PanelActionsProps> = ({
  editHandlers,
  readHandlers,
  extra,
  title,
  description,
  descriptionTooltipId,
  links,
  queryResults,
  panelType = 'timeseries', //make this default type
}) => {
<<<<<<< Updated upstream
=======
  const formatSeriesTitle = (seriesName: string, seriesIndex: number) => {
    return seriesName;
  };

  //MY CODE updated exporter to do multiple data types
  // Enhanced function to determine if CSV export should be available
  const shouldShowCsvExport = useMemo(() => {
    if (!queryResults) {
      return false;
    }

    // Check based on panel type first
    if (panelType === 'timeseries' || panelType === 'bar' || panelType === 'table') {
      return true;
    }

    // If panel type is 'other' or undefined, check the actual data
    if (isTimeSeriesData(queryResults) || isBarChartData(queryResults) || isTableData(queryResults)) {
      return true;
    }

    // Handle QueryData array
    if (Array.isArray(queryResults)) {
      return queryResults.some(query => 
        query.data && (
          isTimeSeriesData(query.data) || 
          isBarChartData(query.data) || 
          isTableData(query.data)
        )
      );
    }

    // Handle single QueryData object
    if (queryResults && typeof queryResults === 'object' && 'data' in queryResults) {
      const data = (queryResults as QueryData).data;
      return isTimeSeriesData(data) || isBarChartData(data) || isTableData(data);
    }

    return false;
  }, [queryResults, panelType]);


  const exportTimeSeriesData = (data: TimeSeriesData): string => {
    if (!data || !data.series || !Array.isArray(data.series) || data.series.length === 0) {
      console.warn('No TimeSeriesData available for export.');
      return '';
    }

    let csvString = '';
    const result: Record<string, Record<string, any>> = {};
    const seriesNames: string[] = [];

    for (let i = 0; i < data.series.length; i++) {
      const series = data.series[i];

      if (!series?.name || !Array.isArray(series.values)) {
        continue;
      }

      const name = formatSeriesTitle(series.name, i);
      seriesNames.push(name);
      if (!name) {
        continue;
      }

      for (const entry of series.values) {
        const dateTime = new Date(entry[0]).toISOString();
        const value = entry[1];

        if (!result[dateTime]) {
          result[dateTime] = {};
        }
        result[dateTime]![name] = value;
      }
    }

    const uniqueSeriesNames = new Set(seriesNames);
    const uniqueSeriesArray = Array.from(uniqueSeriesNames);

    csvString = `DateTime,${uniqueSeriesArray.join(',')}\n`;

    const sortedDateTimes = Object.keys(result).sort();

    for (const dateTime of sortedDateTimes) {
      const temp: any[] = [];
      const rowData = result[dateTime];
      if (rowData) {
        for (const name of uniqueSeriesArray) {
          temp.push(rowData[name] ?? '');
        }
      }
      csvString += `${dateTime},${temp.join(',')}\n`;
    }
    return csvString;
  };

  const exportBarChartData = (data: BarChartData): string => {
    let csvString = '';

    if (data.categories && data.series) {
      const seriesNames = data.series.map(s => s.name);
      csvString = `Category,${seriesNames.join(',')}\n`;

      for (let i = 0; i < data.categories.length; i++) {
        const category = data.categories[i];
        const values = data.series.map(s => s.data[i] ?? '');
        csvString += `${category},${values.join(',')}\n`;
      }
    } else if (data.data && Array.isArray(data.data)) {
      const seriesNames = [...new Set(data.data.map(d => d.series || 'Value'))];
      const categories = [...new Set(data.data.map(d => d.category))];

      csvString = `Category,${seriesNames.join(',')}\n`;

      for (const category of categories) {
        const values = seriesNames.map(seriesName => {
          const item = data.data?.find(d => d.category === category && (d.series || 'Value') === seriesName);
          return item?.value ?? '';
        });
        csvString += `${category},${values.join(',')}\n`;
      }
    } else if (data.series && !data.categories) {
      const seriesNames = data.series.map(s => s.name);
      csvString = `Index,${seriesNames.join(',')}\n`;

      const maxLength = Math.max(...data.series.map(s => s.data.length));
      for (let i = 0; i < maxLength; i++) {
        const values = data.series.map(s => s.data[i] ?? '');
        csvString += `${i},${values.join(',')}\n`;
      }
    }

    return csvString;
  };

  const exportTableData = (data: TableData): string => {
    if (!data.columns || !data.rows) {
      return '';
    }

    let csvString = `${data.columns.join(',')}\n`;
    
    for (const row of data.rows) {
      const escapedRow = row.map(cell => {
        const cellStr = String(cell ?? '');
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      });
      csvString += `${escapedRow.join(',')}\n`;
    }

    return csvString;
  };

  const exportGenericData = (data: any): string => {
    if (Array.isArray(data)) {
      if (data.length > 0 && typeof data[0] === 'object') {
        const keys = Object.keys(data[0]);
        let csvString = `${keys.join(',')}\n`;
        
        for (const item of data) {
          const values = keys.map(key => {
            const value = item[key];
            if (value === null || value === undefined) return '';
            const valueStr = String(value);
            if (valueStr.includes(',') || valueStr.includes('"') || valueStr.includes('\n')) {
              return `"${valueStr.replace(/"/g, '""')}"`;
            }
            return valueStr;
          });
          csvString += `${values.join(',')}\n`;
        }
        return csvString;
      }
    } else if (typeof data === 'object' && data !== null) {
      for (const [key, value] of Object.entries(data)) {
        if (Array.isArray(value) && value.length > 0) {
          return exportGenericData(value);
        }
      }
      
      let csvString = 'Property,Value\n';
      for (const [key, value] of Object.entries(data)) {
        const valueStr = String(value ?? '');
        const escapedValue = valueStr.includes(',') || valueStr.includes('"') || valueStr.includes('\n')
          ? `"${valueStr.replace(/"/g, '""')}"`
          : valueStr;
        csvString += `${key},${escapedValue}\n`;
      }
      return csvString;
    }

    return '';
  };

  // Main CSV export handler
  const csvExportHandler = () => {
    if (!queryResults) {
      console.warn('No data available to export to CSV. queryResults:', queryResults);
      return;
    }

    let csvString = '';

    let dataToExport = queryResults;

    try {
      // Handle QueryData array - find the first exportable data
      if (Array.isArray(queryResults)) {
        for (const query of queryResults) {
          if (query.data && (isTimeSeriesData(query.data) || isBarChartData(query.data) || isTableData(query.data))) {
            dataToExport = query.data;
            break;
          }
        }
      }
      
      // Handle single QueryData object
      if (dataToExport && typeof dataToExport === 'object' && 'data' in dataToExport) {
        dataToExport = (dataToExport as QueryData).data;
      }

      // Export based on data type
      if (isTimeSeriesData(dataToExport)) {
        csvString = exportTimeSeriesData(dataToExport);
      } else if (isBarChartData(dataToExport)) {
        csvString = exportBarChartData(dataToExport);
      } else if (isTableData(dataToExport)) {
        csvString = exportTableData(dataToExport);
      }
    } catch (error) {
      console.error('Error exporting CSV:', error);
      return;
    }

    if (!csvString) {
      console.warn('No valid data found for CSV export');
      return;
    }

    const blobCsvData = new Blob([csvString], { type: 'text/csv' });
    const csvURL = URL.createObjectURL(blobCsvData);
    const link = document.createElement('a');
    link.href = csvURL;
    link.download = `${title}_${panelType}Data.csv`;
    link.click();
    URL.revokeObjectURL(csvURL);
  };

  const csvExportButton = useMemo(() => {
    if (!shouldShowCsvExport) {
      return null;
    }

    return (
      <InfoTooltip description="Export as CSV">
        <HeaderIconButton
          aria-label="CSV Export"
          size="small"
          onClick={csvExportHandler}
        >
          <DownloadIcon fontSize="inherit" />
        </HeaderIconButton>
      </InfoTooltip>
    );
  }, [csvExportHandler, shouldShowCsvExport]);

>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
    const hasData = queryResults.some((q) => q.data);
    const isFetching = queryResults.some((q) => q.isFetching);
    const queryErrors = queryResults.filter((q) => q.error);
=======
    const hasData = queryResults && (() => {
      // Handle array of QueryData
      if (Array.isArray(queryResults)) {
        return queryResults.length > 0;
      }
      
      // Handle TimeSeriesData
      if (isTimeSeriesData(queryResults)) {
        return queryResults.series && queryResults.series.length > 0;
      }
      
      // Handle BarChartData
      if (isBarChartData(queryResults)) {
        return (queryResults.data && Array.isArray(queryResults.data) && queryResults.data.length > 0) ||
               (queryResults.series && queryResults.series.length > 0);
      }
      
      // Handle TableData
      if (isTableData(queryResults)) {
        return queryResults.rows && Array.isArray(queryResults.rows) && queryResults.rows.length > 0;
      }
      
      // Handle TraceData
      if (queryResults && typeof queryResults === 'object' && 'spans' in queryResults) {
        return queryResults.spans && Array.isArray(queryResults.spans) && queryResults.spans.length > 0;
      }
      
      // Handle generic QueryData
      if (queryResults && typeof queryResults === 'object') {
        return Object.keys(queryResults).length > 0;
      }
      
      return false;
    })();
    
    const isFetching = false;
    const queryErrors: any[] = [];

>>>>>>> Stashed changes
    if (isFetching && hasData) {
      // If the panel has no data, the panel content will show the loading overlay.
      // Therefore, show the circular loading indicator only in case the panel doesn't display the loading overlay already.
      return <CircularProgress aria-label="loading" size="1.125rem" />;
    } else if (queryErrors.length > 0) {
      const errorTexts = queryErrors
        .map((q) => q.error)
        .map((e: any) => e?.message ?? e?.toString() ?? 'Unknown error') // eslint-disable-line @typescript-eslint/no-explicit-any
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
      // If there are edit handlers, always just show the edit buttons
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
                  // Shrink this icon a little bit to look more consistent
                  // with the other icons in the header.
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

  // if the panel is in non-editing, non-fullscreen mode, show certain icons only on hover
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
          <OverflowMenu title={title}>{editActions}</OverflowMenu>
          {moveAction}
        </OnHover>
      </ConditionalBox>

      {/* large panel width: show all icons in panel header */}
      <ConditionalBox
        sx={(theme) => ({
          // flip the logic here; if the browser (or jsdom) does not support container queries, always show all icons
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
        </OnHover>
      </ConditionalBox>
    </>
  );
};

const OverflowMenu: React.FC<PropsWithChildren<{ title: string }>> = ({ children, title }) => {
  const [anchorPosition, setAnchorPosition] = useState<PopoverPosition>();

  // do not show overflow menu if there is no content (for example, edit actions are hidden)
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
