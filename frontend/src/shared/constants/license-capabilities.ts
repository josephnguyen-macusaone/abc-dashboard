import { USER_ROLES, type UserRoleType } from "@/shared/constants/auth";

export interface LicenseCapabilities {
  canViewLicenses: boolean;
  canViewOwnLicensesOnly: boolean;
  canCreateLicense: boolean;
  canUpdateLicense: boolean;
  canDeleteLicense: boolean;
  canResetLicenseId: boolean;
  canAdjustComingExpired: boolean;
  canAdjustActivateDate: boolean;
  canToggleLicenseStatus: boolean;
  canAdjustPackage: boolean;
  canAddSmsBalance: boolean;
  canViewSmsPaymentHistory: boolean;
  /**
   * License grid: edit DBA, zip, term, fees, agents, notes, SMS sent, etc.
   * When false (e.g. Tech), persisted rows are limited to date fields; draft (`temp-*`) rows stay editable for new requests.
   */
  canEditLicenseCoreGridFields: boolean;
}

const NO_CAPABILITIES: LicenseCapabilities = {
  canViewLicenses: false,
  canViewOwnLicensesOnly: false,
  canCreateLicense: false,
  canUpdateLicense: false,
  canDeleteLicense: false,
  canResetLicenseId: false,
  canAdjustComingExpired: false,
  canAdjustActivateDate: false,
  canToggleLicenseStatus: false,
  canAdjustPackage: false,
  canAddSmsBalance: false,
  canViewSmsPaymentHistory: false,
  canEditLicenseCoreGridFields: false,
};

export const LICENSE_ROLE_CAPABILITIES: Record<UserRoleType, LicenseCapabilities> = {
  [USER_ROLES.ADMIN]: {
    canViewLicenses: true,
    canViewOwnLicensesOnly: false,
    canCreateLicense: true,
    canUpdateLicense: true,
    canDeleteLicense: true,
    canResetLicenseId: true,
    canAdjustComingExpired: true,
    canAdjustActivateDate: true,
    canToggleLicenseStatus: true,
    canAdjustPackage: true,
    canAddSmsBalance: true,
    canViewSmsPaymentHistory: true,
    canEditLicenseCoreGridFields: true,
  },
  [USER_ROLES.MANAGER]: {
    canViewLicenses: true,
    canViewOwnLicensesOnly: false,
    canCreateLicense: true,
    canUpdateLicense: true,
    canDeleteLicense: false,
    canResetLicenseId: true,
    canAdjustComingExpired: true,
    canAdjustActivateDate: true,
    canToggleLicenseStatus: true,
    canAdjustPackage: true,
    canAddSmsBalance: true,
    canViewSmsPaymentHistory: true,
    canEditLicenseCoreGridFields: true,
  },
  [USER_ROLES.AGENT]: {
    canViewLicenses: true,
    canViewOwnLicensesOnly: true,
    canCreateLicense: false,
    canUpdateLicense: false,
    canDeleteLicense: false,
    canResetLicenseId: false,
    canAdjustComingExpired: false,
    canAdjustActivateDate: false,
    canToggleLicenseStatus: false,
    canAdjustPackage: false,
    canAddSmsBalance: true,
    canViewSmsPaymentHistory: true,
    canEditLicenseCoreGridFields: false,
  },
  [USER_ROLES.TECH]: {
    canViewLicenses: true,
    canViewOwnLicensesOnly: false,
    canCreateLicense: true,
    canUpdateLicense: true,
    canDeleteLicense: false,
    canResetLicenseId: true,
    canAdjustComingExpired: true,
    canAdjustActivateDate: true,
    canToggleLicenseStatus: false,
    canAdjustPackage: false,
    canAddSmsBalance: false,
    canViewSmsPaymentHistory: true,
    canEditLicenseCoreGridFields: false,
  },
  [USER_ROLES.ACCOUNTANT]: {
    canViewLicenses: true,
    canViewOwnLicensesOnly: false,
    canCreateLicense: true,
    canUpdateLicense: true,
    canDeleteLicense: false,
    canResetLicenseId: false,
    canAdjustComingExpired: true,
    canAdjustActivateDate: false,
    canToggleLicenseStatus: true,
    canAdjustPackage: true,
    canAddSmsBalance: true,
    canViewSmsPaymentHistory: true,
    canEditLicenseCoreGridFields: true,
  },
  [USER_ROLES.STAFF]: NO_CAPABILITIES,
};

export function getLicenseCapabilities(userRole?: string): LicenseCapabilities {
  if (!userRole) return NO_CAPABILITIES;
  return LICENSE_ROLE_CAPABILITIES[userRole as UserRoleType] ?? NO_CAPABILITIES;
}
