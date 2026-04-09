import { ROLES } from './roles.js';

export const LICENSE_ROLE_CAPABILITIES = {
  [ROLES.ADMIN]: {
    canViewLicenses: true,
    canCreateLicense: true,
    canUpdateLicense: true,
    canDeleteLicense: true,
    canBulkOperate: true,
    canBulkPatchLicenses: false,
    canResetLicenseId: true,
    canAddSmsPayment: true,
    canViewSmsPayments: true,
  },
  [ROLES.MANAGER]: {
    canViewLicenses: true,
    canCreateLicense: false,
    /** Assign agents to licenses via Agents / Agents Name columns (PATCH bulk or PUT). */
    canUpdateLicense: true,
    canDeleteLicense: false,
    canBulkOperate: false,
    /** PATCH /licenses/bulk only (not create/delete bulk). */
    canBulkPatchLicenses: true,
    canResetLicenseId: false,
    canAddSmsPayment: false,
    canViewSmsPayments: false,
  },
  [ROLES.ACCOUNTANT]: {
    canViewLicenses: true,
    canCreateLicense: true,
    canUpdateLicense: true,
    canDeleteLicense: false,
    canBulkOperate: false,
    canBulkPatchLicenses: false,
    canResetLicenseId: false,
    canAddSmsPayment: true,
    canViewSmsPayments: true,
  },
  [ROLES.TECH]: {
    canViewLicenses: true,
    canCreateLicense: true,
    canUpdateLicense: true,
    canDeleteLicense: false,
    canBulkOperate: false,
    canBulkPatchLicenses: false,
    canResetLicenseId: true,
    canAddSmsPayment: false,
    canViewSmsPayments: true,
  },
  [ROLES.AGENT]: {
    canViewLicenses: true,
    canCreateLicense: false,
    canUpdateLicense: false,
    canDeleteLicense: false,
    canBulkOperate: false,
    canBulkPatchLicenses: false,
    canResetLicenseId: false,
    canAddSmsPayment: true,
    canViewSmsPayments: true,
  },
};

const NO_CAPABILITIES = {
  canViewLicenses: false,
  canCreateLicense: false,
  canUpdateLicense: false,
  canDeleteLicense: false,
  canBulkOperate: false,
  canBulkPatchLicenses: false,
  canResetLicenseId: false,
  canAddSmsPayment: false,
  canViewSmsPayments: false,
};

export function getLicenseCapabilitiesForRole(role) {
  if (!role) {
    return NO_CAPABILITIES;
  }
  return LICENSE_ROLE_CAPABILITIES[role] ?? NO_CAPABILITIES;
}

export function isApiFirstRole(role) {
  return role === ROLES.AGENT || role === ROLES.TECH || role === ROLES.ACCOUNTANT;
}
