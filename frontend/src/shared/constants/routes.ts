import type { UserRoleType } from './auth';
import { MANAGER_ROLES } from './auth';
import { FEATURE_FLAGS } from './feature-flags';

/** All roles that may use authenticated app routes (nav, profile, dashboard hub). */
const APP_AUTHENTICATED_ROLES: UserRoleType[] = [
  'admin',
  'accountant',
  ...MANAGER_ROLES,
  'tech',
  'agent',
];

/**
 * Route configuration with permissions and metadata
 */
export interface RouteConfig {
  path: string;
  title: string;
  description?: string;
  requireAuth: boolean;
  allowedRoles?: UserRoleType[];
  redirectTo?: string;
  icon?: string;
  showInNav?: boolean;
  parent?: string;
}

/**
 * Application routes configuration
 * Centralized route definitions for consistency across middleware and components
 */
export const ROUTES = {
  // Public routes
  HOME: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  VERIFY_EMAIL: '/verify-email',

  // Protected routes — role-specific dashboards (edit one route without affecting others)
  DASHBOARD: '/dashboard',
  DASHBOARD_ADMIN: '/dashboard/admin',
  DASHBOARD_AGENT: '/dashboard/agent',
  DASHBOARD_TECH: '/dashboard/tech',
  DASHBOARD_ACCOUNTANT: '/dashboard/accountant',
  USERS: '/users',
  LICENSES: '/licenses',
  PROFILE: '/profile',
  PROFILE_EDIT: '/profile/edit',
  PROFILE_CHANGE_PASSWORD: '/profile/change-password',
} as const;

/**
 * Route configurations with permissions
 */
export const ROUTE_CONFIGS: Record<string, RouteConfig> = {
  [ROUTES.HOME]: {
    path: ROUTES.HOME,
    title: 'Home',
    description: 'Welcome page',
    requireAuth: false,
  },

  [ROUTES.LOGIN]: {
    path: ROUTES.LOGIN,
    title: 'Login',
    description: 'Sign in to your account',
    requireAuth: false,
  },

  [ROUTES.SIGNUP]: {
    path: ROUTES.SIGNUP,
    title: 'Signup',
    description: 'Create a new account',
    requireAuth: false,
  },

  [ROUTES.FORGOT_PASSWORD]: {
    path: ROUTES.FORGOT_PASSWORD,
    title: 'Forgot Password',
    description: 'Reset your password',
    requireAuth: false,
  },

  [ROUTES.RESET_PASSWORD]: {
    path: ROUTES.RESET_PASSWORD,
    title: 'Reset Password',
    description: 'Set a new password',
    requireAuth: false,
  },

  [ROUTES.VERIFY_EMAIL]: {
    path: ROUTES.VERIFY_EMAIL,
    title: 'Verify Email',
    description: 'Confirm your email address',
    requireAuth: false,
  },

  [ROUTES.DASHBOARD]: {
    path: ROUTES.DASHBOARD,
    title: 'Dashboard',
    description: 'Redirects to your role dashboard',
    requireAuth: true,
    // String literals used instead of USER_ROLES.* to prevent Turbopack (Next.js 16)
    // from tree-shaking infrequently-referenced role constants in the Edge middleware bundle.
    allowedRoles: APP_AUTHENTICATED_ROLES,
    redirectTo: ROUTES.LOGIN,
    showInNav: false,
  },

  [ROUTES.DASHBOARD_ADMIN]: {
    path: ROUTES.DASHBOARD_ADMIN,
    title: 'Admin dashboard',
    description: 'System overview and licenses',
    requireAuth: true,
    allowedRoles: ['admin', ...MANAGER_ROLES] as UserRoleType[],
    redirectTo: ROUTES.LOGIN,
    showInNav: false,
  },

  [ROUTES.DASHBOARD_AGENT]: {
    path: ROUTES.DASHBOARD_AGENT,
    title: 'Agent dashboard',
    description: 'Your licenses overview',
    requireAuth: true,
    allowedRoles: ['agent'] as UserRoleType[],
    redirectTo: ROUTES.LOGIN,
    showInNav: false,
  },

  [ROUTES.DASHBOARD_TECH]: {
    path: ROUTES.DASHBOARD_TECH,
    title: 'Tech dashboard',
    description: 'Technical license overview',
    requireAuth: true,
    allowedRoles: ['tech'] as UserRoleType[],
    redirectTo: ROUTES.LOGIN,
    showInNav: false,
  },

  [ROUTES.DASHBOARD_ACCOUNTANT]: {
    path: ROUTES.DASHBOARD_ACCOUNTANT,
    title: 'Accountant dashboard',
    description: 'Financial and license overview',
    requireAuth: true,
    allowedRoles: ['accountant'] as UserRoleType[],
    redirectTo: ROUTES.LOGIN,
    showInNav: false,
  },

  [ROUTES.USERS]: {
    path: ROUTES.USERS,
    title: 'Users',
    description: 'User management',
    requireAuth: true,
    allowedRoles: ['admin', 'accountant', ...MANAGER_ROLES] as UserRoleType[],
    redirectTo: ROUTES.LOGIN,
    showInNav: true,
  },

  [ROUTES.LICENSES]: {
    path: ROUTES.LICENSES,
    title: 'Licenses',
    description: 'License management',
    requireAuth: true,
    allowedRoles: ['admin', 'accountant', ...MANAGER_ROLES, 'tech'] as UserRoleType[],
    redirectTo: ROUTES.LOGIN,
    showInNav: true,
  },

  [ROUTES.PROFILE]: {
    path: ROUTES.PROFILE,
    title: 'Profile',
    description: 'Manage your profile',
    requireAuth: true,
    allowedRoles: APP_AUTHENTICATED_ROLES,
    redirectTo: ROUTES.LOGIN,
    showInNav: true,
  },

  [ROUTES.PROFILE_EDIT]: {
    path: ROUTES.PROFILE_EDIT,
    title: 'Edit Profile',
    description: 'Update your profile information',
    requireAuth: true,
    allowedRoles: APP_AUTHENTICATED_ROLES,
    redirectTo: ROUTES.LOGIN,
    parent: ROUTES.PROFILE,
  },

  [ROUTES.PROFILE_CHANGE_PASSWORD]: {
    path: ROUTES.PROFILE_CHANGE_PASSWORD,
    title: 'Change Password',
    description: 'Update your password',
    requireAuth: true,
    allowedRoles: APP_AUTHENTICATED_ROLES,
    redirectTo: ROUTES.LOGIN,
    parent: ROUTES.PROFILE,
  },

};

/**
 * Auth routes that authenticated users should be redirected away from
 */
export const AUTH_ROUTES = [
  ROUTES.LOGIN,
  ROUTES.SIGNUP,
  ROUTES.FORGOT_PASSWORD,
  ROUTES.RESET_PASSWORD,
  ROUTES.VERIFY_EMAIL,
];

function routePathStartsWith(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

/** Role-specific dashboard routes gated by `NEXT_PUBLIC_FEATURE_*` flags. */
function isRoleDashboardPathAllowedForUser(path: string, userRole: string): boolean {
  if (routePathStartsWith(path, ROUTES.DASHBOARD_TECH)) {
    return userRole !== 'tech' || FEATURE_FLAGS.techModule;
  }
  if (routePathStartsWith(path, ROUTES.DASHBOARD_AGENT)) {
    return userRole !== 'agent' || FEATURE_FLAGS.agentModule;
  }
  if (routePathStartsWith(path, ROUTES.DASHBOARD_ACCOUNTANT)) {
    return userRole !== 'accountant' || FEATURE_FLAGS.accountantModule;
  }
  return true;
}

/**
 * Resolve route config by pathname (longest prefix wins — same rules as middleware).
 */
export function getRouteConfig(path: string): RouteConfig | undefined {
  const sorted = Object.values(ROUTE_CONFIGS).sort(
    (a, b) => b.path.length - a.path.length
  );
  return sorted.find(
    (c) => path === c.path || path.startsWith(`${c.path}/`)
  );
}

/**
 * Check if a route requires authentication
 */
export function requiresAuth(path: string): boolean {
  const config = getRouteConfig(path);
  return config?.requireAuth ?? false;
}

/**
 * Get allowed roles for a route
 */
export function getAllowedRoles(path: string): UserRoleType[] | undefined {
  const config = getRouteConfig(path);
  return config?.allowedRoles;
}

/**
 * Check if user can access a route
 */
export function canAccessRoute(path: string, userRole?: string): boolean {
  const config = getRouteConfig(path);

  if (!config) return true; // Unknown routes are accessible
  if (!config.requireAuth) return true; // Public routes

  if (!userRole || !config.allowedRoles) return false;
  if (!config.allowedRoles.includes(userRole as UserRoleType)) return false;
  return isRoleDashboardPathAllowedForUser(path, userRole);
}

/**
 * Get navigation routes for a user role
 */
export function getNavigationRoutes(userRole?: string): RouteConfig[] {
  return Object.values(ROUTE_CONFIGS).filter(route =>
    route.showInNav && (!route.requireAuth || canAccessRoute(route.path, userRole))
  );
}

/**
 * Home dashboard URL for a role (use for nav, post-login, middleware).
 * Unknown role falls back to profile; missing role falls back to `/dashboard` (middleware then routes).
 */
export function getRoleDashboardPath(userRole?: string): string {
  if (!userRole) return ROUTES.DASHBOARD;

  switch (userRole) {
    case 'admin':
    case 'manager':
      return ROUTES.DASHBOARD_ADMIN;
    case 'agent':
      return FEATURE_FLAGS.agentModule ? ROUTES.DASHBOARD_AGENT : ROUTES.PROFILE;
    case 'tech':
      return FEATURE_FLAGS.techModule ? ROUTES.DASHBOARD_TECH : ROUTES.PROFILE;
    case 'accountant':
      return FEATURE_FLAGS.accountantModule ? ROUTES.DASHBOARD_ACCOUNTANT : ROUTES.PROFILE;
    default:
      return ROUTES.PROFILE;
  }
}

/**
 * Default redirect after login / unauthorized recovery
 */
export function getDefaultRedirect(userRole?: string): string {
  if (!userRole) return ROUTES.LOGIN;
  return getRoleDashboardPath(userRole);
}

/**
 * Check if a path is an auth route
 */
export function isAuthRoute(path: string): boolean {
  return AUTH_ROUTES.some(route => path.startsWith(route));
}
