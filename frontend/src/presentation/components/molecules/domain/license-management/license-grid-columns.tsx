/**
 * License Grid Column Definitions for DataGrid (Editable)
 */

"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { LicenseRecord } from "@/types";
import { LICENSE_AGENT_EMAIL_PLACEHOLDER, LICENSE_COLUMN_WIDTHS } from "@/shared/constants/license";
import type { LicenseCapabilities } from "@/shared/constants/license";
import { STATUS_OPTIONS, TERM_OPTIONS } from "@/presentation/components/molecules/domain/license-management/license-table-columns";

export interface GetLicenseGridColumnsOptions {
  capabilities?: LicenseCapabilities;
  /** When false, omit the Activity (audit) column. Default true. */
  includeAuditColumn?: boolean;
}

/** Core business columns: read-only when the role cannot edit them (e.g. Tech: dates only). */
const LICENSE_GRID_CORE_FIELD_IDS = new Set<string>([
  "dba",
  "zip",
  "term",
  "lastPayment",
  "notes",
  "agents",
  "agentsName",
  "agentsCost",
  "smsSent",
]);

function isLicenseGridColumnReadOnlyForRole(
  columnId: string,
  caps: LicenseCapabilities,
): boolean {
  switch (columnId) {
    case "startsAt":
      return !caps.canAdjustActivateDate;
    case "status":
      return !caps.canToggleLicenseStatus;
    case "plan":
      return !caps.canAdjustPackage;
    case "dueDate":
      return !caps.canAdjustComingExpired;
    case "smsPurchased":
    case "smsBalance":
      return !caps.canAddSmsBalance;
    default:
      return false;
  }
}

function applyLicenseGridRbacToColumns(
  columns: ColumnDef<LicenseRecord>[],
  caps?: LicenseCapabilities,
): ColumnDef<LicenseRecord>[] {
  if (!caps) return columns;
  return columns.map((col) => {
    const id = String(
      col.id ?? ("accessorKey" in col ? (col.accessorKey as string) : ""),
    );
    const rbacReadOnly = isLicenseGridColumnReadOnlyForRole(id, caps);
    const prevCell = col.meta?.cell;
    if (!prevCell) return col;
    const prevReadOnly = prevCell.readOnly ?? false;

    const agentAssignmentEditable =
      caps.canEditLicenseAgentAssignmentFields && (id === "agents" || id === "agentsName");
    const coreReadOnly =
      !caps.canEditLicenseCoreGridFields &&
      LICENSE_GRID_CORE_FIELD_IDS.has(id) &&
      !agentAssignmentEditable;

    if (!rbacReadOnly && !prevReadOnly && !coreReadOnly) return col;

    return {
      ...col,
      meta: {
        ...col.meta,
        cell: {
          ...prevCell,
          readOnly: prevReadOnly || rbacReadOnly || coreReadOnly,
        },
      },
    };
  });
}

function buildBaseLicenseGridColumns(): ColumnDef<LicenseRecord>[] {
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
        headerAlign: "start" as const,
        cell: { variant: "short-text" as const, align: "start" as const },
      },
    },
    {
      id: "agents",
      accessorKey: "agents",
      header: "Agents",
      ...LICENSE_COLUMN_WIDTHS.agents,
      meta: {
        label: "Agents",
        headerAlign: "start" as const,
        cell: {
          variant: "short-text" as const,
          align: "start" as const,
          placeholder: LICENSE_AGENT_EMAIL_PLACEHOLDER,
        },
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
        headerAlign: "start" as const,
        cell: { variant: "agents-name" as const },
      },
    },
    {
      id: "zip",
      accessorKey: "zip",
      header: "Zip Code",
      ...LICENSE_COLUMN_WIDTHS.zip,
      meta: {
        label: "Zip Code",
        headerAlign: "start" as const,
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
        headerAlign: "start" as const,
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
        const modules = plan ? plan.split(",").map((s) => s.trim()) : [];
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
        headerAlign: "start" as const,
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
        headerAlign: "start" as const,
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
        headerAlign: "start" as const,
        cell: { variant: "date" as const, align: "end" as const, readOnly: true },
      },
    },
    {
      id: "smsPurchased",
      accessorKey: "smsPurchased",
      header: "SMS Purchased",
      ...LICENSE_COLUMN_WIDTHS.smsPurchased,
      meta: {
        label: "SMS Purchased",
        headerAlign: "start" as const,
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
        headerAlign: "start" as const,
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
        headerAlign: "start" as const,
        cell: { variant: "number" as const },
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
        headerAlign: "start" as const,
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
        headerAlign: "start" as const,
        cell: { variant: "short-text" as const },
      },
    },
    {
      id: "createdBy",
      accessorKey: "createdBy",
      header: "Created by",
      ...LICENSE_COLUMN_WIDTHS.createdBy,
      enableSorting: false,
      enableColumnFilter: false,
      meta: {
        label: "Created by",
        headerAlign: "start" as const,
        cell: { variant: "short-text" as const, readOnly: true },
      },
    },
    {
      id: "updatedBy",
      accessorKey: "updatedBy",
      header: "Updated by",
      ...LICENSE_COLUMN_WIDTHS.updatedBy,
      enableSorting: false,
      enableColumnFilter: false,
      meta: {
        label: "Updated by",
        headerAlign: "start" as const,
        cell: { variant: "short-text" as const, readOnly: true },
      },
    },
  ];
}

export function getLicenseGridColumns(
  options?: GetLicenseGridColumnsOptions,
): ColumnDef<LicenseRecord>[] {
  const includeAuditColumn = options?.includeAuditColumn !== false;
  const base = applyLicenseGridRbacToColumns(
    buildBaseLicenseGridColumns(),
    options?.capabilities,
  );
  if (!includeAuditColumn) return base;
  return [
    ...base,
    {
      id: "auditHistory",
      accessorKey: "id",
      header: "",
      enableColumnFilter: false,
      enableSorting: false,
      enableResizing: false,
      enableHiding: false,
      enablePinning: false,
      ...LICENSE_COLUMN_WIDTHS.auditHistory,
      meta: {
        label: "",
        headerAlign: "start" as const,
        cell: { variant: "audit-history" as const, readOnly: true },
        disableColumnHeaderMenu: true,
        stickyEnd: true,
      },
    },
  ];
}
