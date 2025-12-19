/**
 * LicensesDataGrid Component - Excel-like editing for license management
 */

"use client";

import * as React from "react";
import { FileText, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import {
  DataGrid,
  DataGridFilterMenu,
  DataGridSortMenu,
  DataGridRowHeightMenu,
  DataGridViewMenu,
} from "@/presentation/components/molecules/data/data-grid";
import { useDataGrid } from "@/presentation/hooks/use-data-grid";
import { Button } from "@/presentation/components/atoms/primitives/button";
import { Typography } from "@/presentation/components/atoms";
import { SearchBar } from "@/presentation/components/molecules";
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

  // Track the last initial data to detect changes
  const lastInitialDataRef = React.useRef<LicenseRecord[]>(initialData);

  // Sync with initialData when it changes, but only if we don't have unsaved changes
  // Use layout effect to run synchronously after DOM updates but before paint
  React.useLayoutEffect(() => {
    // Only sync if data actually changed
    if (lastInitialDataRef.current === initialData) {
      return;
    }

    // Store reference for next comparison
    lastInitialDataRef.current = initialData;

    if (!useComplexSync) {
      // For simple mode, set data directly on changes
      setData(initialData);
      dataVersionRef.current += 1;
      return;
    }

    // Complex sync logic for pagination scenarios
    // Don't override local changes
    if (hasChanges) {
      return;
    }

    // Update data state
    setData(initialData);
    dataVersionRef.current += 1;
  }, [initialData, hasChanges, useComplexSync]);

  const columns = React.useMemo(() => getLicenseGridColumns(), []);

  const handleDataChange = React.useCallback((newData: LicenseRecord[]) => {
    setData(newData);
    setHasChanges(true);
  }, []);

  const handleRowAdd = React.useCallback(async () => {
    if (!onAddRow) {
      throw new Error('onAddRow callback is required for adding new license rows');
    }

    try {
      const newRow = await onAddRow();
      setData((prev) => [newRow, ...prev]);
      setHasChanges(true);
      // Force DataGrid remount to prevent virtual scroller conflicts
      dataVersionRef.current += 1;

      return { rowIndex: 0, columnId: "dba" };
    } catch (error) {
      console.error('Failed to add new license row:', error);
      throw error;
    }
  }, [onAddRow]);

  const handleRowsDelete = React.useCallback(
    async (rows: LicenseRecord[], indices: number[]) => {
      if (onDeleteRows) {
        await onDeleteRows(rows, indices);
      }
      setData((prev) => prev.filter((_, idx) => !indices.includes(idx)));
      setHasChanges(true);
      // Force DataGrid remount to prevent virtual scroller conflicts
      dataVersionRef.current += 1;
    },
    [onDeleteRows],
  );

  const handleSave = React.useCallback(async () => {
    if (!onSave) return;

    setIsSaving(true);
    try {
      await onSave(data);
      setHasChanges(false);
      // Toast messages are handled by the parent component (onSave callback)
    } catch (error) {
      // Error toast is handled by the parent component (onSave callback)
      throw error; // Re-throw to let parent handle the error
    } finally {
      setIsSaving(false);
    }
  }, [data, onSave]);

  const handleReset = React.useCallback(() => {
    setData(initialData);
    setHasChanges(false);
    // Force DataGrid remount to prevent virtual scroller conflicts
    dataVersionRef.current += 1;
    toast.info("Changes discarded");
  }, [initialData]);

  // Separate search state to avoid conflicts with data updates
  const [searchInput, setSearchInput] = React.useState(""); // What user types
  const [searchQuery, setSearchQuery] = React.useState(""); // What gets sent to API (debounced)

  // Debounce search input to API calls (300ms delay)
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchInput]);

  const gridState = useDataGrid({
    data,
    columns,
    onDataChange: handleDataChange,
    onRowAdd: handleRowAdd, // Use local handleRowAdd for data grid functionality
    onRowsDelete: handleRowsDelete,
    rowHeight: "short",
    enableSearch: false, // Disable built-in search, we'll handle it manually
    enablePaste: true,
    autoFocus: true,
    pageCount: pageCount ?? -1,
    totalRows: totalCount,
    manualPagination: !!onQueryChange,
    manualSorting: !!onQueryChange,
    manualFiltering: !!onQueryChange,
    // Don't pass onQueryChange to useDataGrid - we'll handle it manually
  });

  // Track changes manually (adapted from licenses-data-table.tsx)
  const hasInitializedRef = React.useRef(false);
  const lastPageIndexRef = React.useRef<number>(0);
  const lastPageSizeRef = React.useRef<number>(20);
  const lastSortRef = React.useRef<string>("");
  const lastSearchRef = React.useRef<string>("");
  const lastFiltersRef = React.useRef<string>("");

  // Extract table state values directly (same as data-table)
  const tablePageIndex = gridState.table.getState().pagination.pageIndex;
  const tablePageSize = gridState.table.getState().pagination.pageSize;
  const tableSorting = gridState.table.getState().sorting;
  const tableColumnFilters = gridState.table.getState().columnFilters;

  // Manual query change handler (adapted from data-table)
  React.useEffect(() => {
    if (!onQueryChange) return;

    const activeSort = tableSorting?.[0];
    const currentSortString = JSON.stringify(tableSorting);
    const currentFiltersString = JSON.stringify(tableColumnFilters);
    const currentSearch = searchQuery.trim();

    // Initialize refs on first run (skip initial call)
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      lastPageIndexRef.current = tablePageIndex;
      lastPageSizeRef.current = tablePageSize;
      lastSortRef.current = currentSortString;
      lastSearchRef.current = currentSearch;
      lastFiltersRef.current = currentFiltersString;
      return;
    }

    // Check what changed
    const paginationChanged =
      tablePageIndex !== lastPageIndexRef.current ||
      tablePageSize !== lastPageSizeRef.current;
    const sortChanged = currentSortString !== lastSortRef.current;
    const searchChanged = currentSearch !== lastSearchRef.current;
    const filtersChanged = currentFiltersString !== lastFiltersRef.current;

    if (!paginationChanged && !sortChanged && !searchChanged && !filtersChanged) {
      return;
    }

    // Update refs
    lastPageIndexRef.current = tablePageIndex;
    lastPageSizeRef.current = tablePageSize;
    lastSortRef.current = currentSortString;
    lastSearchRef.current = currentSearch;
    lastFiltersRef.current = currentFiltersString;

    // Build query params
    const filterMap = tableColumnFilters?.reduce<Record<string, unknown>>((acc, curr) => {
      acc[curr.id] = curr.value;
      return acc;
    }, {});

    // Extract status filter
    const statusFilter = filterMap?.status;
    const status = Array.isArray(statusFilter)
      ? statusFilter
      : statusFilter ? String(statusFilter) : undefined;

    const apiParams = {
      page: tablePageIndex + 1,
      limit: tablePageSize,
      sortBy: activeSort?.id,
      sortOrder: (activeSort?.desc ? "desc" : "asc") as "asc" | "desc",
      search: currentSearch || undefined,
      status: status,
    };

    // Call API
    onQueryChange(apiParams);
  }, [tablePageIndex, tablePageSize, tableSorting, tableColumnFilters, searchQuery, onQueryChange]);

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
            {/* Custom search that uses local state */}
            <div className="relative">
              <SearchBar
                placeholder="Search DBA..."
                value={searchInput}
                onValueChange={setSearchInput}
                allowClear
                className="w-40 lg:w-56"
                inputClassName="h-8"
              />
            </div>
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

