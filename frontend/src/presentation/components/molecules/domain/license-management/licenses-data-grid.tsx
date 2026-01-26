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
import { LicensesDataGridSkeleton } from "@/presentation/components/organisms";
import { getLicenseGridColumns } from "./license-grid-columns";
import type { LicenseRecord } from "@/types";

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
  height = 1200,
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
      // Add new row to the TOP of the data array for better UX
      setData((prev) => [newRow, ...prev]);
      setHasChanges(true);
      // Force DataGrid remount to prevent virtual scroller conflicts
      dataVersionRef.current += 1;

      // Return row index 0 to scroll to the newly added row at the top
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

  // Debounce search input to API calls (500ms delay to wait for user to finish typing)
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      const trimmedInput = searchInput.trim();
      setSearchQuery(trimmedInput);
      // Clear the reset tracking when search query updates (after debounce)
      // This allows reset to happen again for the new search value
      if (hasResetPageForSearchRef.current !== trimmedInput) {
        hasResetPageForSearchRef.current = "";
      }
    }, 500); // 500ms debounce to wait for complete editing

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
    manualFiltering: !!onQueryChange, // Enable server-side filtering when onQueryChange provided
    // Don't pass onQueryChange to useDataGrid - we'll handle it manually
  });

  // Track changes manually (adapted from licenses-data-table.tsx)
  const hasInitializedRef = React.useRef(false);
  const lastPageIndexRef = React.useRef<number>(0);
  const lastPageSizeRef = React.useRef<number>(20);
  const lastSortRef = React.useRef<string>("");
  const lastSearchRef = React.useRef<string>("");
  const lastFiltersRef = React.useRef<string>("");
  const lastQueryRef = React.useRef<string>(""); // Track last query to prevent duplicate calls
  const isResettingRef = React.useRef(false); // Track if we're in a reset operation
  const hasResetPageForSearchRef = React.useRef<string>(""); // Track which search we've already reset page for

  // Extract table state values directly (same as data-table)
  const tablePageIndex = gridState.table.getState().pagination.pageIndex;
  const tablePageSize = gridState.table.getState().pagination.pageSize;
  const tableSorting = gridState.table.getState().sorting;
  const tableColumnFilters = gridState.table.getState().columnFilters;

  // Manual query change handler (adapted from data-table)
  // Only triggers API calls when search/filter/pagination actually changes (after debounce)
  React.useEffect(() => {
    // Skip if we're in a reset operation to prevent duplicate calls
    if (isResettingRef.current) return;
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
      // If there's a search on mount, ensure page is 1
      if (currentSearch && tablePageIndex !== 0) {
        isResettingRef.current = true;
        gridState.table.setPageIndex(0);
        lastPageIndexRef.current = 0;
        isResettingRef.current = false;
      }
      return;
    }

    // Check what changed
    const paginationChanged =
      tablePageIndex !== lastPageIndexRef.current ||
      tablePageSize !== lastPageSizeRef.current;
    const sortChanged = currentSortString !== lastSortRef.current;
    const searchChanged = currentSearch !== lastSearchRef.current;
    const filtersChanged = currentFiltersString !== lastFiltersRef.current;

    // Reset page to 1 when search or filters change
    // Only reset once per search value to prevent loops
    if (searchChanged) {
      // Only reset if we haven't already reset for this exact search value
      if (hasResetPageForSearchRef.current !== currentSearch) {
        if (tablePageIndex !== 0) {
          isResettingRef.current = true;
          gridState.table.setPageIndex(0);
          lastPageIndexRef.current = 0;
        }
        hasResetPageForSearchRef.current = currentSearch; // Mark that we've reset for this search
      }
    }

    if (filtersChanged) {
      // Reset page when filters change
      if (tablePageIndex !== 0) {
        isResettingRef.current = true;
        gridState.table.setPageIndex(0);
        lastPageIndexRef.current = 0;
      }
    }

    // Early return: Skip if only pagination changed due to our reset (prevent loop)
    // But allow through if search/filter changed (we need to call API)
    if (isResettingRef.current && paginationChanged && !sortChanged && !searchChanged && !filtersChanged) {
      isResettingRef.current = false;
      // Update refs to reflect the reset
      lastPageIndexRef.current = 0;
      return;
    }

    // Early return if nothing changed
    if (!paginationChanged && !sortChanged && !searchChanged && !filtersChanged) {
      return;
    }

    // Build query params with proper filter processing
    // Always use page 1 when search or filters change, otherwise use current page
    const targetPage = (searchChanged || filtersChanged) ? 1 : (tablePageIndex + 1);
    const apiParams: {
      page: number;
      limit: number;
      sortBy?: string;
      sortOrder: "asc" | "desc";
      search?: string;
      status?: string;
    } = {
      page: targetPage,
      limit: tablePageSize,
      sortBy: activeSort?.id,
      sortOrder: (activeSort?.desc ? "desc" : "asc") as "asc" | "desc",
      search: currentSearch || undefined,
    };

    // Process table column filters to utilize backend API
    if (tableColumnFilters && tableColumnFilters.length > 0) {
      tableColumnFilters.forEach(filter => {
        const filterValue = filter.value as any;

        if (filterValue?.value !== undefined) {
          // Handle complex filters with operators
          const operator = filterValue.operator || 'equals';
          const value = filterValue.value;

          // Map frontend operators to backend API parameters
          if (filter.id === 'dba' && operator === 'contains') {
            // "Contains" on DBA field maps to general search
            apiParams.search = value;
          } else if (filter.id === 'status') {
            // Status filtering - backend supports exact match
            // For now, use the first value if multiple are selected
            apiParams.status = Array.isArray(value) ? value[0] : value;
          }
        } else if (filter.value !== undefined) {
          // Handle simple filters without operators
          if (filter.id === 'dba') {
            apiParams.search = String(filter.value);
          } else if (filter.id === 'status') {
            apiParams.status = Array.isArray(filter.value)
              ? String(filter.value[0])
              : String(filter.value);
          }
        }
      });
    }

    // Create a stable string representation for comparison
    const queryString = JSON.stringify(apiParams);

    // Only call onQueryChange if the query actually changed (prevent duplicate calls)
    if (queryString !== lastQueryRef.current) {
      lastQueryRef.current = queryString;
      onQueryChange(apiParams);
    }

    // Update refs after API call
    // Use 0 for pageIndex if search/filter changed (we just reset it)
    const finalPageIndex = (searchChanged || filtersChanged) ? 0 : tablePageIndex;
    lastPageIndexRef.current = finalPageIndex;
    lastPageSizeRef.current = tablePageSize;
    lastSortRef.current = currentSortString;
    lastSearchRef.current = currentSearch;
    lastFiltersRef.current = currentFiltersString;

    // Clear reset flag after processing
    isResettingRef.current = false;
  }, [tablePageIndex, tablePageSize, tableSorting, tableColumnFilters, searchQuery, onQueryChange, gridState.table]);

  // Loading state
  if (isLoading) {
    return (
      <div className={className}>
        <LicensesDataGridSkeleton />
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
        <div className="flex flex-nowrap md:flex-wrap items-center gap-2 md:justify-between overflow-x-auto">
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Custom search that uses local state */}
            <div className="relative">
              <SearchBar
                placeholder="Search DBA..."
                value={searchInput}
                onValueChange={setSearchInput}
                allowClear
                className="w-32 md:w-40 lg:w-56"
                inputClassName="h-8"
              />
            </div>
            <DataGridFilterMenu table={gridState.table} />
            {/* <DataGridSortMenu table={gridState.table} /> */} {/* Hidden - sorting not working */}
            <DataGridRowHeightMenu table={gridState.table} />
            <DataGridViewMenu table={gridState.table} />
          </div>
          {/* Action buttons */}
          {hasChanges && (
            <div className="flex items-center gap-2 flex-shrink-0 ml-auto md:ml-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={isSaving}
                className="gap-2"
                aria-label="Discard changes"
              >
                <RotateCcw className="h-4 w-4 shrink-0" />
                <span className="hidden md:inline">Discard</span>
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!onSave || isSaving}
                className="gap-2"
                aria-label={isSaving ? "Saving changes" : "Save changes"}
              >
                <Save className="h-4 w-4 shrink-0" />
                <span className="hidden md:inline">
                  {isSaving ? "Saving..." : "Save Changes"}
                </span>
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

