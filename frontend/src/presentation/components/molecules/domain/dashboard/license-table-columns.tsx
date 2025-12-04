/**
 * License Table Column Definitions
 * Uses tablecn pattern with TanStack Table
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
import { DataTableColumnHeader } from "@/presentation/components/molecules/data-table";
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
      id: "id",
      accessorKey: "id",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="No." />
      ),
      cell: ({ row }) => (
        <span className="font-medium text-center">{row.getValue("id")}</span>
      ),
      size: 70,
      enableColumnFilter: false,
    },
    {
      id: "dbA",
      accessorKey: "dbA",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Database" />
      ),
      cell: ({ row }) => (
        <span className="font-medium truncate max-w-[150px]">
          {row.getValue("dbA")}
        </span>
      ),
      size: 150,
      enableColumnFilter: true,
      filterFn: (row, id, value) => {
        const dbA = row.getValue(id) as string;
        return dbA.toLowerCase().includes(value.toLowerCase());
      },
      meta: {
        label: "Database",
        variant: "text",
        placeholder: "Search licenses...",
      },
    },
    {
      id: "zip",
      accessorKey: "zip",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Zip Code" />
      ),
      cell: ({ row }) => (
        <span className="text-center">{row.getValue("zip")}</span>
      ),
      size: 100,
      meta: {
        label: "Zip Code",
      },
    },
    {
      id: "startDay",
      accessorKey: "startDay",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Start Date" />
      ),
      cell: ({ row }) => {
        const date = row.getValue("startDay") as string;
        return (
          <span className="text-center">
            {new Date(date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        );
      },
      size: 120,
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
      size: 120,
      enableColumnFilter: true,
      filterFn: (row, id, value) => {
        const plan = row.getValue(id) as string;
        return Array.isArray(value) ? value.includes(plan) : value === plan;
      },
      meta: {
        label: "Plan",
        variant: "multiSelect",
        options: PLAN_OPTIONS,
        icon: Briefcase,
      },
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
          <span className="capitalize text-center">{term}</span>
        );
      },
      size: 100,
      enableColumnFilter: true,
      filterFn: (row, id, value) => {
        const term = row.getValue(id) as string;
        return Array.isArray(value) ? value.includes(term) : value === term;
      },
      meta: {
        label: "Term",
        variant: "multiSelect",
        options: TERM_OPTIONS,
        icon: CalendarRange,
      },
    },
    {
      id: "lastPayment",
      accessorKey: "lastPayment",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Last Payment" />
      ),
      cell: ({ row }) => (
        <span className="text-right font-mono">
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
        return (
          <span className="text-center text-sm">
            {new Date(date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "2-digit",
            })}
          </span>
        );
      },
      size: 120,
      filterFn: (row, id, value) => {
        if (!value) return true;
        const date = new Date(row.getValue(id) as string);
        const filterDate = new Date(value as string);
        return date.toDateString() === filterDate.toDateString();
      },
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
        <span className="text-right font-mono">
          {row.getValue("smsPurchased")}
        </span>
      ),
      size: 140,
    },
    {
      id: "smsSent",
      accessorKey: "smsSent",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="SMS Sent" />
      ),
      cell: ({ row }) => (
        <span className="text-right font-mono">
          {row.getValue("smsSent")}
        </span>
      ),
      size: 110,
    },
    {
      id: "smsBalance",
      accessorKey: "smsBalance",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="SMS Balance" />
      ),
      cell: ({ row }) => (
        <span className="text-right font-mono">
          {row.getValue("smsBalance")}
        </span>
      ),
      size: 120,
    },
    {
      id: "agents",
      accessorKey: "agents",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Agents" />
      ),
      cell: ({ row }) => (
        <span className="text-center">{row.getValue("agents")}</span>
      ),
      size: 90,
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
      size: 200,
    },
    {
      id: "agentsCost",
      accessorKey: "agentsCost",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Agents Cost" />
      ),
      cell: ({ row }) => (
        <span className="text-right font-mono">
          ${row.getValue("agentsCost")}
        </span>
      ),
      size: 130,
    },
    {
      id: "notes",
      accessorKey: "notes",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Notes" />
      ),
      cell: ({ row }) => (
        <span className="truncate max-w-[200px]" title={row.getValue("notes")}>
          {row.getValue("notes")}
        </span>
      ),
      size: 180,
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

