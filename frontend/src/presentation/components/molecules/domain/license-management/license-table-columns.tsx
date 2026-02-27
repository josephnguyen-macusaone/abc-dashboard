/**
 * License Table Column Definitions
 */

"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { CircleDashed, Briefcase, CalendarRange } from "lucide-react";
import { Badge } from "@/presentation/components/atoms/primitives/badge";
import { Checkbox } from "@/presentation/components/atoms/forms/checkbox";
import { DataTableColumnHeader } from "@/presentation/components/molecules/data/data-table";
import { LicenseStatusBadge, LICENSE_PLAN_OPTIONS_WITH_ICONS } from "@/presentation/components/molecules/domain/license-management/badges";
import { PLAN_MODULE_OPTIONS as PLAN_MODULE_OPTIONS_FROM_CONSTANTS } from "@/shared/constants/license";
import { cn } from "@/shared/helpers";
import type { LicenseRecord, LicenseStatus, LicenseTerm } from "@/types";
import { LICENSE_STATUS_OPTIONS_WITH_ICONS } from "@/presentation/components/molecules/domain/license-management/badges";

// Status options for filter - Filter to only show Active and Cancelled
export const STATUS_OPTIONS = LICENSE_STATUS_OPTIONS_WITH_ICONS.filter(
  (option) => option.value === "active" || option.value === "cancel"
);

// Plan options for filter - Filter to only show Basic and Premium (Pro)
export const PLAN_OPTIONS = LICENSE_PLAN_OPTIONS_WITH_ICONS.filter(
  (option) => option.value === "Basic" || option.value === "Premium"
);

// Plan module options for filter (Basic, Print Check, Staff Performance, Unlimited SMS)
export const PLAN_MODULE_OPTIONS = PLAN_MODULE_OPTIONS_FROM_CONSTANTS;

// Term options for filter
export const TERM_OPTIONS = [
  { label: "Monthly", value: "monthly" },
  { label: "Yearly", value: "yearly" },
];


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
      size: 48,
      minSize: 40,
    },
    {
      id: "dba",
      accessorKey: "dba",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="DBA" />
      ),
      cell: ({ row }) => (
        <span className="text-sm font-medium truncate max-w-[200px]">
          {row.getValue("dba")}
        </span>
      ),
      enableColumnFilter: false,
      enableSorting: false,
      size: 200,
      minSize: 80,
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
      size: 130,
      minSize: 90,
      meta: {
        label: "Zip Code",
      },
    },
    {
      id: "startsAt",
      accessorKey: "startsAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Activate Date" />
      ),
      size: 160,
      minSize: 120,
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
        label: "Activate Date",
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
          <LicenseStatusBadge
            status={status}
            variant="minimal"
            showIcon={true}
          />
        );
      },
      enableColumnFilter: true,
      enableSorting: false,
      filterFn: (row, id, value) => {
        const status = row.getValue(id) as string;
        return Array.isArray(value) ? value.includes(status) : value === status;
      },
      size: 130,
      minSize: 90,
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
      cell: ({ row }) => {
        const plan = row.getValue("plan") as string;
        const modules = plan ? plan.split(',').map((s) => s.trim()).filter(Boolean) : [];
        if (modules.length === 0) return <span className="text-muted-foreground text-sm">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {modules.map((m) => (
              <Badge key={m} variant="secondary" className="text-xs">
                {m}
              </Badge>
            ))}
          </div>
        );
      },
      enableColumnFilter: true,
      enableSorting: false,
      filterFn: (row, id, value) => {
        const plan = row.getValue(id) as string;
        const modules = plan ? plan.split(',').map((s) => s.trim()) : [];
        return Array.isArray(value) ? value.some((v) => modules.includes(v)) : modules.includes(value);
      },
      size: 160,
      minSize: 80,
      meta: {
        label: "Plan",
        variant: "multiSelect",
        options: PLAN_MODULE_OPTIONS,
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
        const term = (row.getValue("term") as LicenseTerm) || "monthly";
        const display = term === "yearly" ? "Yearly" : "Monthly";
        return (
          <span className="text-sm text-center">{display}</span>
        );
      },
      size: 150,
      minSize: 80,
      enableColumnFilter: true,
      enableSorting: false,
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
      id: "dueDate",
      accessorKey: "dueDate",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Due Date" />
      ),
      cell: ({ row }) => {
        const term = row.getValue("term") as LicenseTerm;
        const dueDate = row.getValue("dueDate") as string | undefined;
        const hasDueDate = term === "yearly" && dueDate;
        return (
          <span className={cn("text-sm text-center", !hasDueDate && "text-muted-foreground")}>
            {hasDueDate
              ? (() => {
                const d = new Date(dueDate);
                return `${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getDate().toString().padStart(2, "0")}/${d.getFullYear()}`;
              })()
              : "—"}
          </span>
        );
      },
      size: 150,
      minSize: 100,
      meta: {
        label: "Due Date",
        variant: "date",
      },
    },
    {
      id: "lastPayment",
      accessorKey: "lastPayment",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Monthly Fee" />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-right">
          ${row.getValue("lastPayment")}
        </span>
      ),
      size: 160,
      minSize: 110,
      filterFn: (row, id, value) => {
        if (!value) return true;
        const payment = row.getValue(id) as number;
        return payment === Number(value);
      },
      meta: {
        label: "Monthly Fee",
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
      size: 160,
      minSize: 110,
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
      size: 170,
      minSize: 130,
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
      size: 150,
      minSize: 100,
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
      size: 160,
      minSize: 120,
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
      size: 120,
      minSize: 80,
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
        const raw = row.getValue("agentsName");
        const agentsName = typeof raw === 'string' ? raw : '';
        const hasNames = agentsName.trim().length > 0;
        const display = hasNames ? agentsName : "No Agent";
        return (
          <span
            className={hasNames ? "truncate max-w-[280px]" : "text-muted-foreground"}
            title={hasNames ? display : undefined}
          >
            {display}
          </span>
        );
      },
      size: 280,
      minSize: 130,
      enableColumnFilter: false,
      enableSorting: false,
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
      size: 160,
      minSize: 120,
      enableSorting: false,
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
        <span className="text-sm truncate max-w-[300px]" title={row.getValue("notes")}>
          {row.getValue("notes")}
        </span>
      ),
      size: 300,
      minSize: 100,
      enableSorting: false,
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

