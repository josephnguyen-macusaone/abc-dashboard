/**
 * License Table Column Definitions
 */

"use client";

import type { ColumnDef } from "@tanstack/react-table";
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  CircleDashed,
  Briefcase,
  CalendarRange,
  CalendarDays,
} from "lucide-react";
import { Badge } from "@/presentation/components/atoms/primitives/badge";
import { Checkbox } from "@/presentation/components/atoms/forms/checkbox";
import { DataTableColumnHeader } from "@/presentation/components/molecules/data/data-table";
import type { LicenseRecord, LicenseStatus, LicenseTerm } from "@/shared/types";

// Status options for filter
export const STATUS_OPTIONS = [
  { label: "Active", value: "active", icon: CheckCircle2 },
  { label: "Cancelled", value: "cancel", icon: XCircle },
  { label: "Pending", value: "pending", icon: Clock },
  { label: "Expired", value: "expired", icon: AlertCircle },
];

// Plan options for filter
export const PLAN_OPTIONS = [
  { label: "Basic", value: "Basic" },
  { label: "Premium", value: "Premium" },
  { label: "Enterprise", value: "Enterprise" },
];

// Term options for filter
export const TERM_OPTIONS = [
  { label: "Monthly", value: "monthly" },
  { label: "Yearly", value: "yearly" },
];

function getStatusVariant(status: LicenseStatus) {
  switch (status) {
    case "active":
      return "active";
    case "cancel":
      return "destructive";
    case "pending":
      return "warning";
    case "expired":
      return "secondary";
    default:
      return "secondary";
  }
}

export function getLicenseTableColumns(): ColumnDef<LicenseRecord>[] {
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
      id: "dba",
      accessorKey: "dba",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="DBA" />
      ),
      cell: ({ row }) => (
        <span className="text-sm font-medium truncate max-w-[150px]">
          {row.getValue("dba")}
        </span>
      ),
      enableColumnFilter: false,
      size: 280,
    },
    {
      id: "zip",
      accessorKey: "zip",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Zip Code" />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-center">{row.getValue("zip")}</span>
      ),
      meta: {
        label: "Zip Code",
      },
    },
    {
      id: "startsAt",
      accessorKey: "startsAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Start Date" />
      ),
      cell: ({ row }) => {
        const date = row.getValue("startsAt") as string;
        const formattedDate = date ? (() => {
          const d = new Date(date);
          return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}/${d.getFullYear()}`;
        })() : '';
        return (
          <span className="text-sm text-center">
            {formattedDate}
          </span>
        );
      },
      filterFn: (row, id, value) => {
        if (!value) return true;
        const date = new Date(row.getValue(id) as string);
        const filterDate = new Date(value as string);
        return date.toDateString() === filterDate.toDateString();
      },
      meta: {
        label: "Start Date",
        variant: "date",
      },
    },
    {
      id: "status",
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Status" />
      ),
      cell: ({ row }) => {
        const status = row.getValue("status") as LicenseStatus;
        return (
          <Badge variant={getStatusVariant(status)} className="capitalize text-center">
            {status}
          </Badge>
        );
      },
      size: 110,
      enableColumnFilter: true,
      filterFn: (row, id, value) => {
        const status = row.getValue(id) as string;
        return Array.isArray(value) ? value.includes(status) : value === status;
      },
      meta: {
        label: "Status",
        variant: "multiSelect",
        options: STATUS_OPTIONS,
        icon: CircleDashed,
      },
    },
    {
      id: "plan",
      accessorKey: "plan",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Plan" />
      ),
      cell: ({ row }) => (
        <Badge variant="outline">{row.getValue("plan")}</Badge>
      ),
      enableColumnFilter: false,
      size: 120,
    },
    {
      id: "term",
      accessorKey: "term",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Term" />
      ),
      cell: ({ row }) => {
        const term = row.getValue("term") as LicenseTerm;
        return (
          <span className="text-sm capitalize text-center">{term}</span>
        );
      },
      size: 100,
      enableColumnFilter: false,
    },
    {
      id: "lastPayment",
      accessorKey: "lastPayment",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Last Payment" />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-right">
          ${row.getValue("lastPayment")}
        </span>
      ),
      size: 140,
      filterFn: (row, id, value) => {
        if (!value) return true;
        const payment = row.getValue(id) as number;
        return payment === Number(value);
      },
      meta: {
        label: "Last Payment",
        variant: "number",
        unit: "$",
      },
    },
    {
      id: "lastActive",
      accessorKey: "lastActive",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Last Active" />
      ),
      cell: ({ row }) => {
        const date = row.getValue("lastActive") as string;
        const formattedDate = date ? (() => {
          const d = new Date(date);
          return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}/${d.getFullYear()}`;
        })() : '';
        return (
          <span className="text-sm text-center">
            {formattedDate}
          </span>
        );
      },
      filterFn: (row, id, value) => {
        if (!value) return true;
        const date = new Date(row.getValue(id) as string);
        const filterDate = new Date(value as string);
        return date.toDateString() === filterDate.toDateString();
      },
      size: 140,
      meta: {
        label: "Last Active",
        variant: "date",
      },
    },
    {
      id: "smsPurchased",
      accessorKey: "smsPurchased",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="SMS Purchased" />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-right">
          {row.getValue("smsPurchased")}
        </span>
      ),
      size: 140,
      meta: {
        label: "SMS Purchased",
      },
    },
    {
      id: "smsSent",
      accessorKey: "smsSent",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="SMS Sent" />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-right">
          {row.getValue("smsSent")}
        </span>
      ),
      size: 110,
      meta: {
        label: "SMS Sent",
      },
    },
    {
      id: "smsBalance",
      accessorKey: "smsBalance",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="SMS Balance" />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-right">
          {row.getValue("smsBalance")}
        </span>
      ),
      meta: {
        label: "SMS Balance",
      },
    },
    {
      id: "agents",
      accessorKey: "agents",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Agents" />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-center">{row.getValue("agents")}</span>
      ),
      size: 90,
      meta: {
        label: "Agents",
      },
    },
    {
      id: "agentsName",
      accessorKey: "agentsName",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Agents Name" />
      ),
      cell: ({ row }) => {
        const names = row.getValue("agentsName") as string[];
        return (
          <span className="truncate max-w-[220px]" title={names.join(", ")}>
            {names.join(", ")}
          </span>
        );
      },
      size: 250,
      meta: {
        label: "Agents Name",
      },
    },
    {
      id: "agentsCost",
      accessorKey: "agentsCost",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Agents Cost" />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-right">
          ${row.getValue("agentsCost")}
        </span>
      ),
      size: 140,
      meta: {
        label: "Agents Cost",
      },
    },
    {
      id: "notes",
      accessorKey: "notes",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Notes" />
      ),
      cell: ({ row }) => (
        <span className="text-sm truncate max-w-[200px]" title={row.getValue("notes")}>
          {row.getValue("notes")}
        </span>
      ),
      size: 250,
      filterFn: (row, id, value) => {
        const notes = row.getValue(id) as string;
        return notes.toLowerCase().includes(value.toLowerCase());
      },
      meta: {
        label: "Notes",
        variant: "text",
        placeholder: "Search notes...",
      },
    },
  ];
}

