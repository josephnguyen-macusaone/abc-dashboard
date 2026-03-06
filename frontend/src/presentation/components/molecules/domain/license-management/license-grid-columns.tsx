/**
 * License Grid Column Definitions for DataGrid (Editable)
 */

"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { LicenseRecord } from "@/types";
import { LICENSE_COLUMN_WIDTHS } from "@/shared/constants/license";
import { STATUS_OPTIONS, TERM_OPTIONS } from "@/presentation/components/molecules/domain/license-management/license-table-columns";

export function getLicenseGridColumns(): ColumnDef<LicenseRecord>[] {
  return [
    {
      id: "dba",
      accessorKey: "dba",
      header: "DBA",
      ...LICENSE_COLUMN_WIDTHS.dba,
      enableColumnFilter: false,
      enableSorting: false,
      meta: {
        label: "DBA",
        cell: { variant: "short-text" as const },
      },
    },
    {
      id: "zip",
      accessorKey: "zip",
      header: "Zip Code",
      ...LICENSE_COLUMN_WIDTHS.zip,
      meta: {
        label: "Zip Code",
        headerAlign: "end" as const,
        cell: { variant: "short-text" as const, align: "end" as const },
      },
    },
    {
      id: "startsAt",
      accessorKey: "startsAt",
      header: "Activate Date",
      ...LICENSE_COLUMN_WIDTHS.startsAt,
      meta: {
        label: "Activate Date",
        headerAlign: "end" as const,
        cell: { variant: "date" as const, align: "end" as const },
      },
    },
    {
      id: "status",
      accessorKey: "status",
      header: "Status",
      ...LICENSE_COLUMN_WIDTHS.status,
      enableColumnFilter: true,
      enableSorting: false,
      filterFn: (row, id, value) => {
        const status = row.getValue(id) as string;
        return Array.isArray(value) ? value.includes(status) : value === status;
      },
      meta: {
        label: "Status",
        headerAlign: "start" as const,
        cell: {
          variant: "license-status" as const,
          options: STATUS_OPTIONS,
          align: "start" as const,
        },
      },
    },
    {
      id: "plan",
      accessorKey: "plan",
      header: "Plan",
      ...LICENSE_COLUMN_WIDTHS.plan,
      enableColumnFilter: true,
      enableSorting: false,
      filterFn: (row, id, value) => {
        const plan = row.getValue(id) as string;
        const modules = plan ? plan.split(',').map((s) => s.trim()) : [];
        if (Array.isArray(value)) {
          return value.some((v) => modules.includes(v));
        }
        return modules.includes(value);
      },
      meta: {
        label: "Plan",
        headerAlign: "start" as const,
        cell: { variant: "plan-modules" as const, align: "start" as const },
      },
    },
    {
      id: "term",
      accessorKey: "term",
      header: "Term",
      ...LICENSE_COLUMN_WIDTHS.term,
      enableColumnFilter: true,
      enableSorting: false,
      filterFn: (row, id, value) => {
        const term = row.getValue(id) as string;
        return Array.isArray(value) ? value.includes(term) : value === term;
      },
      meta: {
        label: "Term",
        headerAlign: "start" as const,
        cell: {
          variant: "select" as const,
          options: TERM_OPTIONS,
          align: "start" as const,
        },
      },
    },
    {
      id: "dueDate",
      accessorKey: "dueDate",
      header: "Due Date",
      ...LICENSE_COLUMN_WIDTHS.dueDate,
      meta: {
        label: "Due Date",
        headerAlign: "end" as const,
        cell: { variant: "date" as const, align: "end" as const },
      },
    },
    {
      id: "lastPayment",
      accessorKey: "lastPayment",
      header: "Monthly Fee",
      ...LICENSE_COLUMN_WIDTHS.lastPayment,
      meta: {
        label: "Monthly Fee",
        headerAlign: "end" as const,
        cell: { variant: "number" as const, min: 0 },
      },
    },
    {
      id: "lastActive",
      accessorKey: "lastActive",
      header: "Last Active",
      ...LICENSE_COLUMN_WIDTHS.lastActive,
      meta: {
        label: "Last Active",
        headerAlign: "end" as const,
        cell: { variant: "date" as const, readOnly: true },
      },
    },
    {
      id: "smsPurchased",
      accessorKey: "smsPurchased",
      header: "SMS Purchased",
      ...LICENSE_COLUMN_WIDTHS.smsPurchased,
      meta: {
        label: "SMS Purchased",
        headerAlign: "end" as const,
        cell: { variant: "number" as const, min: 0 },
      },
    },
    {
      id: "smsSent",
      accessorKey: "smsSent",
      header: "SMS Sent",
      ...LICENSE_COLUMN_WIDTHS.smsSent,
      meta: {
        label: "SMS Sent",
        headerAlign: "end" as const,
        cell: { variant: "number" as const, min: 0 },
      },
    },
    {
      id: "smsBalance",
      accessorKey: "smsBalance",
      header: "SMS Balance",
      ...LICENSE_COLUMN_WIDTHS.smsBalance,
      meta: {
        label: "SMS Balance",
        headerAlign: "end" as const,
        cell: { variant: "number" as const },
      },
    },
    {
      id: "agents",
      accessorKey: "agents",
      header: "Agents",
      ...LICENSE_COLUMN_WIDTHS.agents,
      meta: {
        label: "Agents",
        headerAlign: "end" as const,
        cell: { variant: "number" as const, min: 0 },
      },
    },
    {
      id: "agentsName",
      accessorKey: "agentsName",
      header: "Agents Name",
      ...LICENSE_COLUMN_WIDTHS.agentsName,
      enableColumnFilter: false,
      enableSorting: false,
      meta: {
        label: "Agents Name",
        cell: { variant: "agents-name" as const },
      },
    },
    {
      id: "agentsCost",
      accessorKey: "agentsCost",
      header: "Agents Cost",
      ...LICENSE_COLUMN_WIDTHS.agentsCost,
      enableSorting: false,
      meta: {
        label: "Agents Cost",
        headerAlign: "end" as const,
        cell: { variant: "number" as const, min: 0 },
      },
    },
    {
      id: "notes",
      accessorKey: "notes",
      header: "Notes",
      ...LICENSE_COLUMN_WIDTHS.notes,
      enableSorting: false,
      meta: {
        label: "Notes",
        cell: { variant: "short-text" as const },
      },
    },
  ];
}

