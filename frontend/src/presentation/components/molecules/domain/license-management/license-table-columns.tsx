/**
 * License Table Column Definitions
 */

"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { CircleDashed, Briefcase, CalendarRange } from "lucide-react";
import { Checkbox } from "@/presentation/components/atoms/forms/checkbox";
import { DataTableColumnHeader } from "@/presentation/components/molecules/data/data-table";
import { LicenseStatusBadge, LICENSE_PLAN_OPTIONS_WITH_ICONS } from "@/presentation/components/molecules/domain/license-management/badges";
import { LICENSE_COLUMN_WIDTHS, PLAN_MODULE_OPTIONS as PLAN_MODULE_OPTIONS_FROM_CONSTANTS } from "@/shared/constants/license";
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
      ...LICENSE_COLUMN_WIDTHS.select,
    },
    {
      id: "dba",
      accessorKey: "dba",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="DBA" />
      ),
      cell: ({ row }) => (
        <span className="text-sm font-medium">
          {row.getValue("dba")}
        </span>
      ),
      enableColumnFilter: false,
      enableSorting: false,
      ...LICENSE_COLUMN_WIDTHS.dba,
      meta: {
        label: "DBA",
        headerAlign: "start" as const,
      },
    },
    {
      id: "zip",
      accessorKey: "zip",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Zip Code" />
      ),
      cell: ({ row }) => (
        <span className="text-sm">{row.getValue("zip")}</span>
      ),
      ...LICENSE_COLUMN_WIDTHS.zip,
      meta: {
        label: "Zip Code",
        headerAlign: "start" as const,
      },
    },
    {
      id: "startsAt",
      accessorKey: "startsAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Activate Date" />
      ),
      ...LICENSE_COLUMN_WIDTHS.startsAt,
      cell: ({ row }) => {
        const date = row.getValue("startsAt") as string;
        const formattedDate = date ? (() => {
          const d = new Date(date);
          return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}/${d.getFullYear()}`;
        })() : '';
        return <span className="text-sm">{formattedDate}</span>;
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
        headerAlign: "start" as const,
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
          <div className="flex justify-center items-center w-full">
            <LicenseStatusBadge
              status={status}
              variant="minimal"
              showIcon={true}
            />
          </div>
        );
      },
      enableColumnFilter: true,
      enableSorting: false,
      filterFn: (row, id, value) => {
        const status = row.getValue(id) as string;
        return Array.isArray(value) ? value.includes(status) : value === status;
      },
      ...LICENSE_COLUMN_WIDTHS.status,
      meta: {
        label: "Status",
        variant: "multiSelect",
        options: STATUS_OPTIONS,
        icon: CircleDashed,
        headerAlign: "center" as const,
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
        if (modules.length === 0) return (
          <div className="flex justify-start items-center w-full py-1">
            <span className="text-muted-foreground text-xs">—</span>
          </div>
        );
        return (
          <div className="flex justify-start items-center w-full py-1">
            <span className="text-sm text-start">{modules.join(', ')}</span>
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
      ...LICENSE_COLUMN_WIDTHS.plan,
      meta: {
        label: "Plan",
        variant: "multiSelect",
        options: PLAN_MODULE_OPTIONS,
        icon: Briefcase,
        headerAlign: "start" as const,
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
          <span className="text-sm text-start">{display}</span>
        );
      },
      ...LICENSE_COLUMN_WIDTHS.term,
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
        headerAlign: "start" as const,
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
          <span className={cn("text-sm", !hasDueDate && "text-muted-foreground")}>
            {hasDueDate
              ? (() => {
                const d = new Date(dueDate);
                return `${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getDate().toString().padStart(2, "0")}/${d.getFullYear()}`;
              })()
              : "—"}
          </span>
        );
      },
      ...LICENSE_COLUMN_WIDTHS.dueDate,
      meta: {
        label: "Due Date",
        variant: "date",
        headerAlign: "start" as const,
      },
    },
    {
      id: "lastPayment",
      accessorKey: "lastPayment",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Monthly Fee" />
      ),
      cell: ({ row }) => (
        <div className="w-full text-right">
          <span className="text-sm">${row.getValue("lastPayment")}</span>
        </div>
      ),
      ...LICENSE_COLUMN_WIDTHS.lastPayment,
      filterFn: (row, id, value) => {
        if (!value) return true;
        const payment = row.getValue(id) as number;
        return payment === Number(value);
      },
      meta: {
        label: "Monthly Fee",
        variant: "number",
        unit: "$",
        headerAlign: "end" as const,
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
        return <span className="text-sm">{formattedDate}</span>;
      },
      filterFn: (row, id, value) => {
        if (!value) return true;
        const date = new Date(row.getValue(id) as string);
        const filterDate = new Date(value as string);
        return date.toDateString() === filterDate.toDateString();
      },
      ...LICENSE_COLUMN_WIDTHS.lastActive,
      meta: {
        label: "Last Active",
        variant: "date",
        headerAlign: "start" as const,
      },
    },
    {
      id: "smsPurchased",
      accessorKey: "smsPurchased",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="SMS Purchased" />
      ),
      cell: ({ row }) => (
        <div className="w-full text-right">
          <span className="text-sm">{row.getValue("smsPurchased")}</span>
        </div>
      ),
      ...LICENSE_COLUMN_WIDTHS.smsPurchased,
      meta: {
        label: "SMS Purchased",
        headerAlign: "end" as const,
      },
    },
    {
      id: "smsSent",
      accessorKey: "smsSent",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="SMS Sent" />
      ),
      cell: ({ row }) => (
        <div className="w-full text-right">
          <span className="text-sm">{row.getValue("smsSent")}</span>
        </div>
      ),
      ...LICENSE_COLUMN_WIDTHS.smsSent,
      meta: {
        label: "SMS Sent",
        headerAlign: "end" as const,
      },
    },
    {
      id: "smsBalance",
      accessorKey: "smsBalance",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="SMS Balance" />
      ),
      cell: ({ row }) => (
        <div className="w-full text-right">
          <span className="text-sm">{row.getValue("smsBalance")}</span>
        </div>
      ),
      ...LICENSE_COLUMN_WIDTHS.smsBalance,
      meta: {
        label: "SMS Balance",
        headerAlign: "end" as const,
      },
    },
    {
      id: "agents",
      accessorKey: "agents",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Agents" />
      ),
      cell: ({ row }) => (
        <div className="w-full text-right">
          <span className="text-sm">{row.getValue("agents")}</span>
        </div>
      ),
      ...LICENSE_COLUMN_WIDTHS.agents,
      meta: {
        label: "Agents",
        headerAlign: "end" as const,
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
            className={hasNames ? "" : "text-muted-foreground"}
            title={hasNames ? display : undefined}
          >
            {display}
          </span>
        );
      },
      ...LICENSE_COLUMN_WIDTHS.agentsName,
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
        <div className="w-full text-right">
          <span className="text-sm">${row.getValue("agentsCost")}</span>
        </div>
      ),
      ...LICENSE_COLUMN_WIDTHS.agentsCost,
      enableSorting: false,
      meta: {
        label: "Agents Cost",
        headerAlign: "end" as const,
      },
    },
    {
      id: "notes",
      accessorKey: "notes",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Notes" />
      ),
      cell: ({ row }) => (
        <span className="text-sm" title={row.getValue("notes")}>
          {row.getValue("notes")}
        </span>
      ),
      ...LICENSE_COLUMN_WIDTHS.notes,
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

