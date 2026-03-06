/**
 * User Role Constants
 * Defines available user roles and their permissions
 */

// Role definitions
export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  STAFF: 'staff',
};

// Permission definitions
export const PERMISSIONS = {
  // User management
  CREATE_USER: 'create_user',
  READ_USER: 'read_user',
  UPDATE_USER: 'update_user',
  DELETE_USER: 'delete_user',

  // System management
  MANAGE_SYSTEM: 'manage_system',
  VIEW_DASHBOARD: 'view_dashboard',

  // Profile management (basic permission for all users)
  MANAGE_OWN_PROFILE: 'manage_own_profile',
};

// Role-based permissions mapping (used internally by hasPermission helpers)
const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: [
    PERMISSIONS.CREATE_USER,
    PERMISSIONS.READ_USER,
    PERMISSIONS.UPDATE_USER,
    PERMISSIONS.DELETE_USER,
    PERMISSIONS.MANAGE_SYSTEM,
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.MANAGE_OWN_PROFILE,
  ],
  [ROLES.MANAGER]: [
    PERMISSIONS.CREATE_USER,
    PERMISSIONS.READ_USER,
    PERMISSIONS.UPDATE_USER,
    PERMISSIONS.DELETE_USER,
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.MANAGE_OWN_PROFILE,
  ],
  [ROLES.STAFF]: [PERMISSIONS.READ_USER, PERMISSIONS.UPDATE_USER, PERMISSIONS.MANAGE_OWN_PROFILE],
};

// Role creation permissions - which roles can create which other roles
export const ROLE_CREATION_PERMISSIONS = {
  [ROLES.ADMIN]: [ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF],
  [ROLES.MANAGER]: [ROLES.STAFF],
  [ROLES.STAFF]: [],
};

/**
 * Check if a role has a specific permission
 * @param {string} role - The user role
 * @param {string} permission - The permission to check
 * @returns {boolean} True if role has permission
 */
export function hasPermission(role, permission) {
  return ROLE_PERMISSIONS[role]?.includes(permission) || false;
}

export default {
  ROLES,
  PERMISSIONS,
  ROLE_CREATION_PERMISSIONS,
  hasPermission,
};
