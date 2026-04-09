/**
 * User role literals, labels, and role-level helpers.
 */

export const USER_ROLES = {
  ADMIN: 'admin',
  ACCOUNTANT: 'accountant',
  MANAGER: 'manager',
  TECH: 'tech',
  AGENT: 'agent',
} as const;

export type UserRoleType = 'admin' | 'accountant' | 'manager' | 'tech' | 'agent';

export const MANAGER_ROLES = [USER_ROLES.MANAGER] as const;

export type ManagerRoleType = (typeof MANAGER_ROLES)[number];

/** Staff roles overseen by a line manager when `managed_by` matches (matches backend). */
export const MANAGER_MANAGED_STAFF_ROLES = [
  USER_ROLES.AGENT,
  USER_ROLES.TECH,
  USER_ROLES.ACCOUNTANT,
] as const satisfies readonly UserRoleType[];

export function isDirectReportOfLineManager(
  managerUser: { id: string; role: string },
  targetUser: { managedBy?: string | null; role: string },
): boolean {
  if (!isManagerRole(managerUser.role)) {
    return false;
  }
  if (!targetUser.managedBy || targetUser.managedBy !== managerUser.id) {
    return false;
  }
  return (MANAGER_MANAGED_STAFF_ROLES as readonly string[]).includes(targetUser.role);
}

export const USER_ROLE_LABELS = {
  [USER_ROLES.ADMIN]: 'Administrator',
  [USER_ROLES.ACCOUNTANT]: 'Accountant',
  [USER_ROLES.MANAGER]: 'Manager',
  [USER_ROLES.TECH]: 'Tech',
  [USER_ROLES.AGENT]: 'Agent',
} as const;

export function isManagerRole(role: string | undefined): role is ManagerRoleType {
  return role !== undefined && (MANAGER_ROLES as readonly string[]).includes(role);
}

export function canManageRole(managerRole: UserRoleType, targetRole: UserRoleType): boolean {
  const roleHierarchy: Record<UserRoleType, number> = {
    admin: 7,
    accountant: 6,
    manager: 5,
    tech: 3,
    agent: 2,
  };

  return roleHierarchy[managerRole] >= roleHierarchy[targetRole];
}

export function isValidUserRole(role: string | undefined): role is UserRoleType {
  const validRoles: readonly string[] = [
    USER_ROLES.ADMIN,
    USER_ROLES.ACCOUNTANT,
    USER_ROLES.MANAGER,
    USER_ROLES.TECH,
    USER_ROLES.AGENT,
  ];
  return role !== undefined && validRoles.includes(role);
}
