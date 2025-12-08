/**
 * Authentication and Authorization constants
 */

/**
 * User Roles
 */
export const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  STAFF: 'staff',
} as const;

/**
 * User Role Labels
 */
export const USER_ROLE_LABELS = {
  [USER_ROLES.ADMIN]: 'Administrator',
  [USER_ROLES.MANAGER]: 'Manager',
  [USER_ROLES.STAFF]: 'Staff',
} as const;

/**
 * User Permissions
 */
export const USER_PERMISSIONS = {
  CREATE_USER: 'create_user',
  READ_USER: 'read_user',
  UPDATE_USER: 'update_user',
  DELETE_USER: 'delete_user',
  MANAGE_SYSTEM: 'manage_system',
  VIEW_DASHBOARD: 'view_dashboard',
  MANAGE_OWN_PROFILE: 'manage_own_profile',
} as const;

/**
 * Role-Based Permissions Matrix
 * Based on the enterprise user management system specification
 */
export const ROLE_PERMISSIONS: Record<UserRoleType, readonly PermissionType[]> = {
  [USER_ROLES.ADMIN]: [
    USER_PERMISSIONS.CREATE_USER,
    USER_PERMISSIONS.READ_USER,
    USER_PERMISSIONS.UPDATE_USER,
    USER_PERMISSIONS.DELETE_USER,
    USER_PERMISSIONS.MANAGE_SYSTEM,
    USER_PERMISSIONS.VIEW_DASHBOARD,
    USER_PERMISSIONS.MANAGE_OWN_PROFILE,
  ],
  [USER_ROLES.MANAGER]: [
    USER_PERMISSIONS.CREATE_USER,
    USER_PERMISSIONS.READ_USER,
    USER_PERMISSIONS.UPDATE_USER, // With restrictions
    USER_PERMISSIONS.VIEW_DASHBOARD,
    USER_PERMISSIONS.MANAGE_OWN_PROFILE,
  ],
  [USER_ROLES.STAFF]: [
    USER_PERMISSIONS.UPDATE_USER, // Only own profile
    USER_PERMISSIONS.VIEW_DASHBOARD,
    USER_PERMISSIONS.MANAGE_OWN_PROFILE,
  ],
} as const;

/**
 * Role Creation Permissions - which roles can create which other roles
 * Matches backend permission logic exactly:
 * - Admin: can create admin, manager, staff
 * - Manager: can only create staff
 * - Staff: cannot create any users
 */
export const ROLE_CREATION_PERMISSIONS: Record<UserRoleType, readonly UserRoleType[]> = {
  [USER_ROLES.ADMIN]: [USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.STAFF],
  [USER_ROLES.MANAGER]: [USER_ROLES.STAFF],
  [USER_ROLES.STAFF]: [],
} as const;

/**
 * Type alias for permission values
 */
export type PermissionType = typeof USER_PERMISSIONS[keyof typeof USER_PERMISSIONS];

/**
 * Type for valid user roles (defined directly to avoid circular reference)
 */
export type UserRoleType = 'admin' | 'manager' | 'staff';

/**
 * Role Definitions for UI display and management
 */
export const ROLE_DEFINITIONS = {
  [USER_ROLES.ADMIN]: {
    name: 'admin' as UserRoleType,
    displayName: 'Administrator',
    description: 'Full system access and management',
    color: 'admin' as const,
  },
  [USER_ROLES.MANAGER]: {
    name: 'manager' as UserRoleType,
    displayName: 'Manager',
    description: 'User management and oversight',
    color: 'manager' as const,
  },
  [USER_ROLES.STAFF]: {
    name: 'staff' as UserRoleType,
    displayName: 'Staff',
    description: 'Basic user access',
    color: 'staff' as const,
  },
} as const;

/**
 * Check if a user role can manage another role
 * Hierarchical permission system where admin > manager > staff
 */
export function canManageRole(managerRole: UserRoleType, targetRole: UserRoleType): boolean {
  const roleHierarchy: Record<UserRoleType, number> = {
    admin: 3,
    manager: 2,
    staff: 1,
  };

  return roleHierarchy[managerRole] >= roleHierarchy[targetRole];
}

/**
 * Type guard to check if a string is a valid user role
 */
export function isValidUserRole(role: string | undefined): role is UserRoleType {
  const validRoles: readonly string[] = [USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.STAFF];
  return role !== undefined && validRoles.includes(role);
}

/**
 * Permission Utility Functions
 * Based on the enterprise role-based access control system
 */
export const PermissionUtils = {
  /**
   * Check if a user role has a specific permission
   */
  hasPermission: (userRole: string | undefined, permission: PermissionType): boolean => {
    // Use type guard for better type safety
    if (!isValidUserRole(userRole)) {
      return false;
    }

    // TypeScript now knows userRole is a valid UserRoleType
    // With explicit typing, includes() should work naturally
    return ROLE_PERMISSIONS[userRole].includes(permission);
  },

  /**
   * Check if user can create users (with role restrictions)
   */
  canCreateUser: (userRole: string | undefined): boolean => {
    return PermissionUtils.hasPermission(userRole, USER_PERMISSIONS.CREATE_USER);
  },

  /**
   * Check if user can read users
   */
  canReadUser: (userRole: string | undefined): boolean => {
    return PermissionUtils.hasPermission(userRole, USER_PERMISSIONS.READ_USER);
  },

  /**
   * Check if user can update users (with hierarchical restrictions)
   * Matches backend logic:
   * - Admin can update anyone EXCEPT other admins
   * - Manager can update staff only
   * - Staff cannot update other users (only themselves via different check)
   */
  canUpdateUser: (userRole: string | undefined, targetUserRole?: string): boolean => {
    if (!PermissionUtils.hasPermission(userRole, USER_PERMISSIONS.UPDATE_USER)) {
      return false;
    }

    // If no target role specified, just check basic permission
    if (!targetUserRole) {
      return true;
    }

    // Admin can update anyone EXCEPT other admins
    if (userRole === USER_ROLES.ADMIN) {
      return targetUserRole !== USER_ROLES.ADMIN;
    }

    // Manager can update staff only (not admins or other managers)
    if (userRole === USER_ROLES.MANAGER) {
      return targetUserRole === USER_ROLES.STAFF;
    }

    // Staff cannot update other users
    return false;
  },

  /**
   * Check if user can update a specific target user (including self-update check)
   * @param userRole - Current user's role
   * @param userId - Current user's ID
   * @param targetUserId - Target user's ID
   * @param targetUserRole - Target user's role
   */
  canUpdateTargetUser: (
    userRole: string | undefined,
    userId: string | undefined,
    targetUserId: string | undefined,
    targetUserRole?: string
  ): boolean => {
    // Users can always update their own profile
    if (userId && targetUserId && userId === targetUserId) {
      return true;
    }

    // Otherwise, check hierarchical permissions
    return PermissionUtils.canUpdateUser(userRole, targetUserRole);
  },

  /**
   * Check if user has basic delete permission
   */
  canDeleteUser: (userRole: string | undefined): boolean => {
    return PermissionUtils.hasPermission(userRole, USER_PERMISSIONS.DELETE_USER);
  },

  /**
   * Check if user can delete a specific target user (with hierarchical restrictions)
   * Matches backend logic:
   * - Users CANNOT delete themselves
   * - Admin can delete anyone EXCEPT other admins
   * - Manager can delete staff only
   * - Staff cannot delete anyone
   */
  canDeleteTargetUser: (
    userRole: string | undefined,
    userId: string | undefined,
    targetUserId: string | undefined,
    targetUserRole?: string
  ): boolean => {
    // Users cannot delete themselves
    if (userId && targetUserId && userId === targetUserId) {
      return false;
    }

    // Must have basic delete permission
    if (!PermissionUtils.hasPermission(userRole, USER_PERMISSIONS.DELETE_USER)) {
      return false;
    }

    // If no target role specified, just check basic permission
    if (!targetUserRole) {
      return true;
    }

    // Admin can delete anyone EXCEPT other admins
    if (userRole === USER_ROLES.ADMIN) {
      return targetUserRole !== USER_ROLES.ADMIN;
    }

    // Manager can delete staff only (not admins or other managers)
    if (userRole === USER_ROLES.MANAGER) {
      return targetUserRole === USER_ROLES.STAFF;
    }

    // Staff cannot delete anyone
    return false;
  },

  /**
   * Check if user can manage system
   */
  canManageSystem: (userRole: string | undefined): boolean => {
    return PermissionUtils.hasPermission(userRole, USER_PERMISSIONS.MANAGE_SYSTEM);
  },

  /**
   * Check if user can view dashboard
   */
  canViewDashboard: (userRole: string | undefined): boolean => {
    return PermissionUtils.hasPermission(userRole, USER_PERMISSIONS.VIEW_DASHBOARD);
  },

  /**
   * Check if user can manage their own profile
   */
  canManageOwnProfile: (userRole: string | undefined): boolean => {
    return PermissionUtils.hasPermission(userRole, USER_PERMISSIONS.MANAGE_OWN_PROFILE);
  },

  /**
   * Get all permissions for a role
   */
  getRolePermissions: (userRole: string | undefined): PermissionType[] => {
    if (!isValidUserRole(userRole)) {
      return [];
    }
    // With explicit typing, we can safely spread the readonly array
    return [...ROLE_PERMISSIONS[userRole]];
  },

  /**
   * Check if user is admin
   */
  isAdmin: (userRole: string | undefined): boolean => {
    return userRole === USER_ROLES.ADMIN;
  },

  /**
   * Check if user is manager
   */
  isManager: (userRole: string | undefined): boolean => {
    return userRole === USER_ROLES.MANAGER;
  },

  /**
   * Check if user is staff
   */
  isStaff: (userRole: string | undefined): boolean => {
    return userRole === USER_ROLES.STAFF;
  },

  /**
   * Get roles that a user can create based on their role
   * - Admin: can create admin, manager, staff
   * - Manager: can only create staff
   * - Staff: cannot create any users
   */
  getCreatableRoles: (userRole: string | undefined): UserRoleType[] => {
    if (!isValidUserRole(userRole)) {
      return [];
    }
    return [...ROLE_CREATION_PERMISSIONS[userRole]];
  },

  /**
   * Check if a user can create a specific role
   */
  canCreateRole: (userRole: string | undefined, targetRole: UserRoleType): boolean => {
    if (!isValidUserRole(userRole)) {
      return false;
    }
    return ROLE_CREATION_PERMISSIONS[userRole].includes(targetRole);
  },
};