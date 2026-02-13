/**
 * LicensesDataGrid Component - Excel-like editing for license management
 */

"use client";

import * as React from "react";
import { FileText, Save, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";

import {
  DataGrid,
  DataGridViewMenu,
} from "@/presentation/components/molecules/data/data-grid";
import { DataTableFacetedFilter } from "@/presentation/components/molecules/data/data-table";
import { useDataGrid } from "@/presentation/hooks/use-data-grid";
import { Button } from "@/presentation/components/atoms/primitives/button";
import { Typography } from "@/presentation/components/atoms";
import { SearchBar } from "@/presentation/components/molecules";
import { LicensesDataGridSkeleton } from "@/presentation/components/organisms";
import { getLicenseGridColumns } from "./license-grid-columns";
import {
  STATUS_OPTIONS,
  PLAN_MODULE_OPTIONS,
  TERM_OPTIONS,
} from "./license-table-columns";
import type { LicenseRecord } from "@/types";
import logger from "@/shared/helpers/logger";
import { useLicenseStore } from "@/infrastructure/stores/license";

const FILTER_COLUMN_IDS = ["status", "plan", "term"] as const;

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
    searchField?: 'dba' | 'agentsName';
    status?: string | string[];
    plan?: string | string[];
    term?: string | string[];
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

  /** Search scope: dba = DBA only, agentsName = Agents Name only. Default DBA. */
  const [searchField, setSearchField] = React.useState<'dba' | 'agentsName'>('dba');

  // When using the license store (onQueryChange provided), sync search state from store on mount so grid matches table/store behavior
  React.useEffect(() => {
    if (!onQueryChange) return;
    const filters = useLicenseStore.getState().filters;
    const storeSearch = filters.search ?? "";
    const storeField = filters.searchField === "agentsName" ? "agentsName" : "dba";
    if (storeSearch !== "") {
      setSearchInput(storeSearch);
      setSearchQuery(storeSearch);
    }
    setSearchField(storeField);
  }, [onQueryChange]);

  // Track the last initial data to detect changes (reference + identity for server-driven updates e.g. date filter)
  const lastInitialDataRef = React.useRef<LicenseRecord[]>(initialData);
  const dataIdentity = React.useMemo(
    () =>
      initialData.length > 0
        ? `${initialData.length}-${String((initialData[0] as { id?: unknown }).id)}-${String((initialData[initialData.length - 1] as { id?: unknown }).id)}`
        : `empty-${initialData.length}`,
    [initialData]
  );

  // Sync with initialData when it changes (e.g. after date filter or pagination), but only if we don't have unsaved changes or locally added rows
  React.useLayoutEffect(() => {
    if (lastInitialDataRef.current === initialData) {
      return;
    }
    lastInitialDataRef.current = initialData;

    if (!useComplexSync) {
      setData(initialData);
      dataVersionRef.current += 1;
      return;
    }
    if (hasChanges) {
      return;
    }
    // Apply server data (search/filter/pagination). When hasChanges is false we always show what the server returned.
    setData(initialData);
  }, [initialData, dataIdentity, hasChanges, useComplexSync]);

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
      logger.error('Failed to add new license row', { error });
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

  // Ref for debounced search API call (same pattern as licenses-data-table handleSearchChange)
  const debouncedSearchRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const tableStateGetterRef = React.useRef<() => { columnFilters: { id: string; value: unknown }[]; pagination?: { pageSize?: number }; sorting?: Array<{ id?: string; desc?: boolean }> }>(() => ({ columnFilters: [] }));

  // Helper: extract status, plan, term from column filters (same shape as table's manualFilterValues for license store)
  const getStatusPlanTermFromFilters = React.useCallback(
    (columnFilters: { id: string; value: unknown }[]): { status?: string[]; plan?: string[]; term?: string[] } => {
      const result: { status?: string[]; plan?: string[]; term?: string[] } = {};
      columnFilters.forEach((filter) => {
        if (filter.id === "status" || filter.id === "plan" || filter.id === "term") {
          const v = filter.value;
          const arr =
            typeof v === "object" && v !== null && "value" in (v as object)
              ? (v as { value?: unknown }).value
              : v;
          const values = Array.isArray(arr) ? arr.map(String) : arr != null && arr !== "" ? [String(arr)] : undefined;
          if (values?.length) result[filter.id as "status" | "plan" | "term"] = values;
        }
      });
      return result;
    },
    [],
  );

  // Debounce search input to local state (for effect)
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      const trimmedInput = searchInput.trim();
      setSearchQuery(trimmedInput);
      if (hasResetPageForSearchRef.current !== trimmedInput) {
        hasResetPageForSearchRef.current = "";
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchInput]);

  const gridState = useDataGrid({
    data,
    columns,
    onDataChange: handleDataChange,
    onRowAdd: handleRowAdd, // Use local handleRowAdd for data grid functionality
    onRowsDelete: handleRowsDelete,
    rowHeight: "medium",
    enableSearch: false, // Disable built-in search, we'll handle it manually
    enablePaste: true,
    autoFocus: true,
    pageCount: pageCount ?? -1,
    totalRows: totalCount,
    manualPagination: !!onQueryChange,
    manualSorting: !!onQueryChange,
    manualFiltering: !!onQueryChange, // Enable server-side filtering when onQueryChange provided
    meta: {},
  });

  // Track changes manually (adapted from licenses-data-table.tsx)
  const hasInitializedRef = React.useRef(false);
  const lastPageIndexRef = React.useRef<number>(0);
  const lastPageSizeRef = React.useRef<number>(20);
  const lastSortRef = React.useRef<string>("");
  const lastSearchRef = React.useRef<string>("");
  const lastSearchFieldRef = React.useRef<string | undefined>(undefined);
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
    const currentSearchField = searchField;

    // Initialize refs on first run (skip initial call)
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      lastPageIndexRef.current = tablePageIndex;
      lastPageSizeRef.current = tablePageSize;
      lastSortRef.current = currentSortString;
      lastSearchRef.current = currentSearch;
      lastSearchFieldRef.current = currentSearchField;
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
    const searchFieldChanged = currentSearchField !== lastSearchFieldRef.current;
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

    if (filtersChanged || searchFieldChanged) {
      // Reset page when filters or search field change
      if (tablePageIndex !== 0) {
        isResettingRef.current = true;
        gridState.table.setPageIndex(0);
        lastPageIndexRef.current = 0;
      }
    }

    // Early return: Skip if only pagination changed due to our reset (prevent loop)
    // But allow through if search/filter/searchField changed (we need to call API)
    if (isResettingRef.current && paginationChanged && !sortChanged && !searchChanged && !filtersChanged && !searchFieldChanged) {
      isResettingRef.current = false;
      // Update refs to reflect the reset
      lastPageIndexRef.current = 0;
      return;
    }

    // Early return if nothing changed
    if (!paginationChanged && !sortChanged && !searchChanged && !filtersChanged && !searchFieldChanged) {
      return;
    }

    // Build query params with proper filter processing
    // Always use page 1 when search, searchField, or filters change, otherwise use current page
    const targetPage = (searchChanged || filtersChanged || searchFieldChanged) ? 1 : (tablePageIndex + 1);
    const apiParams: {
      page: number;
      limit: number;
      sortBy?: string;
      sortOrder: "asc" | "desc";
      search?: string;
      searchField?: 'dba' | 'agentsName';
      status?: string | string[];
      plan?: string | string[];
      term?: string | string[];
    } = {
      page: targetPage,
      limit: tablePageSize,
      sortBy: activeSort?.id,
      sortOrder: (activeSort?.desc ? "desc" : "asc") as "asc" | "desc",
      search: currentSearch || undefined,
      ...(currentSearch ? { searchField } : {}),
    };

    // Process table column filters to utilize backend API
    // When the search bar has a value, it takes precedence over DBA column filter (so e.g. "Bánh mì" is not overwritten)
    const searchBarHasValue = Boolean(currentSearch?.trim());
    if (tableColumnFilters && tableColumnFilters.length > 0) {
      tableColumnFilters.forEach(filter => {
        const filterValue = filter.value as { value?: unknown; operator?: string } | undefined;

        if (filterValue?.value !== undefined) {
          // Handle complex filters with operators (from DataGridFilterMenu)
          const operator = filterValue.operator || 'equals';
          const value = filterValue.value;

          // Map frontend operators to backend API parameters
          if (filter.id === 'dba' && operator === 'contains' && !searchBarHasValue) {
            apiParams.search = typeof value === 'string' ? value : undefined;
          } else if (filter.id === 'status') {
            // Status filtering - backend supports array
            apiParams.status = Array.isArray(value) ? value : [value];
          } else if (filter.id === 'plan') {
            // Plan filtering - backend supports array
            apiParams.plan = Array.isArray(value) ? value : [value];
          } else if (filter.id === 'term') {
            // Term filtering - backend supports array
            apiParams.term = Array.isArray(value) ? value : [value];
          }
        } else if (filter.value !== undefined) {
          // Handle simple filters without operators (don't overwrite search bar)
          if (filter.id === 'dba' && !searchBarHasValue) {
            apiParams.search = String(filter.value);
          } else if (filter.id === 'status') {
            apiParams.status = Array.isArray(filter.value)
              ? filter.value
              : [String(filter.value)];
          } else if (filter.id === 'plan') {
            apiParams.plan = Array.isArray(filter.value)
              ? filter.value
              : [String(filter.value)];
          } else if (filter.id === 'term') {
            apiParams.term = Array.isArray(filter.value)
              ? filter.value
              : [String(filter.value)];
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
    // Use 0 for pageIndex if search/filter/searchField changed (we just reset it)
    const finalPageIndex = (searchChanged || filtersChanged || searchFieldChanged) ? 0 : tablePageIndex;
    lastPageIndexRef.current = finalPageIndex;
    lastPageSizeRef.current = tablePageSize;
    lastSortRef.current = currentSortString;
    lastSearchRef.current = currentSearch;
    lastSearchFieldRef.current = currentSearchField;
    lastFiltersRef.current = currentFiltersString;

    // Clear reset flag after processing
    isResettingRef.current = false;
  }, [tablePageIndex, tablePageSize, tableSorting, tableColumnFilters, searchQuery, searchField, onQueryChange, gridState.table]);

  // Filter toolbar state (hooks must run before any early return)
  const table = gridState.table;
  tableStateGetterRef.current = () => table.getState();
  const columnFilters = table.getState().columnFilters;

  // Debounced search handler: call onQueryChange with search + filters (same as licenses-data-table handleSearchChange)
  const handleSearchChange = React.useCallback(
    (value: string) => {
      const trimmedValue = value.trim();
      setSearchInput(value);
      if (debouncedSearchRef.current) clearTimeout(debouncedSearchRef.current);
      debouncedSearchRef.current = setTimeout(() => {
        debouncedSearchRef.current = null;
        if (!onQueryChange) return;
        const state = tableStateGetterRef.current();
        const pageSize = state?.pagination?.pageSize ?? 20;
        const sorting = state?.sorting;
        const activeSort = sorting && Array.isArray(sorting) ? sorting[0] : undefined;
        const filters = state?.columnFilters ?? [];
        const { status: s, plan: p, term: t } = getStatusPlanTermFromFilters(filters);
        const params = {
          page: 1,
          limit: pageSize,
          sortBy: (activeSort?.id as string) ?? "startsAt",
          sortOrder: (activeSort?.desc ? "desc" : "asc") as "asc" | "desc",
          search: trimmedValue || undefined,
          searchField,
          status: s?.length ? s : undefined,
          plan: p?.length ? p : undefined,
          term: t?.length ? t : undefined,
        };
        onQueryChange(params);
        lastQueryRef.current = JSON.stringify(params);
        lastSearchRef.current = trimmedValue;
      }, 500);
    },
    [onQueryChange, searchField, getStatusPlanTermFromFilters],
  );

  React.useEffect(() => {
    return () => {
      if (debouncedSearchRef.current) clearTimeout(debouncedSearchRef.current);
    };
  }, []);
  const hasColumnFilters = React.useMemo(
    () =>
      columnFilters.some((f) => {
        if (!FILTER_COLUMN_IDS.includes(f.id as (typeof FILTER_COLUMN_IDS)[number]))
          return false;
        const v = f.value;
        if (typeof v === "object" && v !== null && "value" in v) {
          const val = (v as { value?: unknown }).value;
          return Array.isArray(val) ? val.length > 0 : val != null && val !== "";
        }
        return Array.isArray(v) ? v.length > 0 : v != null && v !== "";
      }),
    [columnFilters],
  );
  const hasSearch = searchInput.trim() !== "";
  const hasActiveFilters = hasColumnFilters || hasSearch;

  const onClearFilters = React.useCallback(() => {
    setSearchInput("");
    setSearchQuery("");
    setSearchField('dba');
    table.setColumnFilters((prev) =>
      prev.filter((f) => !FILTER_COLUMN_IDS.includes(f.id as (typeof FILTER_COLUMN_IDS)[number])),
    );
    // Notify parent so store clears filters and refetches with no search/filters
    const activeSort = table.getState().sorting?.[0];
    onQueryChange?.({
      page: 1,
      limit: table.getState().pagination.pageSize,
      sortBy: (activeSort?.id as string) || "startsAt",
      sortOrder: activeSort?.desc ? "desc" : "asc",
      search: undefined,
      searchField: 'dba',
      status: undefined,
      plan: undefined,
      term: undefined,
    });
  }, [table, onQueryChange]);

  const statusColumn = table.getColumn("status");
  const planColumn = table.getColumn("plan");
  const termColumn = table.getColumn("term");

  // Loading state
  if (isLoading) {
    return (
      <div className={className}>
        <LicensesDataGridSkeleton />
      </div>
    );
  }

  const isEmpty = initialData.length === 0 && !hasChanges;

  return (
    <div className={className}>
      <div className="space-y-5">
        {/* Toolbar: always shown so users can search/filter and add a license when empty */}
        <div className="flex flex-nowrap md:flex-wrap items-center gap-1.5 sm:gap-2 md:justify-between overflow-x-auto">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <SearchBar
              value={searchInput}
              onValueChange={handleSearchChange}
              searchField={searchField}
              onSearchFieldChange={(v) => setSearchField(v)}
              placeholder="Search..."
              className="w-40 md:w-52 lg:w-72"
              allowClear={false}
            />
            {statusColumn && (
              <DataTableFacetedFilter
                column={statusColumn}
                title="Status"
                options={STATUS_OPTIONS}
                multiple
              />
            )}
            {planColumn && (
              <DataTableFacetedFilter
                column={planColumn}
                title="Plan"
                options={PLAN_MODULE_OPTIONS}
                multiple
              />
            )}
            {termColumn && (
              <DataTableFacetedFilter
                column={termColumn}
                title="Term"
                options={TERM_OPTIONS}
                multiple
              />
            )}
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 shrink-0 border-dashed p-0 sm:h-8 sm:w-auto sm:min-w-0 sm:px-3 sm:py-0"
                onClick={onClearFilters}
                aria-label="Reset filters"
              >
                <X className="size-4" />
                <span className="hidden sm:inline">Reset</span>
              </Button>
            )}
            <DataGridViewMenu table={table} />
          </div>
          {/* Action buttons */}
          {hasChanges && (
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 ml-auto md:ml-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={isSaving}
                className="gap-1.5 sm:gap-2"
                aria-label="Discard changes"
              >
                <RotateCcw className="h-4 w-4 shrink-0" />
                <span className="hidden md:inline">Discard</span>
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!onSave || isSaving}
                className="gap-1.5 sm:gap-2"
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
        {isEmpty ? (
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
        ) : (
          <DataGrid
            key={`licenses-data-grid-${dataVersionRef.current}`}
            {...gridState}
            height={height}
            stretchColumns
          />
        )}
      </div>
    </div>
  );
}

