/**
 * User Table Column Definitions
 */

"use client";

import type { ColumnDef } from "@tanstack/react-table";
import {
  User2,
  Edit,
  Trash2,
  MoreHorizontal,
  CircleDashed,
  CheckCircle2,
  XCircle,
  Shield,
  UserCog,
  BriefcaseBusiness,
  Wrench,
  User as UserIcon,
} from "lucide-react";
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
import "@/types/data-table";
import type { DataTableRowAction, Option } from "@/types/data-table";
import { USER_COLUMN_WIDTHS } from "@/shared/constants/user";

import { Typography } from "@/presentation/components/atoms";
import { USER_ROLES } from "@/shared/constants";

const ROLE_FILTER_GROUP_MANAGERS = "Administrators & managers";
const ROLE_FILTER_GROUP_STAFF = "Staff";

// Role options for filter — grouped in the faceted dropdown (order defines section order)
export const ROLE_OPTIONS: Option[] = [
  { label: "Admin", value: USER_ROLES.ADMIN, icon: Shield, group: ROLE_FILTER_GROUP_MANAGERS },
  {
    label: "Manager",
    value: USER_ROLES.MANAGER,
    icon: UserCog,
    group: ROLE_FILTER_GROUP_MANAGERS,
  },
  {
    label: "Accountant",
    value: USER_ROLES.ACCOUNTANT,
    icon: BriefcaseBusiness,
    group: ROLE_FILTER_GROUP_STAFF,
  },
  { label: "Tech", value: USER_ROLES.TECH, icon: Wrench, group: ROLE_FILTER_GROUP_STAFF },
  { label: "Agent", value: USER_ROLES.AGENT, icon: UserIcon, group: ROLE_FILTER_GROUP_STAFF },
];

// Status options for filter
export const STATUS_OPTIONS: Option[] = [
  { label: "Active", value: "true", icon: CheckCircle2 },
  { label: "Inactive", value: "false", icon: XCircle },
];

interface GetUserTableColumnsProps {
  onRowAction: (action: DataTableRowAction<User>) => void;
  currentUserId: string;
  currentUserRole: string;
  canEdit: (user: User) => boolean;
  canDelete: (user: User) => boolean;
  onToggleStatus?: (user: User) => void;
}

export function getUserTableColumns({
  onRowAction,
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
            <span className="font-medium truncate">
              {displayName}
            </span>
          </div>
        );
      },
      ...USER_COLUMN_WIDTHS.displayName,
      meta: {
        label: "Name",
      },
    },
    {
      id: "username",
      accessorKey: "username",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Username" />
      ),
      cell: ({ row }) => {
        const username = (row.getValue("username") as string) || "-";
        return (
          <div className="min-w-0 max-w-full overflow-hidden">
            <span className="block truncate text-muted-foreground" title={username !== "-" ? username : undefined}>
              {username}
            </span>
          </div>
        );
      },
      ...USER_COLUMN_WIDTHS.username,
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
      cell: ({ row }) => {
        const email = row.getValue("email") as string;
        return (
          <div className="min-w-0 max-w-full overflow-hidden">
            <span className="block truncate text-muted-foreground" title={email || undefined}>
              {email}
            </span>
          </div>
        );
      },
      ...USER_COLUMN_WIDTHS.email,
      meta: {
        label: "Email",
        absorbTableSlack: true,
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
      ...USER_COLUMN_WIDTHS.phone,
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
          <div className="flex justify-start items-center w-full">
            <RoleBadge role={role as import('@/shared/constants/auth').UserRoleType} variant="minimal" showIcon={true} />
          </div>
        );
      },
      enableColumnFilter: true,
      filterFn: (row, id, value) => {
        const role = row.getValue(id) as string;
        return Array.isArray(value) ? value.includes(role) : value === role;
      },
      ...USER_COLUMN_WIDTHS.role,
      meta: {
        label: "Role",
        variant: "multiSelect",
        options: ROLE_OPTIONS,
        icon: Shield,
        headerAlign: "start" as const,
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
          <div className="flex justify-start items-center w-full">
            <StatusBadge isActive={isActive} variant="table" showIcon />
          </div>
        );
      },
      enableColumnFilter: true,
      filterFn: (row, id, value) => {
        const isActive = row.getValue(id) as boolean;
        const statusValue = isActive ? "true" : "false";
        return Array.isArray(value) ? value.includes(statusValue) : value === statusValue;
      },
      ...USER_COLUMN_WIDTHS.isActive,
      meta: {
        label: "Status",
        variant: "multiSelect",
        options: STATUS_OPTIONS,
        icon: CircleDashed,
        headerAlign: "start" as const,
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
        const formattedDate = createdAt ? (() => {
          const d = new Date(createdAt);
          return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}/${d.getFullYear()}`;
        })() : "N/A";
        return (
          <span className="text-muted-foreground">
            {formattedDate}
          </span>
        );
      },
      ...USER_COLUMN_WIDTHS.createdAt,
      meta: {
        label: "Created At",
      },
    },
    {
      id: "actions",
      header: () => null,
      cell: ({ row }) => {
        const user = row.original;
        const showEdit = canEdit(user);
        const showDelete = canDelete(user) && user.id !== currentUserId;

        if (!showEdit && !showDelete) {
          return null;
        }

        return (
          <div className="flex w-full justify-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  aria-label="Open menu"
                  variant="ghost"
                  className="flex h-8 w-8 shrink-0 p-0 data-[state=open]:bg-muted"
                >
                  <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {showEdit ? (
                  <DropdownMenuItem
                    onClick={() => onRowAction({ row, variant: "update" })}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    <Typography variant="body-s" className="text-foreground">
                      Edit
                    </Typography>
                  </DropdownMenuItem>
                ) : null}
                {showEdit && showDelete ? <DropdownMenuSeparator /> : null}
                {showDelete ? (
                  <DropdownMenuItem
                    onClick={() => onRowAction({ row, variant: "delete" })}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    <Typography variant="body-s" className="text-destructive">
                      Delete
                    </Typography>
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
      ...USER_COLUMN_WIDTHS.actions,
      enableSorting: false,
      enableHiding: false,
      meta: {
        stickyEnd: true,
        headerAlign: "center" as const,
      },
    },
  ];
}

