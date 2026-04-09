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

/** Roles that oversee staff via managed_by (line managers). */
export const MANAGER_ROLES = [ROLES.MANAGER];

/**
 * Staff roles a line manager may create and manage when `managed_by` is that manager.
 * Mutations (update, status, delete) apply only to matching direct reports.
 */
export const MANAGER_MANAGED_STAFF_ROLES = [ROLES.AGENT, ROLES.TECH, ROLES.ACCOUNTANT];

/**
 * @param {{ id: string, role: string }} managerUser
 * @param {{ managedBy?: string|null, role: string }} targetUser
 * @returns {boolean}
 */
export function isDirectReportOfLineManager(managerUser, targetUser) {
  if (!managerUser?.id || !targetUser || !isManagerRole(managerUser.role)) {
    return false;
  }
  if (!targetUser.managedBy || targetUser.managedBy !== managerUser.id) {
    return false;
  }
  return MANAGER_MANAGED_STAFF_ROLES.includes(targetUser.role);
}

/** When reassigning staff to a line manager, the staff role must map here. */
export const MANAGER_ROLE_FOR_STAFF_ROLE = {
  [ROLES.AGENT]: ROLES.MANAGER,
  [ROLES.TECH]: ROLES.MANAGER,
  [ROLES.ACCOUNTANT]: ROLES.MANAGER,
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
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.MANAGE_OWN_PROFILE,
  ],
  [ROLES.MANAGER]: MANAGER_USER_PERMISSIONS,
  [ROLES.TECH]: [PERMISSIONS.VIEW_DASHBOARD, PERMISSIONS.MANAGE_OWN_PROFILE],
  [ROLES.AGENT]: [PERMISSIONS.VIEW_DASHBOARD, PERMISSIONS.MANAGE_OWN_PROFILE],
};

export const ROLE_CREATION_PERMISSIONS = {
  [ROLES.ADMIN]: [ROLES.ADMIN, ROLES.ACCOUNTANT, ROLES.MANAGER, ROLES.TECH, ROLES.AGENT],
  [ROLES.ACCOUNTANT]: [],
  /** Line managers may only provision agent accounts (`managed_by` set in middleware). */
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
  MANAGER_MANAGED_STAFF_ROLES,
  isDirectReportOfLineManager,
  MANAGER_ROLE_FOR_STAFF_ROLE,
  isManagerRole,
  PERMISSIONS,
  ROLE_CREATION_PERMISSIONS,
  hasPermission,
};
