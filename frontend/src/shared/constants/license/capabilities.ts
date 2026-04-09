/**
 * Per-role license UI/API capabilities (grid, routes, nav).
 */

import { USER_ROLES, type UserRoleType } from '@/shared/constants/auth';

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
  /**
   * License grid: edit DBA, zip, term, fees, agents, notes, SMS sent, etc.
   * When false (e.g. Tech), persisted rows are limited to date fields; draft (`temp-*`) rows stay editable for new requests.
   */
  canEditLicenseCoreGridFields: boolean;
  /** Managers: edit Agents (agent email) and Agents Name only on the license grid. */
  canEditLicenseAgentAssignmentFields: boolean;
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
  canEditLicenseCoreGridFields: false,
  canEditLicenseAgentAssignmentFields: false,
};

/** Line managers: assign agents on licenses (Agents / Agents Name); no other license writes. */
const MANAGER_LICENSE_AGENT_ASSIGNMENT: LicenseCapabilities = {
  canViewLicenses: true,
  canViewOwnLicensesOnly: false,
  canCreateLicense: false,
  canUpdateLicense: true,
  canDeleteLicense: false,
  canResetLicenseId: false,
  canAdjustComingExpired: false,
  canAdjustActivateDate: false,
  canToggleLicenseStatus: false,
  canAdjustPackage: false,
  canAddSmsBalance: false,
  canEditLicenseCoreGridFields: false,
  canEditLicenseAgentAssignmentFields: true,
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
    canEditLicenseCoreGridFields: true,
    canEditLicenseAgentAssignmentFields: false,
  },
  [USER_ROLES.MANAGER]: MANAGER_LICENSE_AGENT_ASSIGNMENT,
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
    canEditLicenseCoreGridFields: false,
    canEditLicenseAgentAssignmentFields: false,
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
    canEditLicenseCoreGridFields: false,
    canEditLicenseAgentAssignmentFields: false,
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
    canEditLicenseCoreGridFields: true,
    canEditLicenseAgentAssignmentFields: false,
  },
};

export function getLicenseCapabilities(userRole?: string): LicenseCapabilities {
  if (!userRole) return NO_CAPABILITIES;
  return LICENSE_ROLE_CAPABILITIES[userRole as UserRoleType] ?? NO_CAPABILITIES;
}
