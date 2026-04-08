import { ROLES } from './roles.js';

export const LICENSE_ROLE_CAPABILITIES = {
  [ROLES.ADMIN]: {
    canViewLicenses: true,
    canCreateLicense: true,
    canUpdateLicense: true,
    canDeleteLicense: true,
    canBulkOperate: true,
    canResetLicenseId: true,
    canAddSmsPayment: true,
    canViewSmsPayments: true,
  },
  [ROLES.ACCOUNT_MANAGER]: {
    canViewLicenses: true,
    canCreateLicense: false,
    canUpdateLicense: false,
    canDeleteLicense: false,
    canBulkOperate: false,
    canResetLicenseId: false,
    canAddSmsPayment: false,
    canViewSmsPayments: false,
  },
  [ROLES.TECH_MANAGER]: {
    canViewLicenses: true,
    canCreateLicense: false,
    canUpdateLicense: false,
    canDeleteLicense: false,
    canBulkOperate: false,
    canResetLicenseId: false,
    canAddSmsPayment: false,
    canViewSmsPayments: false,
  },
  [ROLES.AGENT_MANAGER]: {
    canViewLicenses: true,
    canCreateLicense: false,
    canUpdateLicense: false,
    canDeleteLicense: false,
    canBulkOperate: false,
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
