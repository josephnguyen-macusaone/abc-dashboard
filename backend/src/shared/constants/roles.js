/**
 * User Role Constants
 * Defines available user roles and their permissions
 */

export const ROLES = {
  ADMIN: 'admin',
  ACCOUNTANT: 'accountant',
  MANAGER: 'manager',
  TECH: 'tech',
  AGENT: 'agent',
};

/** Roles that oversee staff via managed_by (single manager provisions agents). */
export const MANAGER_ROLES = [ROLES.MANAGER];

/** Staff role each manager is responsible for (mutations: update/delete/status for direct reports). */
export const MANAGED_ROLE_BY_MANAGER = {
  [ROLES.MANAGER]: ROLES.AGENT,
};

/** When reassigning an agent, the new line manager must have this role */
export const MANAGER_ROLE_FOR_STAFF_ROLE = {
  [ROLES.AGENT]: ROLES.MANAGER,
};

export function isManagerRole(role) {
  return MANAGER_ROLES.includes(role);
}

export const PERMISSIONS = {
  CREATE_USER: 'create_user',
  READ_USER: 'read_user',
  UPDATE_USER: 'update_user',
  DELETE_USER: 'delete_user',
  MANAGE_SYSTEM: 'manage_system',
  VIEW_DASHBOARD: 'view_dashboard',
  MANAGE_OWN_PROFILE: 'manage_own_profile',
};

const MANAGER_USER_PERMISSIONS = [
  PERMISSIONS.READ_USER,
  PERMISSIONS.UPDATE_USER,
  PERMISSIONS.CREATE_USER,
  PERMISSIONS.DELETE_USER,
  PERMISSIONS.VIEW_DASHBOARD,
  PERMISSIONS.MANAGE_OWN_PROFILE,
];

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
  [ROLES.ACCOUNTANT]: [
    PERMISSIONS.READ_USER,
    PERMISSIONS.UPDATE_USER,
    PERMISSIONS.DELETE_USER,
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.MANAGE_OWN_PROFILE,
  ],
  [ROLES.MANAGER]: MANAGER_USER_PERMISSIONS,
  [ROLES.TECH]: [PERMISSIONS.VIEW_DASHBOARD, PERMISSIONS.MANAGE_OWN_PROFILE],
  [ROLES.AGENT]: [PERMISSIONS.VIEW_DASHBOARD, PERMISSIONS.MANAGE_OWN_PROFILE],
};

export const ROLE_CREATION_PERMISSIONS = {
  [ROLES.ADMIN]: [
    ROLES.ADMIN,
    ROLES.ACCOUNTANT,
    ROLES.MANAGER,
    ROLES.TECH,
    ROLES.AGENT,
  ],
  [ROLES.ACCOUNTANT]: [],
  /** Managers provision agents only; tech/accountant onboard via signup. */
  [ROLES.MANAGER]: [ROLES.AGENT],
  [ROLES.TECH]: [],
  [ROLES.AGENT]: [],
};

export function hasPermission(role, permission) {
  return ROLE_PERMISSIONS[role]?.includes(permission) || false;
}

export default {
  ROLES,
  MANAGER_ROLES,
  MANAGED_ROLE_BY_MANAGER,
  MANAGER_ROLE_FOR_STAFF_ROLE,
  isManagerRole,
  PERMISSIONS,
  ROLE_CREATION_PERMISSIONS,
  hasPermission,
};
