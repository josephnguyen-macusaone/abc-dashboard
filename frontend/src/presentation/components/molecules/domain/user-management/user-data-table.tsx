/**
 * UsersDataTable Component
 */

"use client";

import * as React from "react";
import { UserPlus, Users } from "lucide-react";

import {
  DataTable,
  DataTableToolbar,
} from "@/presentation/components/molecules/data/data-table";
import { useDataTable } from "@/presentation/hooks";
import { useDebouncedCallback } from "@/presentation/hooks/use-debounced-callback";
import { Button } from "@/presentation/components/atoms/primitives/button";
import { Typography } from "@/presentation/components/atoms";
import { SearchBar } from "@/presentation/components/molecules";
import { getUserTableColumns } from "./user-table-columns";
import type { User } from "@/domain/entities/user-entity";
import type { DataTableRowAction } from "@/shared/types/data-table";

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
  }) => void;
}

export function UsersDataTable({
  data,
  pageCount: initialPageCount = -1, // Let table auto-calculate for client-side pagination
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
  const [rowAction, setRowAction] =
    React.useState<DataTableRowAction<User> | null>(null);

  // Handle row actions
  React.useEffect(() => {
    if (rowAction) {
      if (rowAction.variant === "update") {
        onEdit(rowAction.row.original);
      } else if (rowAction.variant === "delete") {
        onDelete(rowAction.row.original);
      }
      setRowAction(null);
    }
  }, [rowAction, onEdit, onDelete]);

  const columns = React.useMemo(
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

  const [currentPageSize, setCurrentPageSize] = React.useState(20);

  const pageCount = React.useMemo(() =>
    Math.ceil(data.length / currentPageSize),
    [data.length, currentPageSize]
  );

  // Track the last query to prevent infinite loops
  const lastQueryRef = React.useRef<string>("");
  const hasInitializedRef = React.useRef(false);

  // Search state (for email search) - debounced to avoid excessive API calls
  const [searchInput, setSearchInput] = React.useState("");
  const [searchValue, setSearchValue] = React.useState("");

  // Manual filter state for server-side filtering
  const [manualFilterValues, setManualFilterValues] = React.useState<Record<string, string[]>>({});


  // Handle manual filter changes
  const handleManualFilterChange = React.useCallback((columnId: string, values: string[]) => {
    setManualFilterValues(prev => ({
      ...prev,
      [columnId]: values
    }));
  }, []);

  const { table } = useDataTable({
    data,
    columns,
    pageCount: onQueryChange ? initialPageCount : pageCount, // Use server pageCount when onQueryChange is provided
    totalRows: onQueryChange ? totalCount : undefined, // Use totalCount for manual pagination
    manualPagination: !!onQueryChange,
    manualSorting: !!onQueryChange,
    manualFiltering: !!onQueryChange, // Enable manual filtering for server-side filtering
    initialState: {
      pagination: { pageSize: 20, pageIndex: 0 },
      sorting: [{ id: "createdAt", desc: true }],
      columnVisibility: {
        select: false,
      },
    },
  } as any); // Temporary type assertion to bypass TypeScript issue

  // Create stable references to table state to avoid infinite re-renders
  const tableState = React.useMemo(() => table.getState(), [
    table.getState().pagination.pageIndex,
    table.getState().pagination.pageSize,
    table.getState().sorting,
    table.getState().columnFilters,
  ]);

  // Debounce the search value update (500ms delay)
  const debouncedSetSearch = useDebouncedCallback((value: string) => {
    setSearchValue(value);
    // Reset to page 1 when searching
    table.setPageIndex(0);
  }, 500);

  const handleSearchChange = React.useCallback((value: string) => {
    setSearchInput(value);
    debouncedSetSearch(value);
  }, [debouncedSetSearch]);

  // Update page size when table page size changes
  React.useEffect(() => {
    const tablePageSize = table.getState().pagination.pageSize;
    if (tablePageSize !== currentPageSize) {
      setCurrentPageSize(tablePageSize);
    }
  }, [table, currentPageSize]);

  // Notify parent of query changes when manual modes are enabled
  React.useEffect(() => {
    if (!onQueryChange) return;

    const { pagination: pg, sorting: sort, columnFilters } = tableState;
    const activeSort = sort?.[0];

    // Use manual filter values for server-side filtering
    const filters: Record<string, any> = { ...manualFilterValues };

    // Add search value if present
    if (searchValue.trim()) {
      filters.email = searchValue.trim();
    }


    const queryParams: {
      page: number;
      limit: number;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
      [key: string]: any; // Allow dynamic filter keys
    } = {
      page: pg?.pageIndex ? pg.pageIndex + 1 : 1,
      limit: pg?.pageSize ?? 20,
      sortBy: activeSort?.id,
      sortOrder: activeSort?.desc ? "desc" : "asc",
      ...filters, // Include all column filter values as-is
    };

    // Create a stable string representation for comparison
    const queryString = JSON.stringify(queryParams);

    // Only call onQueryChange if the query actually changed
    // And skip the initial render to avoid duplicate calls
    if (queryString !== lastQueryRef.current && hasInitializedRef.current) {
      lastQueryRef.current = queryString;
      onQueryChange(queryParams);
    }

    // Mark as initialized after first run
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      lastQueryRef.current = queryString;
    }
  }, [tableState, searchValue, onQueryChange]);

  // Loading is now handled at the UserManagement level

  return (
    <DataTable table={table}>
      <DataTableToolbar
        table={table}
        searchBar={
          <SearchBar
            placeholder="Search by email..."
            value={searchInput}
            onValueChange={handleSearchChange}
            allowClear
            className="w-64"
            inputClassName="h-8"
          />
        }
        onReset={() => {
          // For server-side filtering, clear everything

          // 1. Clear search state
          setSearchInput("");
          debouncedSetSearch("");
          setSearchValue("");

          // 2. Clear manual filter values (this will reset visual state via initialFilterValues)
          setManualFilterValues({});

          // 3. Reset to first page
          table.setPageIndex(0);
        }}
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

