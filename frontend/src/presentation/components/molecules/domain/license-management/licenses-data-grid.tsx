/**
 * LicensesDataGrid Component - Excel-like editing for license management
 */

"use client";

import * as React from "react";
import { FileText, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { startTransition } from "react";

import {
  DataGrid,
  DataGridFilterMenu,
  DataGridSearch,
  DataGridSortMenu,
  DataGridRowHeightMenu,
  DataGridViewMenu,
} from "@/presentation/components/molecules/data/data-grid";
import { useDataGrid } from "@/presentation/hooks/use-data-grid";
import { Button } from "@/presentation/components/atoms/primitives/button";
import { Typography } from "@/presentation/components/atoms";
import { Skeleton } from "@/presentation/components/atoms/primitives/skeleton";
import { getLicenseGridColumns } from "./license-grid-columns";
import type { LicenseRecord } from "@/shared/types";

interface LicensesDataGridProps {
  data: LicenseRecord[];
  isLoading?: boolean;
  height?: number;
  className?: string;
  onSave?: (data: LicenseRecord[]) => Promise<void>;
  onAddRow?: () => LicenseRecord | Promise<LicenseRecord>;
  onDeleteRows?: (rows: LicenseRecord[], indices: number[]) => Promise<void>;
  onLoadLicenses?: (params?: { page?: number; limit?: number; search?: string; status?: string }) => Promise<void>;
  pageCount?: number;
  totalCount?: number;
  onQueryChange?: (params: {
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    search?: string;
    status?: string | string[];
  }) => void;
}

export function LicensesDataGrid({
  data: initialData,
  isLoading = false,
  height = 600,
  className,
  onSave,
  onAddRow,
  onDeleteRows,
  pageCount,
  totalCount,
  onQueryChange,
}: LicensesDataGridProps) {
  // For license management (no onQueryChange), use data directly without complex sync
  // For admin dashboard (with onQueryChange), use complex sync to handle pagination
  const useComplexSync = !!onQueryChange;
  const [data, setData] = React.useState<LicenseRecord[]>(initialData);
  const [hasChanges, setHasChanges] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const dataVersionRef = React.useRef(0);

  // Only use complex sync refs when needed
  const lastInitialDataRef = React.useRef<{ length: number; string: string }>(
    useComplexSync ? {
      length: initialData.length,
      string: JSON.stringify(initialData)
    } : { length: 0, string: '' }
  );

  // Track if component is mounted
  const isMountedRef = React.useRef(false);

  // Mark as mounted
  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Sync with initialData when it changes, but only if we don't have unsaved changes
  React.useEffect(() => {
    // Skip on initial mount to avoid setState during render
    if (!isMountedRef.current) {
      return;
    }

    if (!useComplexSync) {
      // For simple mode, set data directly on changes
      setData(initialData);
      dataVersionRef.current += 1;
      return;
    }

    // Complex sync logic for pagination scenarios
    // Simple length check first - much faster and reliable
    if (initialData.length !== lastInitialDataRef.current.length) {
      if (hasChanges) {
        // If data changed externally but we have changes, update the ref
        lastInitialDataRef.current.length = initialData.length;
        return;
      }

      // Use requestAnimationFrame to defer the update to the next animation frame
      requestAnimationFrame(() => {
        setData(initialData);
        lastInitialDataRef.current.length = initialData.length;
        dataVersionRef.current += 1;
      });
      return;
    }

    // If lengths match, do a more thorough check but less frequently
    const currentInitialDataString = JSON.stringify(initialData);
    const initialDataChanged = lastInitialDataRef.current.string !== currentInitialDataString;

    if (initialDataChanged) {
      if (hasChanges) {
        // Update ref but don't sync data
        lastInitialDataRef.current.string = currentInitialDataString;
        return;
      }

      requestAnimationFrame(() => {
        setData(initialData);
        lastInitialDataRef.current.string = currentInitialDataString;
        lastInitialDataRef.current.length = initialData.length;
        dataVersionRef.current += 1;
      });
    }
  }, [initialData, hasChanges, useComplexSync]);

  const columns = React.useMemo(() => getLicenseGridColumns(), []);

  const handleDataChange = React.useCallback((newData: LicenseRecord[]) => {
    setData(newData);
    setHasChanges(true);
    // Update the ref to reflect current initialData state
    lastInitialDataRef.current = {
      length: initialData.length,
      string: JSON.stringify(initialData)
    };
  }, [initialData]);

  const handleRowAdd = React.useCallback(async () => {
    const fallback: LicenseRecord = {
      id: data.length + 1,
      dba: "",
      zip: "",
      startsAt: new Date().toISOString().split("T")[0],
      status: "pending",
      plan: "Basic",
      term: "monthly",
      lastPayment: 0,
      lastActive: new Date().toISOString().split("T")[0],
      smsPurchased: 0,
      smsSent: 0,
      smsBalance: 0,
      agents: 0,
      agentsName: [],
      agentsCost: 0,
      notes: "",
    };

    let newRow = fallback;
    if (onAddRow) {
      try {
        const result = onAddRow();
        newRow = result instanceof Promise ? await result : result;
      } catch {
        newRow = fallback;
      }
    }

    setData((prev) => [...prev, newRow]);
    setHasChanges(true);
    return { rowIndex: data.length, columnId: "dba" };
  }, [data.length, onAddRow]);

  const handleRowsDelete = React.useCallback(
    async (rows: LicenseRecord[], indices: number[]) => {
      if (onDeleteRows) {
        await onDeleteRows(rows, indices);
      }
      setData((prev) => prev.filter((_, idx) => !indices.includes(idx)));
      setHasChanges(true);
    },
    [onDeleteRows],
  );

  const handleSave = React.useCallback(async () => {
    if (!onSave) return;

    setIsSaving(true);
    try {
      await onSave(data);
      setHasChanges(false);
      toast.success("Changes saved successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save changes",
      );
    } finally {
      setIsSaving(false);
    }
  }, [data, onSave]);

  const handleReset = React.useCallback(() => {
    setData(initialData);
    setHasChanges(false);
    toast.info("Changes discarded");
  }, [initialData]);

  // Transform filters from data grid format to API format
  const handleQueryChange = React.useCallback((params: {
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    filters?: Record<string, unknown>;
    search?: string;
  }) => {
    if (!onQueryChange) return;

    // Extract status filter from filters object
    const statusFilter = params.filters?.status;
    const status = Array.isArray(statusFilter) ? statusFilter : statusFilter ? String(statusFilter) : undefined;

    // Call the parent's onQueryChange with transformed params
    onQueryChange({
      page: params.page,
      limit: params.limit,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
      search: params.search,
      status: status,
    });
  }, [onQueryChange]);

  const gridState = useDataGrid({
    data,
    columns,
    onDataChange: handleDataChange,
    onRowAdd: handleRowAdd,
    onRowsDelete: handleRowsDelete,
    rowHeight: "short",
    enableSearch: true,
    enablePaste: true,
    autoFocus: true,
    pageCount: pageCount ?? -1,
    totalRows: totalCount,
    manualPagination: !!onQueryChange,
    manualSorting: !!onQueryChange,
    manualFiltering: !!onQueryChange,
    onQueryChange: handleQueryChange,
  });

  // Loading state
  if (isLoading) {
    return (
      <div className={className}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (initialData.length === 0 && !hasChanges) {
    return (
      <div className={className}>
        <div className="space-y-6">
          <div className="p-12 text-center border rounded-md">
            <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <Typography variant="title-s" className="text-foreground mb-2">
              No licenses found
            </Typography>
            <Typography variant="body-s" className="text-muted-foreground mb-4">
              Get started by adding your first license record.
            </Typography>
            <Button onClick={handleRowAdd}>Add License</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="space-y-5">
        {/* Toolbar with Search, Filter, Sort, Row Height, View, and Action buttons */}
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <DataGridSearch table={gridState.table} placeholder="Search DBA..." />
            <DataGridFilterMenu table={gridState.table} />
            <DataGridSortMenu table={gridState.table} />
            <DataGridRowHeightMenu table={gridState.table} />
            <DataGridViewMenu table={gridState.table} />
          </div>
          {/* Action buttons */}
          {hasChanges && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={isSaving}
              >
                <RotateCcw className="h-4 w-4" />
                Discard
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!onSave || isSaving}
              >
                <Save className="h-4 w-4" />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </div>
        <DataGrid
          key={`licenses-data-grid-${dataVersionRef.current}`}
          {...gridState}
          height={height}
          stretchColumns
        />
      </div>
    </div>
  );
}

