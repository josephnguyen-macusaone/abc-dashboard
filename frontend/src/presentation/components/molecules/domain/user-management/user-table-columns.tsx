/**
 * User Table Column Definitions
 * Uses tablecn pattern with TanStack Table
 */

"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { User2, Edit, Trash2, MoreHorizontal } from "lucide-react";
import * as React from "react";

import { DataTableColumnHeader } from "@/presentation/components/molecules/data-table";
import { Badge } from "@/presentation/components/atoms/primitives/badge";
import { Button } from "@/presentation/components/atoms/primitives/button";
import { RoleBadge, StatusBadge } from "@/presentation/components/molecules/domain/user-management";
import { Checkbox } from "@/presentation/components/atoms/forms/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/presentation/components/atoms/primitives/dropdown-menu";
import type { User } from "@/domain/entities/user-entity";
import type { DataTableRowAction, Option } from "@/shared/types/data-table";

import { CircleDashed, CheckCircle2, XCircle, Shield, Users, UserCog, CalendarDays } from "lucide-react";

// Role options for filter
export const ROLE_OPTIONS: Option[] = [
  { label: "Admin", value: "admin", icon: Shield },
  { label: "Manager", value: "manager", icon: UserCog },
  { label: "Staff", value: "staff", icon: Users },
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
  canEdit: (user: User) => boolean;
  canDelete: (user: User) => boolean;
}

export function getUserTableColumns({
  setRowAction,
  currentUserId,
  canEdit,
  canDelete,
}: GetUserTableColumnsProps): ColumnDef<User>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          aria-label="Select all"
          className="translate-y-0.5"
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          aria-label="Select row"
          className="translate-y-0.5"
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 40,
    },
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
      size: 220,
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
      size: 250,
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
      size: 130,
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
      size: 100,
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
      size: 100,
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
      size: 130,
      enableColumnFilter: true,
      filterFn: (row, id, value) => {
        if (!value) return true;
        const createdAt = row.getValue(id) as Date | null;
        if (!createdAt) return false;
        const rowDate = new Date(createdAt);
        const filterDate = new Date(value as string);
        return rowDate >= filterDate;
      },
      meta: {
        label: "Created At",
        variant: "date",
        icon: CalendarDays,
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
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              )}
              {showEdit && showDelete && <DropdownMenuSeparator />}
              {showDelete && (
                <DropdownMenuItem
                  onClick={() => setRowAction({ row, variant: "delete" })}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
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

