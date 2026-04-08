/**
 * User role literals, labels, and role-level helpers.
 */

export const USER_ROLES = {
  ADMIN: 'admin',
  ACCOUNTANT: 'accountant',
  ACCOUNT_MANAGER: 'account_manager',
  TECH_MANAGER: 'tech_manager',
  AGENT_MANAGER: 'agent_manager',
  TECH: 'tech',
  AGENT: 'agent',
} as const;

export type UserRoleType =
  | 'admin'
  | 'accountant'
  | 'account_manager'
  | 'tech_manager'
  | 'agent_manager'
  | 'tech'
  | 'agent';

export const MANAGER_ROLES = [
  USER_ROLES.ACCOUNT_MANAGER,
  USER_ROLES.TECH_MANAGER,
  USER_ROLES.AGENT_MANAGER,
] as const;

export type ManagerRoleType = (typeof MANAGER_ROLES)[number];

/** Staff role overseen by each manager type (matches backend). */
export const MANAGED_ROLE_BY_MANAGER: Record<ManagerRoleType, UserRoleType> = {
  [USER_ROLES.ACCOUNT_MANAGER]: USER_ROLES.ACCOUNTANT,
  [USER_ROLES.TECH_MANAGER]: USER_ROLES.TECH,
  [USER_ROLES.AGENT_MANAGER]: USER_ROLES.AGENT,
};

export const USER_ROLE_LABELS = {
  [USER_ROLES.ADMIN]: 'Administrator',
  [USER_ROLES.ACCOUNTANT]: 'Accountant',
  [USER_ROLES.ACCOUNT_MANAGER]: 'Accountant manager',
  [USER_ROLES.TECH_MANAGER]: 'Tech manager',
  [USER_ROLES.AGENT_MANAGER]: 'Agent manager',
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
    account_manager: 5,
    tech_manager: 5,
    agent_manager: 5,
    tech: 3,
    agent: 2,
  };

  return roleHierarchy[managerRole] >= roleHierarchy[targetRole];
}

export function isValidUserRole(role: string | undefined): role is UserRoleType {
  const validRoles: readonly string[] = [
    USER_ROLES.ADMIN,
    USER_ROLES.ACCOUNTANT,
    USER_ROLES.ACCOUNT_MANAGER,
    USER_ROLES.TECH_MANAGER,
    USER_ROLES.AGENT_MANAGER,
    USER_ROLES.TECH,
    USER_ROLES.AGENT,
  ];
  return role !== undefined && validRoles.includes(role);
}
