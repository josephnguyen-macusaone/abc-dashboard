/**
 * License Management Constants
 */

import type { LicenseStatus } from '../types/license';

/**
 * License status options for filters and displays
 */
export const LICENSE_STATUS_OPTIONS: Array<{
  label: string;
  value: LicenseStatus;
  color?: string;
}> = [
  { label: 'Draft', value: 'draft', color: 'gray' },
  { label: 'Pending', value: 'pending', color: 'yellow' },
  { label: 'Active', value: 'active', color: 'green' },
  { label: 'Expiring', value: 'expiring', color: 'orange' },
  { label: 'Expired', value: 'expired', color: 'red' },
  { label: 'Cancelled', value: 'cancel', color: 'gray' },
  { label: 'Revoked', value: 'revoked', color: 'red' },
];

/**
 * Human-readable labels for license statuses
 */
export const LICENSE_STATUS_LABELS: Record<LicenseStatus, string> = {
  draft: 'Draft',
  pending: 'Pending',
  active: 'Active',
  expiring: 'Expiring',
  expired: 'Expired',
  cancel: 'Cancelled',
  revoked: 'Revoked',
};

/**
 * Status badge color classes (Tailwind)
 */
export const LICENSE_STATUS_COLORS: Record<LicenseStatus, string> = {
  draft: 'bg-gray-100 text-gray-800 border-gray-300',
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  active: 'bg-green-100 text-green-800 border-green-300',
  expiring: 'bg-orange-100 text-orange-800 border-orange-300',
  expired: 'bg-red-100 text-red-800 border-red-300',
  cancel: 'bg-gray-200 text-gray-600 border-gray-400',
  revoked: 'bg-red-200 text-red-900 border-red-400',
};
