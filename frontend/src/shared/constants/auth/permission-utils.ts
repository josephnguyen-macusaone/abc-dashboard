/**
 * Permission checks derived from ROLE_PERMISSIONS / ROLE_CREATION_PERMISSIONS.
 */

import {
  ROLE_CREATION_PERMISSIONS,
  ROLE_PERMISSIONS,
  USER_PERMISSIONS,
  type PermissionType,
} from './permissions';
import {
  USER_ROLES,
  isValidUserRole,
  isManagerRole,
  MANAGED_ROLE_BY_MANAGER,
  type UserRoleType,
} from './roles';

export const PermissionUtils = {
  hasPermission: (userRole: string | undefined, permission: PermissionType): boolean => {
    if (!isValidUserRole(userRole)) {
      return false;
    }

    return ROLE_PERMISSIONS[userRole].includes(permission);
  },

  canCreateUser: (userRole: string | undefined): boolean => {
    return PermissionUtils.hasPermission(userRole, USER_PERMISSIONS.CREATE_USER);
  },

  canReadUser: (userRole: string | undefined): boolean => {
    return PermissionUtils.hasPermission(userRole, USER_PERMISSIONS.READ_USER);
  },

  canUpdateUser: (userRole: string | undefined, targetUserRole?: string): boolean => {
    if (!PermissionUtils.hasPermission(userRole, USER_PERMISSIONS.UPDATE_USER)) {
      return false;
    }

    if (!targetUserRole) {
      return true;
    }

    if (userRole === USER_ROLES.ADMIN) {
      return targetUserRole !== USER_ROLES.ADMIN;
    }

    if (userRole === USER_ROLES.ACCOUNTANT) {
      return targetUserRole !== USER_ROLES.ADMIN;
    }

    if (isManagerRole(userRole)) {
      return true;
    }

    return false;
  },

  canUpdateTargetUser: (
    userRole: string | undefined,
    userId: string | undefined,
    targetUserId: string | undefined,
    targetUserRole?: string,
    targetManagedBy?: string | null,
  ): boolean => {
    if (userId && targetUserId && userId === targetUserId) {
      return true;
    }

    if (
      isManagerRole(userRole) &&
      targetUserRole &&
      targetManagedBy &&
      userId &&
      targetManagedBy === userId
    ) {
      const expected = MANAGED_ROLE_BY_MANAGER[userRole];
      return targetUserRole === expected;
    }

    return PermissionUtils.canUpdateUser(userRole, targetUserRole);
  },

  canDeleteUser: (userRole: string | undefined): boolean => {
    return PermissionUtils.hasPermission(userRole, USER_PERMISSIONS.DELETE_USER);
  },

  canDeleteTargetUser: (
    userRole: string | undefined,
    userId: string | undefined,
    targetUserId: string | undefined,
    targetUserRole?: string,
    targetManagedBy?: string | null,
  ): boolean => {
    if (userId && targetUserId && userId === targetUserId) {
      return false;
    }

    if (!PermissionUtils.hasPermission(userRole, USER_PERMISSIONS.DELETE_USER)) {
      return false;
    }

    if (!targetUserRole) {
      return true;
    }

    if (userRole === USER_ROLES.ADMIN) {
      return targetUserRole !== USER_ROLES.ADMIN;
    }

    if (userRole === USER_ROLES.ACCOUNTANT) {
      return targetUserRole !== USER_ROLES.ADMIN;
    }

    if (isManagerRole(userRole)) {
      if (!targetUserRole || !targetManagedBy || !userId) {
        return false;
      }
      const expected = MANAGED_ROLE_BY_MANAGER[userRole];
      return targetUserRole === expected && targetManagedBy === userId;
    }

    return false;
  },

  canManageSystem: (userRole: string | undefined): boolean => {
    return PermissionUtils.hasPermission(userRole, USER_PERMISSIONS.MANAGE_SYSTEM);
  },

  canViewDashboard: (userRole: string | undefined): boolean => {
    return PermissionUtils.hasPermission(userRole, USER_PERMISSIONS.VIEW_DASHBOARD);
  },

  canManageOwnProfile: (userRole: string | undefined): boolean => {
    return PermissionUtils.hasPermission(userRole, USER_PERMISSIONS.MANAGE_OWN_PROFILE);
  },

  getRolePermissions: (userRole: string | undefined): PermissionType[] => {
    if (!isValidUserRole(userRole)) {
      return [];
    }
    return [...ROLE_PERMISSIONS[userRole]];
  },

  isAdmin: (userRole: string | undefined): boolean => {
    return userRole === USER_ROLES.ADMIN;
  },

  /** Any line-manager role (account / tech / agent manager). */
  isManager: (userRole: string | undefined): boolean => {
    return isManagerRole(userRole);
  },

  isAccountant: (userRole: string | undefined): boolean => {
    return userRole === USER_ROLES.ACCOUNTANT;
  },

  isTech: (userRole: string | undefined): boolean => {
    return userRole === USER_ROLES.TECH;
  },

  isAgent: (userRole: string | undefined): boolean => {
    return userRole === USER_ROLES.AGENT;
  },

  getCreatableRoles: (userRole: string | undefined): UserRoleType[] => {
    if (!isValidUserRole(userRole)) {
      return [];
    }
    return [...ROLE_CREATION_PERMISSIONS[userRole]];
  },

  canCreateRole: (userRole: string | undefined, targetRole: UserRoleType): boolean => {
    if (!isValidUserRole(userRole)) {
      return false;
    }
    return ROLE_CREATION_PERMISSIONS[userRole].includes(targetRole);
  },
};
