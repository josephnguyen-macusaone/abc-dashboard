/**
 * License domain labels, plan/package options, badge colors, and package helpers.
 */

import type { LicenseStatus } from '../../types/license';

export type LicensePlan = 'Basic' | 'Premium';

export const LICENSE_STATUS_OPTIONS: Array<{
  label: string;
  value: LicenseStatus;
  color?: string;
}> = [
  { label: 'Active', value: 'active', color: 'green' },
  { label: 'Cancelled', value: 'cancel', color: 'gray' },
];

export const LICENSE_STATUS_LABELS: Record<LicenseStatus, string> = {
  active: 'Active',
  cancel: 'Cancelled',
};

export const LICENSE_STATUS_COLORS: Record<LicenseStatus, string> = {
  active: 'bg-green-100 text-green-800 border-green-300',
  cancel: 'bg-gray-200 text-gray-600 border-gray-400',
};

/**
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

export interface PackageShape {
  basic?: boolean;
  print_check?: boolean;
  staff_performance?: boolean;
  sms_package_6000?: boolean;
}

export function packageToPlanLabels(pkg: PackageShape | Record<string, unknown> | undefined): PlanModule[] {
  if (!pkg || typeof pkg !== 'object') return [];
  const labels: PlanModule[] = [];
  if (pkg.basic) labels.push('Basic');
  if (pkg.print_check) labels.push('Print Check');
  if (pkg.staff_performance) labels.push('Staff Performance');
  if (pkg.sms_package_6000) labels.push('Unlimited SMS');
  return labels;
}

export function planLabelsToPackage(labels: string[]): PackageShape {
  return {
    basic: labels.includes('Basic'),
    print_check: labels.includes('Print Check'),
    staff_performance: labels.includes('Staff Performance'),
    sms_package_6000: labels.includes('Unlimited SMS'),
  };
}

export const PLAN_MODULE_OPTIONS = LICENSE_PLAN_MODULE_OPTIONS.map((o) => ({
  label: o.label,
  value: o.value,
}));

export const LICENSE_PLAN_COLORS: Record<LicensePlan, string> = {
  Basic: 'bg-blue-100 text-blue-800 border-blue-300',
  Premium: 'bg-purple-100 text-purple-800 border-purple-300',
};

export const LICENSE_PLAN_MODULE_COLORS: Record<PlanModule, string> = {
  Basic: 'bg-blue-100 text-blue-800 border-blue-300',
  'Print Check': 'bg-amber-100 text-amber-800 border-amber-300',
  'Staff Performance': 'bg-emerald-100 text-emerald-800 border-emerald-300',
  'Unlimited SMS': 'bg-violet-100 text-violet-800 border-violet-300',
};

export { LICENSE_PLAN_OPTIONS as LICENSE_PLAN_OPTIONS_WITH_COLORS };
