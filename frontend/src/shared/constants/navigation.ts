import { Home, Users, FileSpreadsheet } from 'lucide-react';
import { PermissionUtils } from './auth';
import type { NavigationItem } from '@/presentation/components/molecules';

/**
 * Permission-based navigation items based on enterprise permission system
 * Returns navigation items based on user role
 */
export function getNavigationItems(userRole?: string): NavigationItem[] {
  const baseItems: NavigationItem[] = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
  ];

  // Admin navigation (full system access)
  if (PermissionUtils.canManageSystem(userRole)) {
    return [
      ...baseItems,
      { name: 'License Management', href: '/dashboard?section=licenses', icon: FileSpreadsheet },
      { name: 'User Management', href: '/dashboard?section=users', icon: Users },
    ];
  }

  // Manager navigation (user management with restrictions)
  if (PermissionUtils.canReadUser(userRole)) {
    return [
      ...baseItems,
      { name: 'License Management', href: '/dashboard?section=licenses', icon: FileSpreadsheet },
      { name: 'User Management', href: '/dashboard?section=users', icon: Users },
    ];
  }

  // Staff navigation (limited access)
  if (PermissionUtils.isStaff(userRole)) {
    return baseItems;
  }

  // Default/unknown role
  return baseItems;
}
