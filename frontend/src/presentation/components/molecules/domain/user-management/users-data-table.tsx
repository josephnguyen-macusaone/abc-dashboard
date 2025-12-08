/**
 * UsersDataTable Component
 */

"use client";

import * as React from "react";
import { UserPlus, Users } from "lucide-react";

import {
  DataTable,
  DataTableToolbar,
} from "@/presentation/components/molecules/data-table";
import { useDataTable } from "@/presentation/hooks";
import { Button } from "@/presentation/components/atoms/primitives/button";
import { Typography } from "@/presentation/components/atoms";
import { getUserTableColumns } from "./user-table-columns";
import type { User } from "@/domain/entities/user-entity";
import type { DataTableRowAction } from "@/shared/types/data-table";

interface UsersDataTableProps {
  data: User[];
  pageCount?: number;
  currentUser: User;
  canEdit: (user: User) => boolean;
  canDelete: (user: User) => boolean;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  onCreateUser?: () => void;
  isLoading?: boolean;
}

export function UsersDataTable({
  data,
  pageCount: initialPageCount = -1, // Let table auto-calculate for client-side pagination
  currentUser,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
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

  const { table } = useDataTable({
    data,
    columns,
    pageCount,
    initialState: {
      pagination: { pageSize: 20, pageIndex: 0 },
      sorting: [{ id: "createdAt", desc: true }],
      columnVisibility: {
        select: false,
      },
    },
  });

  // Update page size when table page size changes
  React.useEffect(() => {
    const tablePageSize = table.getState().pagination.pageSize;
    if (tablePageSize !== currentPageSize) {
      setCurrentPageSize(tablePageSize);
    }
  }, [table.getState().pagination.pageSize, currentPageSize]);

  // Loading is now handled at the UserManagement level

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
    <DataTable table={table} >
      <DataTableToolbar table={table}>
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

