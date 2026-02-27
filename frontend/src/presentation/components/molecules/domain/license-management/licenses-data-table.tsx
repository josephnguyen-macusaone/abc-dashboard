/**
 * LicensesDataTable Component
 */

"use client";

import { FileText } from "lucide-react";

import { DataTable, DataTableDateRangeFilter, DataTableToolbar } from "@/presentation/components/molecules/data/data-table";
import { LicenseDataTableSkeleton } from "@/presentation/components/organisms/skeletons/license-data-table-skeleton";
import { useDataTable } from "@/presentation/hooks";
import { Typography } from "@/presentation/components/atoms";
import { Button } from "@/presentation/components/atoms/primitives/button";
import { SearchBar } from "@/presentation/components/molecules";
import { getLicenseTableColumns } from "@/presentation/components/molecules/domain/license-management/license-table-columns";
import type { LicenseRecord } from "@/types";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useDataTableStore } from "@/infrastructure/stores/user";

interface LicensesDataTableProps {
  data: LicenseRecord[];
  pageCount?: number;
  totalRows?: number;
  isLoading?: boolean;
  onQueryChange?: (params: {
    page: number;
    limit: number;
    sortBy?: keyof LicenseRecord;
    sortOrder?: "asc" | "desc";
    search?: string;
    searchField?: 'dba' | 'agentsName' | 'zip';
    status?: string | string[];
    plan?: string | string[];
    term?: string | string[];
  }) => void;
  /** Date range filter (like Status, Plan, Term); null = filter off */
  dateRange?: { from?: Date; to?: Date } | null;
  /** Callback when date range changes */
  onDateRangeChange?: (range: { from?: Date; to?: Date } | null) => void;
}

export function LicensesDataTable({
  data,
  pageCount: serverPageCount = -1,
  totalRows,
  isLoading = false,
  onQueryChange,
  dateRange,
  onDateRangeChange,
}: LicensesDataTableProps) {
  const columns = useMemo(() => getLicenseTableColumns(), []);

  const [currentPageSize, setCurrentPageSize] = useState(20);
  const [searchField, setSearchField] = useState<'dba' | 'agentsName' | 'zip'>('dba');

  const pageCount = useMemo(
    () => (serverPageCount >= 0 ? serverPageCount : Math.ceil(data.length / currentPageSize)),
    [serverPageCount, data.length, currentPageSize]
  );

  const { table, setPage } = useDataTable({
    data,
    columns,
    pageCount,
    totalRows,
    initialState: {
      pagination: { pageSize: 20, pageIndex: 0 },
      sorting: [{ id: "startsAt", desc: true }],
      columnVisibility: {
        select: false,
        smsPurchased: true,
        smsSent: true,
        smsBalance: true,
        agentsName: true,
        agentsCost: true,
        notes: true,
      },
    },
    manualPagination: !!onQueryChange,
    manualSorting: !!onQueryChange,
    manualFiltering: !!onQueryChange,
    shallow: false,
    clearOnDefault: true, // Remove default values from URL
    queryKeys: {},
  });

  // Track the last query to prevent infinite loops
  const lastQueryRef = useRef<string>("");
  const hasInitializedRef = useRef(false);

  // Track last values for changes
  const lastPageIndexRef = useRef<number>(0);
  const lastPageSizeRef = useRef<number>(20);
  const lastSortRef = useRef<string>("");
  const lastFiltersRef = useRef<string>("");
  const lastManualFiltersRef = useRef<string>("");
  const lastSearchValueRef = useRef<string>("");
  const lastSearchFieldRef = useRef<'dba' | 'agentsName' | 'zip' | undefined>(undefined);

  // Use Zustand store for table state management
  const tableId = 'licenses-data-table';
  const {
    search: searchValue,
    manualFilters: manualFilterValues,
  } = useDataTableStore((state) => state.getTableState(tableId));
  const {
    setTableSearch,
    updateTableManualFilter,
    clearTableFilters,
  } = useDataTableStore();

  // Track filter actions to determine reset button visibility (state so React Compiler allows updates in callbacks)
  const [hasPerformedFiltering, setHasPerformedFiltering] = useState(false);

  // Initialize component and prevent initial API calls
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const searchParam = urlParams.get('search');
    const statusParam = urlParams.get('status');
    const planParam = urlParams.get('plan');
    const termParam = urlParams.get('term');

    if (searchParam) {
      setTableSearch(tableId, searchParam);
    }

    if (statusParam) {
      const statusValues = statusParam.includes(',') ? statusParam.split(',') : [statusParam];
      updateTableManualFilter(tableId, 'status', statusValues);
    }

    if (planParam) {
      const planValues = planParam.includes(',') ? planParam.split(',') : [planParam];
      updateTableManualFilter(tableId, 'plan', planValues);
    }

    if (termParam) {
      const termValues = termParam.includes(',') ? termParam.split(',') : [termParam];
      updateTableManualFilter(tableId, 'term', termValues);
    }

    // Reset page to 1 if there are any filters on mount
    const hasFilters = !!(searchParam || statusParam || planParam || termParam);
    if (hasFilters) {
      table.setPageIndex(0);
      setPage(1); // Reset URL query state
    }
  }, [tableId, setTableSearch, updateTableManualFilter, table, setPage]);

  // Calculate if filters are currently active (for reset button visibility)
  const hasActiveFilters = useMemo(() => {
    const tableState = table.getState();

    // Check search filters
    const hasSearchFilters = searchValue.trim() !== "";

    // Check manual filter values (what user has selected)
    const hasManualFilters = (
      (manualFilterValues.status && manualFilterValues.status.length > 0) ||
      (manualFilterValues.plan && manualFilterValues.plan.length > 0) ||
      (manualFilterValues.term && manualFilterValues.term.length > 0)
    );

    // Check table column filters
    const hasTableFilters = tableState.columnFilters && tableState.columnFilters.length > 0;

    // Check date range filter
    const hasDateRange = !!(dateRange?.from || dateRange?.to);

    return hasSearchFilters || hasManualFilters || hasTableFilters || hasDateRange;
  }, [searchValue, manualFilterValues, table, dateRange]);

  // Reset button should show if there's any filter activity or when no results with filters
  const shouldShowResetButton = hasActiveFilters || (hasPerformedFiltering && data.length === 0);

  // Handle manual filter changes
  const handleManualFilterChange = useCallback((columnId: string, values: string[]) => {
    setHasPerformedFiltering(true);
    table.setPageIndex(0);
    setPage(1);
    updateTableManualFilter(tableId, columnId, values);
  }, [updateTableManualFilter, tableId, table, setPage]);

  // Ensure table always has default sorting on mount
  useEffect(() => {
    const currentSorting = table.getState().sorting;
    if (!currentSorting || currentSorting.length === 0) {
      table.setSorting([{ id: "startsAt", desc: true }]);
    }
  }, [table]);

  // Track pagination, sorting, and filtering separately for reliable change detection
  const tablePageIndex = table.getState().pagination.pageIndex;
  const tablePageSize = table.getState().pagination.pageSize;
  const tableSorting = table.getState().sorting;
  const tableColumnFilters = table.getState().columnFilters;

  // Debounced search handler - triggers API call after user stops typing
  const debouncedSearchRef = useRef<NodeJS.Timeout>(null);

  const handleSearchChange = useCallback((value: string) => {
    const trimmedValue = value.trim();
    const previousSearch = lastSearchValueRef.current;

    // Check if search actually changed
    const searchChanged = trimmedValue !== previousSearch;

    // Update input immediately for responsive UI
    setTableSearch(tableId, value);
    setHasPerformedFiltering(true);

    // Reset page to 1 when search changes (immediately, before debounce)
    // Reset both table state AND URL query state
    if (searchChanged) {
      table.setPageIndex(0);
      setPage(1); // Reset URL query state
      // Update ref immediately to prevent race conditions
      lastSearchValueRef.current = trimmedValue;
      lastPageIndexRef.current = 0;
    }

    // Clear previous timeout
    if (debouncedSearchRef.current) {
      clearTimeout(debouncedSearchRef.current);
    }

    // Debounce API call
    debouncedSearchRef.current = setTimeout(() => {
      // Trigger API call with search value (parent's handleQueryChange will clear date range when search is present)
      const tableState = table.getState();
      const activeSort = tableState.sorting?.[0];

      onQueryChange?.({
        page: 1, // Reset to page 1 on search
        limit: tableState.pagination.pageSize,
        sortBy: (activeSort?.id || "startsAt") as keyof LicenseRecord,
        sortOrder: activeSort?.desc ? "desc" : "asc",
        search: trimmedValue,
        searchField: searchField,
        status: manualFilterValues.status,
        plan: manualFilterValues.plan,
        term: manualFilterValues.term,
      });
    }, 500); // 500ms debounce
  }, [table, onQueryChange, manualFilterValues, tableId, setTableSearch, searchField, setPage]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debouncedSearchRef.current) {
        clearTimeout(debouncedSearchRef.current);
      }
    };
  }, []);

  // Notify parent of query changes for sorting/filtering/pagination
  useEffect(() => {
    if (!onQueryChange) return;

    const activeSort = tableSorting?.[0];

    // Check if pagination, sorting, or filtering changed
    const currentSortString = JSON.stringify(tableSorting);
    const currentFiltersString = JSON.stringify(tableColumnFilters);
    const currentManualFilters = JSON.stringify(manualFilterValues);

    // Initialize refs on first run
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      lastPageIndexRef.current = tablePageIndex;
      lastPageSizeRef.current = tablePageSize;
      lastSortRef.current = currentSortString;
      lastFiltersRef.current = currentFiltersString;
      lastManualFiltersRef.current = currentManualFilters;
      lastSearchValueRef.current = searchValue.trim(); // Initialize search ref
      lastSearchFieldRef.current = searchField;

      const initialQueryParams = {
        page: tablePageIndex + 1,
        limit: tablePageSize,
        sortBy: activeSort?.id || "startsAt",
        sortOrder: activeSort?.desc ? "desc" : "asc",
      };
      lastQueryRef.current = JSON.stringify(initialQueryParams);
      return;
    }

    const paginationChanged = tablePageIndex !== lastPageIndexRef.current ||
      tablePageSize !== lastPageSizeRef.current;
    const sortChanged = currentSortString !== lastSortRef.current;
    const filtersChanged = currentFiltersString !== lastFiltersRef.current ||
      currentManualFilters !== lastManualFiltersRef.current;
    const searchChanged = searchValue.trim() !== lastSearchValueRef.current;
    const searchFieldChanged = searchField !== lastSearchFieldRef.current;

    // If search, searchField, or filters changed, reset page to 1
    if (searchChanged || searchFieldChanged || filtersChanged) {
      if (tablePageIndex !== 0) {
        table.setPageIndex(0);
        setPage(1); // Reset URL query state
        // Update refs to reflect the reset
        lastPageIndexRef.current = 0;
      }
    }

    if (!paginationChanged && !sortChanged && !filtersChanged && !searchChanged && !searchFieldChanged) return;

    // Build query params - ensure default sorting is desc for startsAt
    // Use page 1 if search, searchField, or filters changed, otherwise use current page
    const targetPage = (searchChanged || searchFieldChanged || filtersChanged) ? 1 : (tablePageIndex + 1);
    const queryParams: {
      page: number;
      limit: number;
      sortBy?: keyof LicenseRecord;
      sortOrder?: "asc" | "desc";
      search?: string;
      searchField?: 'dba' | 'agentsName' | 'zip';
      status?: string | string[];
      plan?: string | string[];
      term?: string | string[];
    } = {
      page: targetPage,
      limit: tablePageSize,
      sortBy: (activeSort?.id || "startsAt") as keyof LicenseRecord,
      sortOrder: activeSort ? (activeSort.desc ? "desc" : "asc") : "desc",
    };

    // Search: single search bar; searchField limits to DBA or Agents Name when set
    queryParams.search = searchValue.trim() || undefined;
    if (searchField) queryParams.searchField = searchField;

    // Add manual filter values
    if (manualFilterValues.status && manualFilterValues.status.length > 0) {
      queryParams.status = manualFilterValues.status;
    }

    if (manualFilterValues.plan && manualFilterValues.plan.length > 0) {
      queryParams.plan = manualFilterValues.plan;
    }

    if (manualFilterValues.term && manualFilterValues.term.length > 0) {
      queryParams.term = manualFilterValues.term;
    }

    // Create a stable string representation for comparison
    const queryString = JSON.stringify(queryParams);

    // Call onQueryChange for any changes
    if (queryString !== lastQueryRef.current && hasInitializedRef.current) {
      lastQueryRef.current = queryString;
      onQueryChange(queryParams);
    }

    // Update refs after API call
    lastPageIndexRef.current = targetPage - 1; // Use targetPage to reflect reset
    lastPageSizeRef.current = tablePageSize;
    lastSortRef.current = currentSortString;
    lastFiltersRef.current = currentFiltersString;
    lastManualFiltersRef.current = currentManualFilters;
    lastSearchValueRef.current = searchValue.trim();
    lastSearchFieldRef.current = searchField;
  }, [tablePageIndex, tablePageSize, tableSorting, tableColumnFilters, searchValue, searchField, manualFilterValues, onQueryChange, table, setPage]);

  // Update page size when table page size changes (defer setState to avoid synchronous update in effect)
  const [, startTransition] = useTransition();
  const tablePaginationPageSize = table.getState().pagination.pageSize;
  useEffect(() => {
    if (tablePaginationPageSize !== currentPageSize) {
      startTransition(() => setCurrentPageSize(tablePaginationPageSize));
    }
  }, [tablePaginationPageSize, currentPageSize, startTransition]);

  // Loading state
  if (isLoading) {
    return (
      <LicenseDataTableSkeleton showHeader={false} />
    );
  }

  const emptyStateContent =
    data.length === 0 && !isLoading ? (
      shouldShowResetButton ? (
        <div className="p-12 text-center border rounded-md">
          <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <Typography variant="title-s" className="text-foreground mb-2">
            No licenses found
          </Typography>
          <Typography variant="body-s" color="muted" className="text-muted-foreground mb-4">
            No licenses match your search criteria. Try adjusting your filters.
          </Typography>
          <Button
            variant="default"
            size="sm"
            onClick={() => {
              setTableSearch(tableId, "");
              setSearchField('dba');
              if (debouncedSearchRef.current) {
                clearTimeout(debouncedSearchRef.current);
              }
              clearTableFilters(tableId);
              table.setColumnFilters([]);
              setHasPerformedFiltering(false);
              table.setPageIndex(0);
              setTimeout(() => {
                onQueryChange?.({
                  page: 1,
                  limit: table.getState().pagination.pageSize,
                  sortBy: 'startsAt',
                  sortOrder: 'desc',
                  search: undefined,
                  searchField: 'dba',
                  status: undefined,
                  plan: undefined,
                  term: undefined,
                });
              }, 0);
            }}
          >
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="p-12 text-center border rounded-md">
          <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <Typography variant="title-s" className="text-foreground mb-2">
            No licenses found
          </Typography>
          <Typography variant="body-s" color="muted" className="text-muted-foreground">
            No license records are available at this time.
          </Typography>
        </div>
      )
    ) : undefined;

  return (
    <DataTable table={table} emptyState={emptyStateContent}>
      <DataTableToolbar
        table={table}
        searchBar={
          <div className="flex flex-nowrap items-center gap-2 w-full min-w-0 overflow-x-auto">
            {onDateRangeChange && (
              <DataTableDateRangeFilter
                value={dateRange ?? null}
                onDateRangeChange={onDateRangeChange}
                title="Date Range"
                align="start"
                className="shrink-0"
              />
            )}
            <SearchBar
              value={searchValue}
              onValueChange={handleSearchChange}
              searchField={searchField}
              onSearchFieldChange={(v) => setSearchField(v)}
              placeholder="Search..."
              className="w-full min-w-[140px] sm:min-w-[200px] sm:w-72 md:w-80 max-w-full"
              allowClear={false}
            />
          </div>
        }
        onReset={() => {
          // 1. Clear search state and prefix (default to DBA)
          setTableSearch(tableId, "");
          setSearchField('dba');

          // Clear debounce timeout
          if (debouncedSearchRef.current) {
            clearTimeout(debouncedSearchRef.current);
          }

          // 2. Clear manual filter values (this will reset visual state via initialFilterValues)
          clearTableFilters(tableId);

          // 3. Clear table filters
          table.setColumnFilters([]);

          // 4. Reset filtering tracking
          setHasPerformedFiltering(false);

          // 5. Clear date range filter
          onDateRangeChange?.(null);

          // 6. Reset to first page and trigger API call with clean state
          table.setPageIndex(0);

          // 7. Trigger API call with clean state (explicit clears so store and API reset filters)
          setTimeout(() => {
            onQueryChange?.({
              page: 1,
              limit: table.getState().pagination.pageSize,
              sortBy: 'startsAt',
              sortOrder: 'desc',
              search: undefined,
              searchField: 'dba',
              status: undefined,
              plan: undefined,
              term: undefined,
            });
          }, 0);
        }}
        hasActiveFilters={shouldShowResetButton}
        onManualFilterChange={handleManualFilterChange}
        initialFilterValues={manualFilterValues}
      />
    </DataTable>
  );
}

