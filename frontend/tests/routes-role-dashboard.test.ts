import {
  getRoleDashboardPath,
  getDefaultRedirect,
  getRouteConfig,
  canAccessRoute,
  ROUTES,
} from '@/shared/constants/routes';

describe('role dashboard routes', () => {
  it('maps roles to dedicated dashboard paths', () => {
    expect(getRoleDashboardPath('agent')).toBe(ROUTES.DASHBOARD_AGENT);
    expect(getRoleDashboardPath('tech')).toBe(ROUTES.DASHBOARD_TECH);
    expect(getRoleDashboardPath('accountant')).toBe(ROUTES.DASHBOARD_ACCOUNTANT);
    expect(getRoleDashboardPath('admin')).toBe(ROUTES.DASHBOARD_ADMIN);
    expect(getRoleDashboardPath('manager')).toBe(ROUTES.DASHBOARD_ADMIN);
  });

  it('getRoleDashboardPath falls back for unknown or missing role', () => {
    expect(getRoleDashboardPath(undefined)).toBe(ROUTES.DASHBOARD);
    expect(getRoleDashboardPath('guest')).toBe(ROUTES.PROFILE);
  });

  it('getDefaultRedirect sends known roles to role dashboard and anonymous to login', () => {
    expect(getDefaultRedirect(undefined)).toBe(ROUTES.LOGIN);
    expect(getDefaultRedirect('tech')).toBe(ROUTES.DASHBOARD_TECH);
  });

  it('getRouteConfig uses longest prefix for dashboard segments', () => {
    expect(getRouteConfig('/dashboard/agent')?.path).toBe(ROUTES.DASHBOARD_AGENT);
    expect(getRouteConfig('/dashboard')?.path).toBe(ROUTES.DASHBOARD);
  });

  it('canAccessRoute enforces per-role dashboard paths', () => {
    expect(canAccessRoute('/dashboard/agent', 'agent')).toBe(true);
    expect(canAccessRoute('/dashboard/agent', 'tech')).toBe(false);
    expect(canAccessRoute('/dashboard/admin', 'admin')).toBe(true);
    expect(canAccessRoute('/dashboard/admin', 'manager')).toBe(true);
    expect(canAccessRoute('/dashboard/admin', 'agent')).toBe(false);
  });
});
