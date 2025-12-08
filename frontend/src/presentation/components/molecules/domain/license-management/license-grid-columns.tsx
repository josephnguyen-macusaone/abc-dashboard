/**
 * License Grid Column Definitions for DataGrid (Editable)
 */

"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { LicenseRecord, LicenseStatus, LicenseTerm } from "@/shared/types";
import { STATUS_OPTIONS, PLAN_OPTIONS, TERM_OPTIONS } from "./license-table-columns";

export function getLicenseGridColumns(): ColumnDef<LicenseRecord>[] {
  return [
    {
      id: "id",
      accessorKey: "id",
      header: "No.",
      size: 70,
      enableSorting: true,
      enableHiding: false,
      meta: {
        label: "No.",
        cell: { variant: "number" as const },
      },
    },
    {
      id: "dbA",
      accessorKey: "dbA",
      header: "DBA",
      size: 150,
      enableColumnFilter: true,
      filterFn: (row, id, value) => {
        const dbA = row.getValue(id) as string;
        return dbA.toLowerCase().includes(value.toLowerCase());
      },
      meta: {
        label: "DBA",
        cell: { variant: "short-text" as const },
      },
    },
    {
      id: "zip",
      accessorKey: "zip",
      header: "Zip Code",
      size: 100,
      meta: {
        label: "Zip Code",
        cell: { variant: "short-text" as const },
      },
    },
    {
      id: "startDay",
      accessorKey: "startDay",
      header: "Start Date",
      size: 120,
      meta: {
        label: "Start Date",
        cell: { variant: "date" as const },
      },
    },
    {
      id: "status",
      accessorKey: "status",
      header: "Status",
      size: 120,
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
      size: 120,
      meta: {
        label: "Plan",
        cell: {
          variant: "select" as const,
          options: PLAN_OPTIONS,
        },
      },
    },
    {
      id: "term",
      accessorKey: "term",
      header: "Term",
      size: 110,
      meta: {
        label: "Term",
        cell: {
          variant: "select" as const,
          options: TERM_OPTIONS,
        },
      },
    },
    {
      id: "lastPayment",
      accessorKey: "lastPayment",
      header: "Last Payment",
      size: 130,
      meta: {
        label: "Last Payment",
        cell: { variant: "number" as const, min: 0 },
      },
    },
    {
      id: "lastActive",
      accessorKey: "lastActive",
      header: "Last Active",
      size: 120,
      meta: {
        label: "Last Active",
        cell: { variant: "date" as const },
      },
    },
    {
      id: "smsPurchased",
      accessorKey: "smsPurchased",
      header: "SMS Purchased",
      size: 130,
      meta: {
        label: "SMS Purchased",
        cell: { variant: "number" as const, min: 0 },
      },
    },
    {
      id: "smsSent",
      accessorKey: "smsSent",
      header: "SMS Sent",
      size: 110,
      meta: {
        label: "SMS Sent",
        cell: { variant: "number" as const, min: 0 },
      },
    },
    {
      id: "smsBalance",
      accessorKey: "smsBalance",
      header: "SMS Balance",
      size: 120,
      meta: {
        label: "SMS Balance",
        cell: { variant: "number" as const },
      },
    },
    {
      id: "agents",
      accessorKey: "agents",
      header: "Agents",
      size: 90,
      meta: {
        label: "Agents",
        cell: { variant: "number" as const, min: 0 },
      },
    },
    {
      id: "agentsName",
      accessorKey: "agentsName",
      header: "Agents Name",
      size: 200,
      meta: {
        label: "Agents Name",
        cell: { variant: "short-text" as const },
      },
    },
    {
      id: "agentsCost",
      accessorKey: "agentsCost",
      header: "Agents Cost",
      size: 120,
      meta: {
        label: "Agents Cost",
        cell: { variant: "number" as const, min: 0 },
      },
    },
    {
      id: "notes",
      accessorKey: "notes",
      header: "Notes",
      size: 200,
      meta: {
        label: "Notes",
        cell: { variant: "short-text" as const },
      },
    },
  ];
}

