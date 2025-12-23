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

  // Create the table instance using the data table hook (must be declared before use)
  const { table, setFilterValues } = useDataTable({
    data,
    columns,
    pageCount: onQueryChange ? pageCount : undefined,
    totalRows: onQueryChange ? totalCount : undefined,
    manualPagination: !!onQueryChange,
    manualSorting: !!onQueryChange,
    manualFiltering: !!onQueryChange,
    shallow: false,
    clearOnDefault: true, // Remove default values from URL
    queryKeys: {},
    initialState: {
      pagination: { pageSize: 20, pageIndex: 0 },
      sorting: [{ id: "createdAt", desc: true }],
      columnVisibility: {
        select: false,
      },
    },
  } as any); // Temporary type assertion to bypass TypeScript issue

  // Track the last query to prevent infinite loops
  const lastQueryRef = useRef<string>("");
  const hasInitializedRef = useRef(false);
  // Track last values for changes
  const lastPageIndexRef = useRef<number>(0);
  const lastPageSizeRef = useRef<number>(20);
  const lastSortRef = useRef<string>("");
  const lastFiltersRef = useRef<string>("");
  const lastManualFiltersRef = useRef<string>("");
  // Track if we're in a reset operation to prevent duplicate API calls
  const isResettingRef = useRef(false);

  // Initialize search value from store filters (like license management)
  const [searchValue, setSearchValue] = useState(() => userStore.filters.search || "");

  // Initialize manual filter values from store
  const [manualFilterValues, setManualFilterValues] = useState<Record<string, string[]>>(() => {
    const initial: Record<string, string[]> = {};

    // Initialize role filter from store
    if (userStore.filters.role) {
      const roleValues = Array.isArray(userStore.filters.role)
        ? userStore.filters.role.map(r => String(r))
        : [String(userStore.filters.role)];
      initial.role = roleValues;
    }

    // Initialize isActive filter from store
    if (userStore.filters.isActive !== undefined) {
      const isActiveValues = Array.isArray(userStore.filters.isActive)
        ? userStore.filters.isActive.map(v => String(v))
        : [String(userStore.filters.isActive)];
      initial.isActive = isActiveValues;
    }

    return initial;
  });

  // Sync search value with store filters when they change
  useEffect(() => {
    if (userStore.filters.search !== undefined && userStore.filters.search !== searchValue) {
      setSearchValue(userStore.filters.search);
      if (userStore.filters.search) {
        hasPerformedFilteringRef.current = true;
      }
    }
  }, [userStore.filters.search]);

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
    setManualFilterValues(prev => ({
      ...prev,
      [columnId]: values
    }));
  }, []);

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
    // Update input immediately for responsive UI
    setSearchValue(value);
    hasPerformedFilteringRef.current = true;

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
        search: value,
        searchField: value ? 'email' : undefined, // Search in email field
        role: manualFilterValues.role || undefined,
        isActive: manualFilterValues.isActive || undefined,
      });
    }, 500); // 500ms debounce
  }, [table, onQueryChange, manualFilterValues]);

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

    if (!paginationChanged && !sortChanged && !filtersChanged) return;

    // Build query params - ensure default sorting is desc for createdAt
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
      page: tablePageIndex + 1,
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
    lastPageIndexRef.current = tablePageIndex;
    lastPageSizeRef.current = tablePageSize;
    lastSortRef.current = currentSortString;
    lastFiltersRef.current = currentFiltersString;
    lastManualFiltersRef.current = currentManualFilters;
  }, [tablePageIndex, tablePageSize, tableSorting, tableColumnFilters, searchValue, manualFilterValues, onQueryChange, table]);

  // Loading state
  if (isLoading) {
    return <UserDataTableSkeleton />;
  }

  // Empty state with reset button if filters are active
  if (data.length === 0 && !isLoading && shouldShowResetButton) {
    return (
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

            setSearchValue("");
            if (debouncedSearchRef.current) {
              clearTimeout(debouncedSearchRef.current);
            }
            setManualFilterValues({});
            table.setColumnFilters([]);
            setFilterValues({ role: null, isActive: null });
            hasPerformedFilteringRef.current = false;
            table.setPageIndex(0);
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

            setTimeout(() => {
              isResettingRef.current = false;
            }, 100);
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
          <UserCircle className="h-8 w-8 text-muted-foreground" />
        </div>
        <Typography variant="title-s" className="text-foreground mb-2">
          No users found
        </Typography>
        <Typography variant="body-s" color="muted" className="text-muted-foreground">
          No user records are available at this time.
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
          setSearchValue("");

          // Clear debounce timeout
          if (debouncedSearchRef.current) {
            clearTimeout(debouncedSearchRef.current);
          }

          // 2. Clear manual filter values (this will reset visual state via initialFilterValues)
          setManualFilterValues({});

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