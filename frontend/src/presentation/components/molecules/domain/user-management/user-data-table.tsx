/**
 * UsersDataTable Component
 */

"use client";

import * as React from "react";
import { UserPlus } from "lucide-react";

import { DataTable, DataTableToolbar } from "@/presentation/components/molecules/data/data-table";
import { useDataTable } from "@/presentation/hooks";
import { Button } from "@/presentation/components/atoms/primitives/button";
import { SearchBar } from "@/presentation/components/molecules";
import { getUserTableColumns } from "./user-table-columns";
import type { User } from "@/domain/entities/user-entity";
import type { DataTableRowAction } from "@/shared/types/data-table";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  onQueryChange?: (params: {
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    createdAtFrom?: string;
    createdAtTo?: string;
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
  onQueryChange,
}: UsersDataTableProps) {
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
  const { table } = useDataTable({
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
  const lastSearchRef = useRef<string>("");
  const lastManualFiltersRef = useRef<string>("");

  // Search states for better UX control
  const [searchInput, setSearchInput] = useState(""); // What user types (immediate UI updates)
  const [searchQuery, setSearchQuery] = useState(""); // What gets sent to API (debounced)

  // Manual filter state for server-side filtering
  const [manualFilterValues, setManualFilterValues] = useState<Record<string, string[]>>({});

  // Initialize component and prevent initial API calls
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const searchParam = urlParams.get('search');
    const roleParam = urlParams.get('role');
    const isActiveParam = urlParams.get('isActive');

    if (searchParam) {
      setSearchInput(searchParam);
      setSearchQuery(searchParam);
      // Mark that filtering has been performed when initializing from URL
      hasPerformedFilteringRef.current = true;
    }

    if (roleParam) {
      const roleValues = roleParam.includes(',') ? roleParam.split(',') : [roleParam];
      setManualFilterValues(prev => ({ ...prev, role: roleValues }));
      hasPerformedFilteringRef.current = true;
    }

    if (isActiveParam) {
      const isActiveValues = isActiveParam.includes(',') ? isActiveParam.split(',') : [isActiveParam];
      setManualFilterValues(prev => ({ ...prev, isActive: isActiveValues }));
      hasPerformedFilteringRef.current = true;
    }
  }, []);

  // Track filter actions to determine reset button visibility
  // Use a ref to track if user has performed any filtering actions
  const hasPerformedFilteringRef = useRef(false);

  // Calculate if filters are currently active (for reset button visibility)
  const hasActiveFilters = useMemo(() => {
    const tableState = table.getState();

    // Check search filters: user typing OR active API search
    const hasSearchFilters = searchInput.trim() !== "" || searchQuery.trim() !== "";

    // Check manual filter values (what user has selected)
    const hasManualFilters = (
      (manualFilterValues.role && manualFilterValues.role.length > 0) ||
      (manualFilterValues.isActive && manualFilterValues.isActive.length > 0)
    );

    // Check table column filters
    const hasTableFilters = tableState.columnFilters && tableState.columnFilters.length > 0;

    // Check URL parameters for persisted filters
    const urlParams = new URLSearchParams(window.location.search);
    const hasUrlFilters = (
      urlParams.has('search') ||
      urlParams.has('role') ||
      urlParams.has('isActive') ||
      urlParams.has('filters')
    );

    // Current active state - includes both API search and typing state
    const currentlyActive = hasSearchFilters || hasManualFilters || hasTableFilters || hasUrlFilters;

    // If we detect active filters, mark that filtering has been performed
    if (currentlyActive) {
      hasPerformedFilteringRef.current = true;
    }

    return currentlyActive;
  }, [searchInput, searchQuery, manualFilterValues, table]);

  // Reset button should show if there's any search activity
  // Show when: user is typing, API search is active, or filtering has been performed
  const shouldShowResetButton = searchInput.trim() !== "" || searchQuery.trim() !== "" || hasPerformedFilteringRef.current;

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

  const handleSearchChange = useCallback((value: string) => {
    // Update input immediately for responsive UI (shows reset button)
    setSearchInput(value);
    // No automatic API calls - only on Enter key
  }, []);

  const handleSearchKeyDown = useCallback((event: React.KeyboardEvent) => {
    // Enter triggers API call immediately and prevents form submission
    if (event.key === 'Enter') {
      event.preventDefault(); // Prevent any form submission
      setSearchQuery(searchInput);
    }
  }, [searchInput]);

  // Notify parent of query changes for sorting/filtering/pagination
  useEffect(() => {
    if (!onQueryChange) return;

    const activeSort = tableSorting?.[0];

    // Check if pagination, sorting, or filtering changed
    const currentSortString = JSON.stringify(tableSorting);
    const currentFiltersString = JSON.stringify(tableColumnFilters);
    const currentSearch = searchQuery.trim(); // Use the API query state
    const currentManualFilters = JSON.stringify(manualFilterValues);

    // Initialize refs on first run
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      lastPageIndexRef.current = tablePageIndex;
      lastPageSizeRef.current = tablePageSize;
      lastSortRef.current = currentSortString;
      lastFiltersRef.current = currentFiltersString;
      lastSearchRef.current = currentSearch; // currentSearch is based on searchQuery
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
      currentSearch !== lastSearchRef.current ||
      currentManualFilters !== lastManualFiltersRef.current;

    if (!paginationChanged && !sortChanged && !filtersChanged) return;

    // Check if search has changed to reset to page 1
    const searchChanged = currentSearch !== lastSearchRef.current;
    const currentPage = searchChanged ? 1 : tablePageIndex + 1;

    // Build query params - ensure default sorting is desc for createdAt
    const queryParams: {
      page: number;
      limit: number;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
      search?: string;
      role?: string | string[];
      isActive?: string | string[];
    } = {
      page: currentPage,
      limit: tablePageSize,
      sortBy: activeSort?.id || "createdAt",
      sortOrder: activeSort ? (activeSort.desc ? "desc" : "asc") : "desc",
    };

    // Add search value if present
    if (currentSearch) {
      queryParams.search = currentSearch;
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

      // If search changed and we forced page to 1, sync the table state
      if (searchChanged && tablePageIndex !== 0) {
        // Use setTimeout to avoid state update conflicts
        setTimeout(() => table.setPageIndex(0), 0);
      }
    }

    // Update refs after API call
    lastPageIndexRef.current = tablePageIndex;
    lastPageSizeRef.current = tablePageSize;
    lastSortRef.current = currentSortString;
    lastFiltersRef.current = currentFiltersString;
    lastSearchRef.current = currentSearch;
    lastManualFiltersRef.current = currentManualFilters;
  }, [tablePageIndex, tablePageSize, tableSorting, tableColumnFilters, searchQuery, manualFilterValues, onQueryChange]);

  return (
    <DataTable table={table}>
      <DataTableToolbar
        table={table}
        searchBar={
          <SearchBar
            placeholder="Search..."
            value={searchInput}
            onValueChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
            allowClear={false}
            className="w-64"
            inputClassName="h-8"
          />
        }
        onReset={() => {
          // 1. Clear search state
          setSearchInput("");
          setSearchQuery("");

          // 2. Clear manual filter values (this will reset visual state via initialFilterValues)
          setManualFilterValues({});

          // 3. Reset filtering tracking
          hasPerformedFilteringRef.current = false;

          // 4. Reset to first page (this will trigger URL update and API call)
          table.setPageIndex(0);
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