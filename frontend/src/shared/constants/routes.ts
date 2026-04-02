import type { UserRoleType } from './auth';

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

  // Protected routes
  DASHBOARD: '/dashboard',
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
    description: 'System dashboard and overview',
    requireAuth: true,
    // String literals used instead of USER_ROLES.* to prevent Turbopack (Next.js 16)
    // from tree-shaking infrequently-referenced role constants in the Edge middleware bundle.
    allowedRoles: ['admin', 'accountant', 'manager', 'tech', 'agent'] as UserRoleType[],
    redirectTo: ROUTES.LOGIN,
    showInNav: true,
  },

  [ROUTES.USERS]: {
    path: ROUTES.USERS,
    title: 'Users',
    description: 'User management',
    requireAuth: true,
    allowedRoles: ['admin', 'accountant', 'manager'] as UserRoleType[],
    redirectTo: ROUTES.LOGIN,
    showInNav: true,
  },

  [ROUTES.LICENSES]: {
    path: ROUTES.LICENSES,
    title: 'Licenses',
    description: 'License management',
    requireAuth: true,
    allowedRoles: ['admin', 'accountant', 'manager', 'tech'] as UserRoleType[],
    redirectTo: ROUTES.LOGIN,
    showInNav: true,
  },

  [ROUTES.PROFILE]: {
    path: ROUTES.PROFILE,
    title: 'Profile',
    description: 'Manage your profile',
    requireAuth: true,
    allowedRoles: ['admin', 'accountant', 'manager', 'tech', 'agent'] as UserRoleType[],
    redirectTo: ROUTES.LOGIN,
    showInNav: true,
  },

  [ROUTES.PROFILE_EDIT]: {
    path: ROUTES.PROFILE_EDIT,
    title: 'Edit Profile',
    description: 'Update your profile information',
    requireAuth: true,
    allowedRoles: ['admin', 'accountant', 'manager', 'tech', 'agent'] as UserRoleType[],
    redirectTo: ROUTES.LOGIN,
    parent: ROUTES.PROFILE,
  },

  [ROUTES.PROFILE_CHANGE_PASSWORD]: {
    path: ROUTES.PROFILE_CHANGE_PASSWORD,
    title: 'Change Password',
    description: 'Update your password',
    requireAuth: true,
    allowedRoles: ['admin', 'accountant', 'manager', 'tech', 'agent'] as UserRoleType[],
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

/**
 * Get route config by path
 */
export function getRouteConfig(path: string): RouteConfig | undefined {
  return ROUTE_CONFIGS[path];
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
  return config.allowedRoles.includes(userRole as UserRoleType);
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
 * Get default redirect path after login based on user role
 */
export function getDefaultRedirect(userRole?: string): string {
  if (!userRole) return ROUTES.LOGIN;

  // String literals used instead of USER_ROLES.* to prevent Turbopack tree-shaking.
  switch (userRole) {
    case 'admin':
    case 'accountant':
    case 'manager':
    case 'tech':
    case 'agent':
      return ROUTES.DASHBOARD;
    default:
      return ROUTES.PROFILE;
  }
}

/**
 * Check if a path is an auth route
 */
export function isAuthRoute(path: string): boolean {
  return AUTH_ROUTES.some(route => path.startsWith(route));
}
