/**
 * UsersDataTable Component
 */

"use client";

import * as React from "react";
import { UserPlus, UserCircle } from "lucide-react";

import {
  DataTable,
  DataTableToolbar,
} from "@/presentation/components/molecules/data/data-table";
import { UserDataTableSkeleton } from "./user-data-table-skeleton";
import { useDataTable } from "@/presentation/hooks";
import { Button } from "@/presentation/components/atoms/primitives/button";
import { SearchBar } from "@/presentation/components/molecules";
import { Typography } from "@/presentation/components/atoms";
import { getUserTableColumns } from "./user-table-columns";
import type { User } from "@/domain/entities/user-entity";
import type { DataTableRowAction } from "@/types/data-table";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useUserStore } from "@/infrastructure/stores/user";
import { useDataTableStore } from "@/infrastructure/stores/user";

interface UsersDataTableProps {
  data: User[];
  pageCount?: number;
  totalCount?: number;
  currentUser: User;
  canEdit: (user: User) => boolean;
  canDelete: (user: User) => boolean;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  onCreateUser?: () => void;
  isLoading?: boolean;
  onQueryChange?: (params: {
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    search?: string;
    searchField?: string;
    role?: string | string[];
    isActive?: string | string[];
    displayName?: string;
    createdAtFrom?: string;
    createdAtTo?: string;
    updatedAtFrom?: string;
    updatedAtTo?: string;
    lastLoginFrom?: string;
    lastLoginTo?: string;
  }) => void;
}

export function UsersDataTable({
  data,
  pageCount,
  totalCount,
  currentUser,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  onCreateUser,
  isLoading = false,
  onQueryChange,
}: UsersDataTableProps) {
  // Get filters from store to sync search value
  const userStore = useUserStore();

  // Use Zustand store for table state management
  const tableId = 'users-data-table';
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

  const [rowAction, setRowAction] =
    useState<DataTableRowAction<User> | null>(null);

  // Handle row actions
  useEffect(() => {
    if (rowAction) {
      if (rowAction.variant === "update") {
        onEdit(rowAction.row.original);
      } else if (rowAction.variant === "delete") {
        onDelete(rowAction.row.original);
      }
      setRowAction(null);
    }
  }, [rowAction, onEdit, onDelete]);

  const columns = useMemo(
    () =>
      getUserTableColumns({
        setRowAction,
        currentUserId: currentUser.id,
        currentUserRole: currentUser.role,
        canEdit,
        canDelete,
      }),
    [currentUser.id, currentUser.role, canEdit, canDelete],
  );

  const { table, setFilterValues, setPage } = useDataTable<User>({
    data,
    columns,
    pageCount: (onQueryChange ? pageCount : undefined) ?? -1,
    totalRows: onQueryChange ? totalCount : undefined,
    manualPagination: !!onQueryChange,
    manualSorting: !!onQueryChange,
    manualFiltering: !!onQueryChange,
    shallow: false,
    clearOnDefault: true,
    queryKeys: {},
    initialState: {
      pagination: { pageSize: 20, pageIndex: 0 },
      sorting: [{ id: "createdAt", desc: true }],
      columnVisibility: {
        select: false,
      },
    },
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
  // Track if we're in a reset operation to prevent duplicate API calls
  const isResettingRef = useRef(false);

  // Initialize from user store on mount
  useEffect(() => {
    // Initialize table state from user store filters
    const initialFilters: Record<string, string[]> = {};

    if (userStore.filters.role) {
      const roleValues = Array.isArray(userStore.filters.role)
        ? userStore.filters.role.map(r => String(r))
        : [String(userStore.filters.role)];
      initialFilters.role = roleValues;
    }

    if (userStore.filters.isActive !== undefined) {
      const isActiveValues = Array.isArray(userStore.filters.isActive)
        ? userStore.filters.isActive.map(v => String(v))
        : [String(userStore.filters.isActive)];
      initialFilters.isActive = isActiveValues;
    }

    // Set initial state in data table store
    if (userStore.filters.search) {
      setTableSearch(tableId, userStore.filters.search);
    }
    setTableManualFilters(tableId, initialFilters);

    // Reset page to 1 if there are any filters on mount
    const hasFilters = !!(userStore.filters.search ||
      userStore.filters.role ||
      userStore.filters.isActive !== undefined);
    if (hasFilters) {
      table.setPageIndex(0);
      setPage(1); // Reset URL query state
    }
  }, [userStore.filters, setTableSearch, setTableManualFilters, tableId, table, setPage]);

  // Track filter actions to determine reset button visibility
  // Use a ref to track if user has performed any filtering actions
  // Initialize based on whether we have filters in the store
  const hasPerformedFilteringRef = useRef(
    !!(userStore.filters.search || userStore.filters.role || userStore.filters.isActive !== undefined)
  );

  // Calculate if filters are currently active (for reset button visibility)
  const hasActiveFilters = useMemo(() => {
    const tableState = table.getState();

    // Check search filters
    const hasSearchFilters = searchValue.trim() !== "";

    // Check manual filter values (what user has selected)
    const hasManualFilters = (
      (manualFilterValues.role && manualFilterValues.role.length > 0) ||
      (manualFilterValues.isActive && manualFilterValues.isActive.length > 0)
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
      table.setSorting([{ id: "createdAt", desc: true }]);
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
        sortBy: activeSort?.id || "createdAt",
        sortOrder: activeSort?.desc ? "desc" : "asc",
        search: trimmedValue,
        searchField: trimmedValue ? 'email' : undefined, // Search in email field
        role: manualFilterValues.role || undefined,
        isActive: manualFilterValues.isActive || undefined,
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
    // Skip if we're in a reset operation
    if (isResettingRef.current) return;

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
        sortBy: activeSort?.id || "createdAt",
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

    // Build query params - ensure default sorting is desc for createdAt
    // Use page 1 if search or filters changed, otherwise use current page
    const targetPage = (searchChanged || filtersChanged) ? 1 : (tablePageIndex + 1);
    const queryParams: {
      page: number;
      limit: number;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
      search?: string;
      searchField?: string;
      role?: string | string[];
      isActive?: string | string[];
    } = {
      page: targetPage,
      limit: tablePageSize,
      sortBy: activeSort?.id || "createdAt",
      sortOrder: activeSort ? (activeSort.desc ? "desc" : "asc") : "desc",
    };

    // Add search value if present (from debounced handler)
    if (searchValue.trim()) {
      queryParams.search = searchValue.trim();
      queryParams.searchField = 'email'; // Search in email field
    }

    // Add manual filter values
    if (manualFilterValues.role && manualFilterValues.role.length > 0) {
      queryParams.role = manualFilterValues.role;
    }

    if (manualFilterValues.isActive && manualFilterValues.isActive.length > 0) {
      queryParams.isActive = manualFilterValues.isActive;
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

  // Loading state
  if (isLoading) {
    return <UserDataTableSkeleton />;
  }

  const emptyStateContent =
    data.length === 0 && !isLoading ? (
      shouldShowResetButton ? (
        <div className="p-12 text-center border rounded-md">
          <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          <Typography variant="title-s" className="text-foreground mb-2">
            No users found
          </Typography>
          <Typography variant="body-s" color="muted" className="text-muted-foreground mb-4">
            No users match your search criteria. Try adjusting your filters.
          </Typography>
          <button
            onClick={() => {
              isResettingRef.current = true;

              setTableSearch(tableId, "");
              if (debouncedSearchRef.current) {
                clearTimeout(debouncedSearchRef.current);
              }
              clearTableFilters(tableId);
              table.setColumnFilters([]);
              setFilterValues({ role: null, isActive: null });
              hasPerformedFilteringRef.current = false;
              table.setPageIndex(0);
              onQueryChange?.({
                page: 1,
                limit: table.getState().pagination.pageSize,
                sortBy: 'createdAt',
                sortOrder: 'desc',
                search: undefined,
                searchField: undefined,
                role: undefined,
                isActive: undefined,
              });

              setTimeout(() => {
                isResettingRef.current = false;
              }, 100);
            }}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 transition-colors"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="p-12 text-center border rounded-md">
          <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          <Typography variant="title-s" className="text-foreground mb-2">
            No users found
          </Typography>
          <Typography variant="body-s" color="muted" className="text-muted-foreground">
            No user records are available at this time.
          </Typography>
        </div>
      )
    ) : undefined;

  return (
    <DataTable table={table} emptyState={emptyStateContent}>
      <DataTableToolbar
        table={table}
        searchBar={
          <SearchBar
            placeholder="Search by email..."
            value={searchValue}
            onValueChange={handleSearchChange}
            allowClear={false}
            className="w-64"
            inputClassName="h-8"
          />
        }
        onReset={() => {
          // Set reset flag to prevent useEffect from running
          isResettingRef.current = true;

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

          // 4. Clear URL filter parameters
          setFilterValues({ role: null, isActive: null });

          // 5. Reset filtering tracking
          hasPerformedFilteringRef.current = false;

          // 6. Reset to first page
          table.setPageIndex(0);

          // 7. Trigger API call with clean state (explicitly clear search/filters)
          onQueryChange?.({
            page: 1,
            limit: table.getState().pagination.pageSize,
            sortBy: 'createdAt',
            sortOrder: 'desc',
            // Explicitly clear filters to prevent store from merging old values
            search: undefined,
            searchField: undefined,
            role: undefined,
            isActive: undefined,
          });

          // Reset the flag after a short delay
          setTimeout(() => {
            isResettingRef.current = false;
          }, 100);
        }}
        hasActiveFilters={shouldShowResetButton}
        onManualFilterChange={handleManualFilterChange}
        initialFilterValues={manualFilterValues}
      >
        {onCreateUser && currentUser.role === "admin" && (
          <Button
            onClick={onCreateUser}
            size="sm"
            className="gap-1.5"
            title="Add User"
          >
            <UserPlus className="h-2.5 w-2.5 text-foreground" />
            <span className="hidden sm:inline">Add User</span>
          </Button>
        )}
      </DataTableToolbar>
    </DataTable>
  );
}