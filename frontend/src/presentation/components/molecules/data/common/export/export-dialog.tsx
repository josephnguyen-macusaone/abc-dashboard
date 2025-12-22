'use client';

import * as React from 'react';
import { Download, FileText, FileSpreadsheet, FileType, Check } from 'lucide-react';
import { Button } from '@/presentation/components/atoms/primitives/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/presentation/components/atoms/primitives/dialog';
import { Label } from '@/presentation/components/atoms/forms/label';
import { RadioGroup, RadioGroupItem } from '@/presentation/components/atoms/primitives/radio-group';
import { Checkbox } from '@/presentation/components/atoms/forms/checkbox';
import { Typography } from '@/presentation/components/atoms/display/typography';
import { Separator } from '@/presentation/components/atoms/primitives/separator';
import { cn } from '@/shared/helpers';

// ============================================================================
// Types
// ============================================================================

export type ExportFormat = 'csv' | 'excel' | 'pdf' | 'json';

export interface ExportColumn {
  /** Column identifier */
  id: string;

  /** Display label */
  label: string;

  /** Whether column is included by default */
  defaultIncluded?: boolean;

  /** Whether column is required (cannot be unchecked) */
  required?: boolean;
}

export interface ExportOptions {
  /** Selected export format */
  format: ExportFormat;

  /** Selected column IDs to include */
  columns: string[];

  /** Whether to include filters applied */
  includeFilters: boolean;

  /** Whether to export all records or just current page */
  exportAll: boolean;
}

export interface ExportDialogProps {
  /** Available columns for export */
  columns: ExportColumn[];

  /** Current active filters */
  activeFilters?: Record<string, any>;

  /** Total number of records to export */
  totalRecords?: number;

  /** Number of records on current page */
  currentPageRecords?: number;

  /** Callback when export is triggered */
  onExport: (options: ExportOptions) => void | Promise<void>;

  /** Whether export is currently in progress */
  isExporting?: boolean;

  /** Optional class name */
  className?: string;

  /** Entity name for display (e.g., "users", "licenses") */
  entityName?: string;

  /** Supported formats */
  supportedFormats?: ExportFormat[];
}

// ============================================================================
// Format Configurations
// ============================================================================

const FORMAT_CONFIG: Record<
  ExportFormat,
  {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    description: string;
  }
> = {
  csv: {
    icon: FileText,
    label: 'CSV',
    description: 'Comma-separated values, compatible with Excel and spreadsheets',
  },
  excel: {
    icon: FileSpreadsheet,
    label: 'Excel (XLSX)',
    description: 'Microsoft Excel format with formatting and formulas',
  },
  pdf: {
    icon: FileType,
    label: 'PDF',
    description: 'Portable document format, read-only and printable',
  },
  json: {
    icon: FileText,
    label: 'JSON',
    description: 'JavaScript Object Notation, for programmatic use',
  },
};

// ============================================================================
// Component
// ============================================================================

export function ExportDialog({
  columns,
  activeFilters = {},
  totalRecords = 0,
  currentPageRecords = 0,
  onExport,
  isExporting = false,
  className,
  entityName = 'records',
  supportedFormats = ['csv', 'excel', 'pdf', 'json'],
}: ExportDialogProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [format, setFormat] = React.useState<ExportFormat>(supportedFormats[0] || 'csv');
  const [selectedColumns, setSelectedColumns] = React.useState<string[]>(() =>
    columns.filter((col) => col.defaultIncluded !== false).map((col) => col.id)
  );
  const [includeFilters, setIncludeFilters] = React.useState(true);
  const [exportAll, setExportAll] = React.useState(true);

  const activeFilterCount = Object.keys(activeFilters).length;

  const handleColumnToggle = (columnId: string) => {
    const column = columns.find((c) => c.id === columnId);
    if (column?.required) return;

    setSelectedColumns((prev) =>
      prev.includes(columnId)
        ? prev.filter((id) => id !== columnId)
        : [...prev, columnId]
    );
  };

  const handleSelectAll = () => {
    setSelectedColumns(columns.map((col) => col.id));
  };

  const handleDeselectAll = () => {
    setSelectedColumns(columns.filter((col) => col.required).map((col) => col.id));
  };

  const handleExport = async () => {
    const options: ExportOptions = {
      format,
      columns: selectedColumns,
      includeFilters,
      exportAll,
    };

    try {
      await onExport(options);
      setIsOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
      // Error handling should be done in the parent callback
    }
  };

  const exportCount = exportAll ? totalRecords : currentPageRecords;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export {entityName}</DialogTitle>
          <DialogDescription>
            Choose export format, columns, and options for your export.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Export Format</Label>
            <RadioGroup value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
              <div className="grid gap-3">
                {supportedFormats.map((formatKey) => {
                  const config = FORMAT_CONFIG[formatKey];
                  const Icon = config.icon;

                  return (
                    <div
                      key={formatKey}
                      className={cn(
                        'flex items-start space-x-3 p-3 rounded-lg border cursor-pointer',
                        'hover:bg-accent transition-colors',
                        format === formatKey && 'border-primary bg-accent'
                      )}
                      onClick={() => setFormat(formatKey)}
                    >
                      <RadioGroupItem value={formatKey} id={`format-${formatKey}`} />
                      <div className="flex items-start gap-3 flex-1">
                        <Icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
                        <div className="flex flex-col gap-1">
                          <Label
                            htmlFor={`format-${formatKey}`}
                            className="text-sm font-medium cursor-pointer"
                          >
                            {config.label}
                          </Label>
                          <Typography variant="body-xs" className="text-muted-foreground">
                            {config.description}
                          </Typography>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* Column Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Select Columns</Label>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleSelectAll} className="h-7 text-xs">
                  Select All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeselectAll}
                  className="h-7 text-xs"
                >
                  Deselect All
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto border rounded-lg p-3">
              {columns.map((column) => (
                <div key={column.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`column-${column.id}`}
                    checked={selectedColumns.includes(column.id)}
                    onCheckedChange={() => handleColumnToggle(column.id)}
                    disabled={column.required}
                  />
                  <label
                    htmlFor={`column-${column.id}`}
                    className={cn(
                      'text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer',
                      column.required && 'text-muted-foreground'
                    )}
                  >
                    {column.label}
                    {column.required && ' (required)'}
                  </label>
                </div>
              ))}
            </div>

            <Typography variant="body-xs" className="text-muted-foreground">
              {selectedColumns.length} of {columns.length} columns selected
            </Typography>
          </div>

          <Separator />

          {/* Export Options */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Export Options</Label>

            <div className="space-y-3">
              {/* Export scope */}
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="export-all"
                  checked={exportAll}
                  onCheckedChange={(checked) => setExportAll(checked as boolean)}
                />
                <div className="flex flex-col space-y-0.5">
                  <label
                    htmlFor="export-all"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Export all {totalRecords} {entityName}
                  </label>
                  <Typography variant="body-xs" className="text-muted-foreground">
                    {exportAll
                      ? `All ${totalRecords} ${entityName} will be exported`
                      : `Only ${currentPageRecords} ${entityName} from current page will be exported`}
                  </Typography>
                </div>
              </div>

              {/* Include filters */}
              {activeFilterCount > 0 && (
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="include-filters"
                    checked={includeFilters}
                    onCheckedChange={(checked) => setIncludeFilters(checked as boolean)}
                  />
                  <div className="flex flex-col space-y-0.5">
                    <label
                      htmlFor="include-filters"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Apply current filters ({activeFilterCount} active)
                    </label>
                    <Typography variant="body-xs" className="text-muted-foreground">
                      Only export {entityName} that match your current filter criteria
                    </Typography>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Export Summary */}
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <Typography variant="body-s" className="font-medium">
              Export Summary
            </Typography>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-muted-foreground">Format:</div>
              <div className="font-medium">{FORMAT_CONFIG[format].label}</div>

              <div className="text-muted-foreground">Columns:</div>
              <div className="font-medium">
                {selectedColumns.length} of {columns.length}
              </div>

              <div className="text-muted-foreground">Records:</div>
              <div className="font-medium">
                {exportCount} {entityName}
              </div>

              {activeFilterCount > 0 && includeFilters && (
                <>
                  <div className="text-muted-foreground">Filters:</div>
                  <div className="font-medium">{activeFilterCount} applied</div>
                </>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isExporting}>
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || selectedColumns.length === 0}
          >
            {isExporting ? (
              <>
                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-background border-t-transparent" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export {exportCount} {entityName}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
