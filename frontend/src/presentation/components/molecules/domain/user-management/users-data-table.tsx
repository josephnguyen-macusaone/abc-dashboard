/**
 * UsersDataTable Component
 */

"use client";

import * as React from "react";
import { UserPlus, Users, Trash2 } from "lucide-react";

import {
  DataTable,
  DataTableToolbar,
  DataTableSkeleton,
  DataTableActionBar,
  DataTableActionBarAction,
  DataTableActionBarSelection,
} from "@/presentation/components/molecules/data-table";
import { useDataTable } from "@/presentation/hooks";
import { Button } from "@/presentation/components/atoms/primitives/button";
import { Typography } from "@/presentation/components/atoms";
import { getUserTableColumns } from "./user-table-columns";
import type { User } from "@/domain/entities/user-entity";
import type { DataTableRowAction } from "@/shared/types/data-table";

interface UsersDataTableProps {
  data: User[];
  pageCount: number;
  currentUser: User;
  canEdit: (user: User) => boolean;
  canDelete: (user: User) => boolean;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  onBulkDelete?: (users: User[]) => void;
  onCreateUser?: () => void;
  isLoading?: boolean;
}

export function UsersDataTable({
  data,
  pageCount,
  currentUser,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  onBulkDelete,
  onCreateUser,
  isLoading = false,
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
        canEdit,
        canDelete,
      }),
    [currentUser.id, canEdit, canDelete],
  );

  const { table } = useDataTable({
    data,
    columns,
    pageCount,
    // Client-side pagination, sorting, filtering
    manualPagination: false,
    manualSorting: false,
    manualFiltering: false,
    initialState: {
      pagination: { pageSize: 10, pageIndex: 0 },
      sorting: [{ id: "createdAt", desc: true }],
      columnVisibility: {
        select: false, // Hide select checkbox column
        phone: false,
      },
    },
  });

  // Loading state
  if (isLoading) {
    return (
      <DataTableSkeleton
        columnCount={7}
        rowCount={10}
        filterCount={3}
        withPagination
        withViewOptions
      />
    );
  }

  // Empty state
  if (data.length === 0) {
    return (
      <div className="p-12 text-center border rounded-md">
        <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Users className="h-8 w-8 text-muted-foreground" />
        </div>
        <Typography variant="title-s" className="text-foreground mb-2">
          No users found
        </Typography>
        <Typography variant="body-s" color="muted" className="text-muted-foreground mb-4">
          Get started by creating your first user
        </Typography>
        {onCreateUser && currentUser.role === "admin" && (
          <Button onClick={onCreateUser} variant="outline" size="sm">
            <UserPlus className="h-4 w-4" />
            Create User
          </Button>
        )}
      </div>
    );
  }

  return (
    <DataTable
      table={table}
      showPageSizeSelector={false}
      actionBar={
        <DataTableActionBar table={table}>
          <DataTableActionBarSelection table={table} />
          {onBulkDelete && (
            <DataTableActionBarAction
              tooltip="Delete selected"
              onClick={() => {
                const selectedUsers = table
                  .getFilteredSelectedRowModel()
                  .rows.map((row) => row.original);
                onBulkDelete(selectedUsers);
              }}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </DataTableActionBarAction>
          )}
        </DataTableActionBar>
      }
    >
      <DataTableToolbar table={table}>
        {onCreateUser && currentUser.role === "admin" && (
          <Button onClick={onCreateUser} size="sm">
            <UserPlus className="h-4 w-4" />
            Add User
          </Button>
        )}
      </DataTableToolbar>
    </DataTable>
  );
}

