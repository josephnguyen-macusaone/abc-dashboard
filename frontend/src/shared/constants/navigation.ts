import { Home, Users, FileSpreadsheet } from 'lucide-react';
import { PermissionUtils, USER_ROLES } from './auth';
import { getLicenseCapabilities } from './license-capabilities';
import { getRoleDashboardPath } from './routes';
import type { NavigationItem } from '@/presentation/components/molecules';

/**
 * Permission-based navigation items based on enterprise permission system
 * Returns navigation items based on user role
 */
export function getNavigationItems(userRole?: string): NavigationItem[] {
  const baseItems: NavigationItem[] = [
    { name: 'Dashboard', href: getRoleDashboardPath(userRole), icon: Home },
  ];
  const licenseCapabilities = getLicenseCapabilities(userRole);

  // Admin navigation (full system access)
  if (PermissionUtils.canManageSystem(userRole)) {
    return [
      ...baseItems,
      { name: 'License Management', href: '/licenses', icon: FileSpreadsheet },
      { name: 'User Management', href: '/users', icon: Users },
    ];
  }

  // Manager navigation (user management with restrictions)
  if (PermissionUtils.canReadUser(userRole)) {
    return [
      ...baseItems,
      { name: 'License Management', href: '/licenses', icon: FileSpreadsheet },
      { name: 'User Management', href: '/users', icon: Users },
    ];
  }

  // Roles focused on license operations (agents use dashboard only; /licenses is hidden)
  if (licenseCapabilities.canViewLicenses && userRole !== USER_ROLES.AGENT) {
    return [
      ...baseItems,
      { name: 'License Management', href: '/licenses', icon: FileSpreadsheet },
    ];
  }

  // Default/unknown role
  return baseItems;
}
