/**
 * Role / user-status display metadata and badge Tailwind classes.
 */

import { USER_ROLES, type UserRoleType } from './roles';

export const ROLE_DEFINITIONS = {
  [USER_ROLES.ADMIN]: {
    name: 'admin' as UserRoleType,
    displayName: 'Administrator',
    description: 'Full system access and management',
    color: 'admin' as const,
  },
  [USER_ROLES.ACCOUNT_MANAGER]: {
    name: 'account_manager' as UserRoleType,
    displayName: 'Accountant manager',
    description: 'Oversees accountant accounts',
    color: 'manager' as const,
  },
  [USER_ROLES.TECH_MANAGER]: {
    name: 'tech_manager' as UserRoleType,
    displayName: 'Tech manager',
    description: 'Oversees tech accounts',
    color: 'manager' as const,
  },
  [USER_ROLES.AGENT_MANAGER]: {
    name: 'agent_manager' as UserRoleType,
    displayName: 'Agent manager',
    description: 'Oversees agent accounts',
    color: 'manager' as const,
  },
  [USER_ROLES.ACCOUNTANT]: {
    name: 'accountant' as UserRoleType,
    displayName: 'Accountant',
    description: 'License and finance operations',
    color: 'accountant' as const,
  },
  [USER_ROLES.TECH]: {
    name: 'tech' as UserRoleType,
    displayName: 'Tech',
    description: 'Technical license support operations',
    color: 'tech' as const,
  },
  [USER_ROLES.AGENT]: {
    name: 'agent' as UserRoleType,
    displayName: 'Agent',
    description: 'Assigned client and license operations',
    color: 'agent' as const,
  },
} as const;

export const USER_STATUS_LABELS = {
  active: 'Active',
  inactive: 'Inactive',
} as const;

export const USER_STATUS_COLORS: Record<'active' | 'inactive', string> = {
  active: 'bg-green-100 text-green-800 border-green-300',
  inactive: 'bg-slate-100 text-slate-800 border-slate-300',
};

export const USER_ROLE_COLORS: Record<UserRoleType, string> = {
  admin: 'bg-purple-100 text-purple-800 border-purple-300',
  accountant: 'bg-amber-100 text-amber-800 border-amber-300',
  account_manager: 'bg-blue-100 text-blue-800 border-blue-300',
  tech_manager: 'bg-sky-100 text-sky-800 border-sky-300',
  agent_manager: 'bg-violet-100 text-violet-800 border-violet-300',
  tech: 'bg-cyan-100 text-cyan-800 border-cyan-300',
  agent: 'bg-indigo-100 text-indigo-800 border-indigo-300',
};
