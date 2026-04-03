/**
 * License Management Constants
 */

import type { LicenseStatus } from '../types/license';

/** Default sort for license data table and data grid (Activate Date, newest first) */
export const DEFAULT_LICENSE_SORT = [{ id: 'startsAt', desc: true }] as const;

/** localStorage key for license data table column visibility (staff / admin). */
export const LICENSE_DATA_TABLE_COLUMN_VISIBILITY_KEY = 'licenses-data-table-column-visibility';

/** Separate key so agent column prefs do not overwrite staff defaults. */
export const LICENSE_DATA_TABLE_AGENT_COLUMN_VISIBILITY_KEY = 'licenses-data-table-column-visibility-agent';

/**
 * Agent dashboard: show core list fields only; SMS / agents / notes / audit off by default
 * (users enable via column visibility). Aligns with a lean default list UX.
 */
export const AGENT_LICENSE_TABLE_INITIAL_COLUMN_VISIBILITY: Record<string, boolean> = {
  select: false,
  dba: true,
  zip: true,
  startsAt: true,
  status: true,
  plan: true,
  term: true,
  dueDate: true,
  lastPayment: true,
  lastActive: true,
  smsPurchased: false,
  smsSent: false,
  smsBalance: false,
  agents: false,
  agentsName: false,
  agentsCost: false,
  notes: false,
  createdBy: false,
  updatedBy: false,
  auditHistory: false,
};

/**
 * License Plan Types
 */
export type LicensePlan = 'Basic' | 'Premium';

/**
 * License status options for filters and displays (active, cancel only)
 */
export const LICENSE_STATUS_OPTIONS: Array<{
  label: string;
  value: LicenseStatus;
  color?: string;
}> = [
  { label: 'Active', value: 'active', color: 'green' },
  { label: 'Cancelled', value: 'cancel', color: 'gray' },
];

/**
 * Human-readable labels for license statuses
 */
export const LICENSE_STATUS_LABELS: Record<LicenseStatus, string> = {
  active: 'Active',
  cancel: 'Cancelled',
};

/**
 * Status badge color classes (Tailwind)
 */
export const LICENSE_STATUS_COLORS: Record<LicenseStatus, string> = {
  active: 'bg-green-100 text-green-800 border-green-300',
  cancel: 'bg-gray-200 text-gray-600 border-gray-400',
};

/**
 * License plan options for filters and displays (Basic, Premium only)
 * @deprecated Use LICENSE_PLAN_MODULE_OPTIONS for module-based plans
 */
export const LICENSE_PLAN_OPTIONS: Array<{
  label: string;
  value: LicensePlan;
  color?: string;
}> = [
  { label: 'Basic', value: 'Basic', color: 'blue' },
  { label: 'Premium', value: 'Premium', color: 'purple' },
];

/**
 * Plan module options (sold by module: Basic, Print Check, Staff Performance, Unlimited SMS)
 * Maps to Package: basic, print_check, staff_performance, sms_package_6000
 */
export type PlanModule = 'Basic' | 'Print Check' | 'Staff Performance' | 'Unlimited SMS';

export const LICENSE_PLAN_MODULE_OPTIONS: Array<{
  label: string;
  value: PlanModule;
  packageKey: keyof PackageShape;
}> = [
  { label: 'Basic', value: 'Basic', packageKey: 'basic' },
  { label: 'Print Check', value: 'Print Check', packageKey: 'print_check' },
  { label: 'Staff Performance', value: 'Staff Performance', packageKey: 'staff_performance' },
  { label: 'Unlimited SMS', value: 'Unlimited SMS', packageKey: 'sms_package_6000' },
];

/** Package shape from API (plan modules) */
export interface PackageShape {
  basic?: boolean;
  print_check?: boolean;
  staff_performance?: boolean;
  sms_package_6000?: boolean;
}

/** Derive plan module labels from Package (empty when nothing) */
export function packageToPlanLabels(pkg: PackageShape | Record<string, unknown> | undefined): PlanModule[] {
  if (!pkg || typeof pkg !== 'object') return [];
  const labels: PlanModule[] = [];
  if (pkg.basic) labels.push('Basic');
  if (pkg.print_check) labels.push('Print Check');
  if (pkg.staff_performance) labels.push('Staff Performance');
  if (pkg.sms_package_6000) labels.push('Unlimited SMS');
  return labels;
}

/** Convert plan module selections to Package object */
export function planLabelsToPackage(labels: string[]): PackageShape {
  return {
    basic: labels.includes('Basic'),
    print_check: labels.includes('Print Check'),
    staff_performance: labels.includes('Staff Performance'),
    sms_package_6000: labels.includes('Unlimited SMS'),
  };
}

/** Plan module options for filters (value + label) */
export const PLAN_MODULE_OPTIONS = LICENSE_PLAN_MODULE_OPTIONS.map((o) => ({
  label: o.label,
  value: o.value,
}));

/**
 * Plan badge color classes (Tailwind)
 */
export const LICENSE_PLAN_COLORS: Record<LicensePlan, string> = {
  Basic: 'bg-blue-100 text-blue-800 border-blue-300',
  Premium: 'bg-purple-100 text-purple-800 border-purple-300',
};

/**
 * Plan module badge color classes (Basic, Print Check, Staff Performance, Unlimited SMS).
 * Matches LICENSE_STATUS_COLORS pattern (bg-*-100 text-*-800 border-*-300) for consistent badge UI.
 */
export const LICENSE_PLAN_MODULE_COLORS: Record<PlanModule, string> = {
  'Basic': 'bg-blue-100 text-blue-800 border-blue-300',
  'Print Check': 'bg-amber-100 text-amber-800 border-amber-300',
  'Staff Performance': 'bg-emerald-100 text-emerald-800 border-emerald-300',
  'Unlimited SMS': 'bg-violet-100 text-violet-800 border-violet-300',
};

// Export plan options with colors for use in filters/dropdowns
export { LICENSE_PLAN_OPTIONS as LICENSE_PLAN_OPTIONS_WITH_COLORS };

/**
 * Single source of truth for license table/grid column widths.
 * Used by license-table-columns (data table) and license-grid-columns (data grid).
 * Edit this file to resize columns in both views.
 */
export const LICENSE_COLUMN_WIDTHS = {
  select: { size: 48, minSize: 40 },
  dba: { size: 200, minSize: 80 },
  zip: { size: 130, minSize: 90 },
  startsAt: { size: 160, minSize: 120 },
  status: { size: 130, minSize: 80 },
  plan: { size: 130, minSize: 80 },
  term: { size: 150, minSize: 80 },
  dueDate: { size: 150, minSize: 100 },
  lastPayment: { size: 160, minSize: 110 },
  lastActive: { size: 160, minSize: 110 },
  smsPurchased: { size: 170, minSize: 130 },
  smsSent: { size: 150, minSize: 100 },
  smsBalance: { size: 160, minSize: 120 },
  agents: { size: 120, minSize: 80 },
  agentsName: { size: 280, minSize: 130 },
  agentsCost: { size: 160, minSize: 120 },
  notes: { size: 300, minSize: 100 },
  createdBy: { size: 160, minSize: 100 },
  updatedBy: { size: 160, minSize: 100 },
  auditHistory: { size: 52, minSize: 44 },
} as const;

export type LicenseColumnId = keyof typeof LICENSE_COLUMN_WIDTHS;
