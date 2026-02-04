/**
 * License Management Constants
 */

import type { LicenseStatus } from '../types/license';

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
 * Plan badge color classes (Tailwind)
 */
export const LICENSE_PLAN_COLORS: Record<LicensePlan, string> = {
  Basic: 'bg-blue-100 text-blue-800 border-blue-300',
  Premium: 'bg-purple-100 text-purple-800 border-purple-300',
};

// Export plan options with colors for use in filters/dropdowns
export { LICENSE_PLAN_OPTIONS as LICENSE_PLAN_OPTIONS_WITH_COLORS };
