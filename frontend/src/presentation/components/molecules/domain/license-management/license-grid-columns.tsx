/**
 * License Grid Column Definitions for DataGrid (Editable)
 */

"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { LicenseRecord } from "@/types";
import { STATUS_OPTIONS, TERM_OPTIONS } from "@/presentation/components/molecules/domain/license-management/license-table-columns";

export function getLicenseGridColumns(): ColumnDef<LicenseRecord>[] {
  return [
    {
      id: "dba",
      accessorKey: "dba",
      header: "DBA",
      size: 200,
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
      size: 130,
      meta: {
        label: "Zip Code",
        cell: { variant: "short-text" as const },
      },
    },
    {
      id: "startsAt",
      accessorKey: "startsAt",
      header: "Activate Date",
      size: 160,
      meta: {
        label: "Activate Date",
        cell: { variant: "date" as const },
      },
    },
    {
      id: "status",
      accessorKey: "status",
      header: "Status",
      size: 130,
      enableColumnFilter: true,
      enableSorting: false,
      filterFn: (row, id, value) => {
        const status = row.getValue(id) as string;
        return Array.isArray(value) ? value.includes(status) : value === status;
      },
      meta: {
        label: "Status",
        cell: {
          variant: "select" as const,
          options: STATUS_OPTIONS,
        },
      },
    },
    {
      id: "plan",
      accessorKey: "plan",
      header: "Plan",
      size: 160,
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
        cell: { variant: "plan-modules" as const },
      },
    },
    {
      id: "term",
      accessorKey: "term",
      header: "Term",
      size: 150,
      enableColumnFilter: true,
      enableSorting: false,
      filterFn: (row, id, value) => {
        const term = row.getValue(id) as string;
        return Array.isArray(value) ? value.includes(term) : value === term;
      },
      meta: {
        label: "Term",
        cell: {
          variant: "select" as const,
          options: TERM_OPTIONS,
        },
      },
    },
    {
      id: "dueDate",
      accessorKey: "dueDate",
      header: "Due Date",
      size: 150,
      meta: {
        label: "Due Date",
        cell: { variant: "date" as const },
      },
    },
    {
      id: "lastPayment",
      accessorKey: "lastPayment",
      header: "Monthly Fee",
      size: 160,
      meta: {
        label: "Monthly Fee",
        cell: { variant: "number" as const, min: 0 },
      },
    },
    {
      id: "lastActive",
      accessorKey: "lastActive",
      header: "Last Active",
      size: 160,
      meta: {
        label: "Last Active",
        cell: { variant: "date" as const },
      },
    },
    {
      id: "smsPurchased",
      accessorKey: "smsPurchased",
      header: "SMS Purchased",
      size: 170,
      meta: {
        label: "SMS Purchased",
        cell: { variant: "number" as const, min: 0 },
      },
    },
    {
      id: "smsSent",
      accessorKey: "smsSent",
      header: "SMS Sent",
      size: 150,
      meta: {
        label: "SMS Sent",
        cell: { variant: "number" as const, min: 0 },
      },
    },
    {
      id: "smsBalance",
      accessorKey: "smsBalance",
      header: "SMS Balance",
      size: 160,
      meta: {
        label: "SMS Balance",
        cell: { variant: "number" as const },
      },
    },
    {
      id: "agents",
      accessorKey: "agents",
      header: "Agents",
      size: 120,
      meta: {
        label: "Agents",
        cell: { variant: "number" as const, min: 0 },
      },
    },
    {
      id: "agentsName",
      accessorKey: "agentsName",
      header: "Agents Name",
      size: 280,
      enableColumnFilter: false,
      meta: {
        label: "Agents Name",
        cell: { variant: "agents-name" as const },
      },
    },
    {
      id: "agentsCost",
      accessorKey: "agentsCost",
      header: "Agents Cost",
      size: 160,
      meta: {
        label: "Agents Cost",
        cell: { variant: "number" as const, min: 0 },
      },
    },
    {
      id: "notes",
      accessorKey: "notes",
      header: "Notes",
      size: 300,
      meta: {
        label: "Notes",
        cell: { variant: "short-text" as const },
      },
    },
  ];
}

