/**
 * License Management Constants
 */

import type { LicenseStatus } from '../types/license';

/** Default sort for license data table and data grid (Activate Date, newest first) */
export const DEFAULT_LICENSE_SORT = [{ id: 'startsAt', desc: true }] as const;

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

// Export plan options with colors for use in filters/dropdowns
export { LICENSE_PLAN_OPTIONS as LICENSE_PLAN_OPTIONS_WITH_COLORS };
