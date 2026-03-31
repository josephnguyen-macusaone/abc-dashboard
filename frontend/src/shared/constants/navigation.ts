import { Home, Users, FileSpreadsheet } from 'lucide-react';
import { PermissionUtils, USER_ROLES } from './auth';
import { getLicenseCapabilities } from './license-capabilities';
import type { NavigationItem } from '@/presentation/components/molecules';

/**
 * Permission-based navigation items based on enterprise permission system
 * Returns navigation items based on user role
 */
export function getNavigationItems(userRole?: string): NavigationItem[] {
  const baseItems: NavigationItem[] = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
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

  // Roles focused on license operations
  if (
    licenseCapabilities.canViewLicenses ||
    userRole === USER_ROLES.ACCOUNTANT ||
    userRole === USER_ROLES.TECH ||
    userRole === USER_ROLES.AGENT
  ) {
    return [
      ...baseItems,
      { name: 'License Management', href: '/licenses', icon: FileSpreadsheet },
    ];
  }

  // Staff navigation (limited access)
  if (PermissionUtils.isStaff(userRole)) {
    return baseItems;
  }

  // Default/unknown role
  return baseItems;
}
