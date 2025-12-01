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
    USER_PERMISSIONS.READ_USER,
    USER_PERMISSIONS.UPDATE_USER, // Only own profile
    USER_PERMISSIONS.MANAGE_OWN_PROFILE,
  ],
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
   */
  canUpdateUser: (userRole: string | undefined, targetUserRole?: string): boolean => {
    if (!PermissionUtils.hasPermission(userRole, USER_PERMISSIONS.UPDATE_USER)) {
      return false;
    }

    // Admin can update anyone
    if (userRole === USER_ROLES.ADMIN) {
      return true;
    }

    // Manager cannot update admins or other managers
    if (userRole === USER_ROLES.MANAGER) {
      return targetUserRole === USER_ROLES.STAFF || !targetUserRole;
    }

    // Staff can only update their own profile
    return false;
  },

  /**
   * Check if user can delete users
   */
  canDeleteUser: (userRole: string | undefined): boolean => {
    return PermissionUtils.hasPermission(userRole, USER_PERMISSIONS.DELETE_USER);
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
};