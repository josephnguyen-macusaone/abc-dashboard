/**
 * LicensesDataTable Component
 */

"use client";

import * as React from "react";
import { FileText } from "lucide-react";

import {
  DataTable,
  DataTableToolbar,
} from "@/presentation/components/molecules/data/data-table";
import { LicenseDataTableSkeleton } from "@/presentation/components/organisms/skeletons/license-data-table-skeleton";
import { useDataTable } from "@/presentation/hooks";
import { Typography } from "@/presentation/components/atoms";
import { SearchBar } from "@/presentation/components/molecules";
import { getLicenseTableColumns } from "./license-table-columns";
import type { LicenseRecord } from "@/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
    status?: string | string[];
    plan?: string | string[];
    term?: string | string[];
    search?: string;
  }) => void;
}

export function LicensesDataTable({
  data,
  pageCount: serverPageCount = -1,
  totalRows,
  isLoading = false,
  onQueryChange,
}: LicensesDataTableProps) {
  const columns = useMemo(() => getLicenseTableColumns(), []);

  const [currentPageSize, setCurrentPageSize] = useState(20);

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

  // Use Zustand store for table state management
  const tableId = 'licenses-data-table';
  const {
    search: searchValue,
    manualFilters: manualFilterValues,
  } = useDataTableStore((state) => state.getTableState(tableId));
  const {
    setTableSearch,
    setTableManualFilters,
    updateTableManualFilter,
    clearTableFilters,
  } = useDataTableStore();

  // Initialize component and prevent initial API calls
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const searchParam = urlParams.get('search');
    const statusParam = urlParams.get('status');
    const planParam = urlParams.get('plan');
    const termParam = urlParams.get('term');

    if (searchParam) {
      setTableSearch(tableId, searchParam);
      // Mark that filtering has been performed when initializing from URL
      hasPerformedFilteringRef.current = true;
    }

    if (statusParam) {
      const statusValues = statusParam.includes(',') ? statusParam.split(',') : [statusParam];
      updateTableManualFilter(tableId, 'status', statusValues);
      hasPerformedFilteringRef.current = true;
    }

    if (planParam) {
      const planValues = planParam.includes(',') ? planParam.split(',') : [planParam];
      updateTableManualFilter(tableId, 'plan', planValues);
      hasPerformedFilteringRef.current = true;
    }

    if (termParam) {
      const termValues = termParam.includes(',') ? termParam.split(',') : [termParam];
      updateTableManualFilter(tableId, 'term', termValues);
      hasPerformedFilteringRef.current = true;
    }

    // Reset page to 1 if there are any filters on mount
    const hasFilters = !!(searchParam || statusParam || planParam || termParam);
    if (hasFilters) {
      table.setPageIndex(0);
      setPage(1); // Reset URL query state
    }
  }, [tableId, setTableSearch, updateTableManualFilter, table, setPage]);

  // Track filter actions to determine reset button visibility
  const hasPerformedFilteringRef = useRef(false);

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

    // Current active state
    const currentlyActive = hasSearchFilters || hasManualFilters || hasTableFilters;

    // If we detect active filters, mark that filtering has been performed
    if (currentlyActive) {
      hasPerformedFilteringRef.current = true;
    }

    return currentlyActive;
  }, [searchValue, manualFilterValues, table]);

  // Reset button should show if there's any filter activity or when no results with filters
  const shouldShowResetButton = hasActiveFilters || (hasPerformedFilteringRef.current && data.length === 0);

  // Handle manual filter changes
  const handleManualFilterChange = useCallback((columnId: string, values: string[]) => {
    // Reset page to 1 when filter changes
    // Reset both table state AND URL query state
    table.setPageIndex(0);
    setPage(1); // Reset URL query state
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
    hasPerformedFilteringRef.current = true;

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
      // Trigger API call with search value
      const tableState = table.getState();
      const activeSort = tableState.sorting?.[0];

      onQueryChange?.({
        page: 1, // Reset to page 1 on search
        limit: tableState.pagination.pageSize,
        sortBy: (activeSort?.id || "startsAt") as keyof LicenseRecord,
        sortOrder: activeSort?.desc ? "desc" : "asc",
        search: trimmedValue,
        status: manualFilterValues.status,
        plan: manualFilterValues.plan,
        term: manualFilterValues.term,
      });
    }, 500); // 500ms debounce
  }, [table, onQueryChange, manualFilterValues, tableId, setTableSearch]);

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

    // If search or filters changed, reset page to 1
    // Reset both table state AND URL query state
    if (searchChanged || filtersChanged) {
      if (tablePageIndex !== 0) {
        table.setPageIndex(0);
        setPage(1); // Reset URL query state
        // Update refs to reflect the reset
        lastPageIndexRef.current = 0;
      }
    }

    if (!paginationChanged && !sortChanged && !filtersChanged && !searchChanged) return;

    // Build query params - ensure default sorting is desc for startsAt
    // Use page 1 if search or filters changed, otherwise use current page
    const targetPage = (searchChanged || filtersChanged) ? 1 : (tablePageIndex + 1);
    const queryParams: {
      page: number;
      limit: number;
      sortBy?: keyof LicenseRecord;
      sortOrder?: "asc" | "desc";
      search?: string;
      status?: string | string[];
      plan?: string | string[];
      term?: string | string[];
    } = {
      page: targetPage,
      limit: tablePageSize,
      sortBy: (activeSort?.id || "startsAt") as keyof LicenseRecord,
      sortOrder: activeSort ? (activeSort.desc ? "desc" : "asc") : "desc",
    };

    // Search: single search bar (backend matches DBA and agent names)
    queryParams.search = searchValue.trim() || undefined;

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
  }, [tablePageIndex, tablePageSize, tableSorting, tableColumnFilters, searchValue, manualFilterValues, onQueryChange, table]);

  // Update page size when table page size changes
  useEffect(() => {
    const tablePageSize = table.getState().pagination.pageSize;
    if (tablePageSize !== currentPageSize) {
      setCurrentPageSize(tablePageSize);
    }
  }, [table.getState().pagination.pageSize, currentPageSize]);

  // Loading state
  if (isLoading) {
    return (
      <LicenseDataTableSkeleton showHeader={false} />
    );
  }

  // Empty state with reset button if filters are active
  if (data.length === 0 && !isLoading && shouldShowResetButton) {
    return (
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
        <button
          onClick={() => {
            setTableSearch(tableId, "");
            if (debouncedSearchRef.current) {
              clearTimeout(debouncedSearchRef.current);
            }
            clearTableFilters(tableId);
            table.setColumnFilters([]);
            hasPerformedFilteringRef.current = false;
            table.setPageIndex(0);
            setTimeout(() => {
              onQueryChange?.({
                page: 1,
                limit: table.getState().pagination.pageSize,
                sortBy: 'startsAt',
                sortOrder: 'desc',
              });
            }, 0);
          }}
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 transition-colors"
        >
          Clear filters
        </button>
      </div>
    );
  }

  // Empty state without filters
  if (data.length === 0 && !isLoading) {
    return (
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
    );
  }

  return (
    <DataTable table={table}>
      <DataTableToolbar
        table={table}
        searchBar={
          <SearchBar
            placeholder="Search..."
            value={searchValue}
            onValueChange={handleSearchChange}
            allowClear={false}
            className="w-64"
            inputClassName="h-8"
          />
        }
        onReset={() => {
          // 1. Clear search state
          setTableSearch(tableId, "");

          // Clear debounce timeout
          if (debouncedSearchRef.current) {
            clearTimeout(debouncedSearchRef.current);
          }

          // 2. Clear manual filter values (this will reset visual state via initialFilterValues)
          clearTableFilters(tableId);

          // 3. Clear table filters
          table.setColumnFilters([]);

          // 4. Reset filtering tracking
          hasPerformedFilteringRef.current = false;

          // 5. Reset to first page and trigger API call with clean state
          table.setPageIndex(0);

          // 6. Trigger API call with clean state
          setTimeout(() => {
            onQueryChange?.({
              page: 1,
              limit: table.getState().pagination.pageSize,
              sortBy: 'startsAt',
              sortOrder: 'desc',
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

