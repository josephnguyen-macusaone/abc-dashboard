/**
 * User Table Column Definitions
 */

"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { User2, Edit, Trash2, MoreHorizontal } from "lucide-react";
import * as React from "react";

import { DataTableColumnHeader } from "@/presentation/components/molecules/data/data-table";
import { Button } from "@/presentation/components/atoms/primitives/button";
import { RoleBadge, StatusBadge } from "@/presentation/components/molecules/domain/user-management";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/presentation/components/atoms/primitives/dropdown-menu";
import type { User } from "@/domain/entities/user-entity";
import type { DataTableRowAction, Option } from "@/shared/types/data-table";

import { CircleDashed, CheckCircle2, XCircle, Shield, Users, UserCog } from "lucide-react";
import { Typography } from "@/presentation/components/atoms";
import { USER_ROLES } from "@/shared/constants";

// Role options for filter - derived from shared constants for consistency
export const ROLE_OPTIONS: Option[] = [
  { label: "Admin", value: USER_ROLES.ADMIN, icon: Shield },
  { label: "Manager", value: USER_ROLES.MANAGER, icon: UserCog },
  { label: "Staff", value: USER_ROLES.STAFF, icon: Users },
];

// Status options for filter
export const STATUS_OPTIONS: Option[] = [
  { label: "Active", value: "true", icon: CheckCircle2 },
  { label: "Inactive", value: "false", icon: XCircle },
];

interface GetUserTableColumnsProps {
  setRowAction: React.Dispatch<
    React.SetStateAction<DataTableRowAction<User> | null>
  >;
  currentUserId: string;
  currentUserRole: string;
  canEdit: (user: User) => boolean;
  canDelete: (user: User) => boolean;
  onToggleStatus?: (user: User) => void;
}

/**
 * Check if the current user can toggle status of the target user
 * Status can only be edited by higher-level users:
 * - Admin can edit status of manager and staff
 * - Manager can edit status of staff only
 * - Staff cannot edit status of anyone
 * - No one can edit their own status
 */
function canToggleUserStatus(currentUserId: string, currentUserRole: string, targetUser: User): boolean {
  // Cannot toggle own status
  if (currentUserId === targetUser.id) {
    return false;
  }

  // Admin can toggle manager and staff (not other admins)
  if (currentUserRole === 'admin') {
    return targetUser.role !== 'admin';
  }

  // Manager can only toggle staff
  if (currentUserRole === 'manager') {
    return targetUser.role === 'staff';
  }

  // Staff cannot toggle anyone
  return false;
}

export function getUserTableColumns({
  setRowAction,
  currentUserId,
  canEdit,
  canDelete,
}: GetUserTableColumnsProps): ColumnDef<User>[] {
  return [
    {
      id: "displayName",
      accessorFn: (row) => row.displayName || row.name || row.username || row.id,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Name" />
      ),
      cell: ({ row }) => {
        const displayName = row.getValue("displayName") as string;
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 ring-2 ring-primary/10">
              <User2 className="h-4 w-4 text-primary" />
            </div>
            <span className="font-medium truncate max-w-[200px]">
              {displayName}
            </span>
          </div>
        );
      },
      enableColumnFilter: true,
      filterFn: (row, id, value) => {
        const displayName = row.getValue(id) as string;
        return displayName.toLowerCase().includes(value.toLowerCase());
      },
      meta: {
        label: "Name",
        variant: "text",
        placeholder: "Search users...",
      },
    },
    {
      id: "username",
      accessorKey: "username",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Username" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground truncate max-w-[150px]">
          {row.getValue("username") || "-"}
        </span>
      ),
      meta: {
        label: "Username",
      },
    },
    {
      id: "email",
      accessorKey: "email",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Email" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground truncate max-w-[250px]">
          {row.getValue("email")}
        </span>
      ),
      // No filter - search by name instead
      meta: {
        label: "Email",
      },
    },
    {
      id: "phone",
      accessorKey: "phone",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Phone" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.getValue("phone") || "-"}
        </span>
      ),
      meta: {
        label: "Phone",
      },
    },
    {
      id: "role",
      accessorKey: "role",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Role" />
      ),
      cell: ({ row }) => {
        const role = row.getValue("role") as string;
        return (
          <RoleBadge role={role as any} />
        );
      },
      enableColumnFilter: true,
      filterFn: (row, id, value) => {
        const role = row.getValue(id) as string;
        return Array.isArray(value) ? value.includes(role) : value === role;
      },
      meta: {
        label: "Role",
        variant: "multiSelect",
        options: ROLE_OPTIONS,
        icon: Shield,
      },
    },
    {
      id: "isActive",
      accessorKey: "isActive",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Status" />
      ),
      cell: ({ row }) => {
        const isActive = row.getValue("isActive") as boolean;
        return (
          <StatusBadge isActive={isActive} />
        );
      },
      enableColumnFilter: true,
      filterFn: (row, id, value) => {
        const isActive = row.getValue(id) as boolean;
        const statusValue = isActive ? "true" : "false";
        return Array.isArray(value) ? value.includes(statusValue) : value === statusValue;
      },
      meta: {
        label: "Status",
        variant: "multiSelect",
        options: STATUS_OPTIONS,
        icon: CircleDashed,
      },
    },
    {
      id: "createdAt",
      accessorKey: "createdAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Created" />
      ),
      cell: ({ row }) => {
        const createdAt = row.getValue("createdAt") as Date | null;
        return (
          <span className="text-muted-foreground">
            {createdAt
              ? new Date(createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })
              : "N/A"}
          </span>
        );
      },
      // Removed enableColumnFilter and filterFn - using external DateRangeFilterCard instead
      meta: {
        label: "Created At",
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const user = row.original;
        const showEdit = canEdit(user);
        const showDelete = canDelete(user) && user.id !== currentUserId;

        if (!showEdit && !showDelete) {
          return null;
        }

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                aria-label="Open menu"
                variant="ghost"
                className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
              >
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {showEdit && (
                <DropdownMenuItem
                  onClick={() => setRowAction({ row, variant: "update" })}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  <Typography variant="body-s" className="text-foreground">Edit</Typography>
                </DropdownMenuItem>
              )}
              {showEdit && showDelete && <DropdownMenuSeparator />}
              {showDelete && (
                <DropdownMenuItem
                  onClick={() => setRowAction({ row, variant: "delete" })}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  <Typography variant="body-s" className="text-destructive">Delete</Typography>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      size: 40,
    },
  ];
}

