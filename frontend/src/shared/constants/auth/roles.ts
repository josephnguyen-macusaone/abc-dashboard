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

export const USER_ROLE_LABELS = {
  [USER_ROLES.ADMIN]: 'Administrator',
  [USER_ROLES.ACCOUNTANT]: 'Accountant',
  [USER_ROLES.MANAGER]: 'Manager',
  [USER_ROLES.TECH]: 'Tech',
  [USER_ROLES.AGENT]: 'Agent',
} as const;

/** Valid user role string (aligned with backend JWT). */
export type UserRoleType = 'admin' | 'accountant' | 'manager' | 'tech' | 'agent';

export function canManageRole(managerRole: UserRoleType, targetRole: UserRoleType): boolean {
  const roleHierarchy: Record<UserRoleType, number> = {
    admin: 6,
    accountant: 5,
    manager: 4,
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
