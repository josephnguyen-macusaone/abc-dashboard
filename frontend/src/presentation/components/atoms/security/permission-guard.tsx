'use client';

import { ReactNode } from 'react';
import { useAuthStore } from '@/infrastructure/stores/auth';
import { PermissionUtils, USER_PERMISSIONS, PermissionType, isValidUserRole } from '@/shared/constants';

interface PermissionGuardProps {
  children: ReactNode;
  permission?: PermissionType;
  userRole?: string;
  targetUserRole?: string;
  fallback?: ReactNode;
  requireAll?: boolean; // If true, requires ALL permissions, otherwise ANY
}

/**
 * Permission-based access control component
 * Based on the enterprise role-based permission system
 */
export function PermissionGuard({
  children,
  permission,
  userRole,
  targetUserRole,
  fallback = null,
  requireAll = false
}: PermissionGuardProps) {
  const { user } = useAuthStore();

  // If no specific permission/role requirements, show content
  if (!permission && !userRole) {
    return <>{children}</>;
  }

  const currentUserRole = user?.role;
  const hasPermission = permission ? PermissionUtils.hasPermission(currentUserRole, permission) : true;
  const hasRole = userRole ? isValidUserRole(currentUserRole) && currentUserRole === userRole : true;

  // Check hierarchical restrictions for user management operations
  let hasHierarchicalAccess = true;
  if (permission === USER_PERMISSIONS.UPDATE_USER && targetUserRole) {
    hasHierarchicalAccess = isValidUserRole(currentUserRole) &&
                           PermissionUtils.canUpdateUser(currentUserRole, targetUserRole);
  }

  // Check if user meets all requirements
  const meetsRequirements = requireAll
    ? hasPermission && hasRole && hasHierarchicalAccess
    : hasPermission || hasRole;

  return meetsRequirements ? <>{children}</> : <>{fallback}</>;
}

/**
 * Admin-only content guard
 */
export function AdminOnly({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGuard userRole="admin" fallback={fallback}>
      {children}
    </PermissionGuard>
  );
}

/**
 * Manager or higher access guard
 */
export function ManagerOrHigher({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  const { user } = useAuthStore();
  const hasAccess = PermissionUtils.isAdmin(user?.role) || PermissionUtils.isManager(user?.role);

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

/**
 * User creation permission guard
 */
export function CanCreateUser({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGuard permission={USER_PERMISSIONS.CREATE_USER} fallback={fallback}>
      {children}
    </PermissionGuard>
  );
}

/**
 * User management permission guard
 */
export function CanManageUsers({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGuard permission={USER_PERMISSIONS.READ_USER} fallback={fallback}>
      {children}
    </PermissionGuard>
  );
}

/**
 * User update permission guard
 */
export function CanUpdateUsers({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGuard permission={USER_PERMISSIONS.UPDATE_USER} fallback={fallback}>
      {children}
    </PermissionGuard>
  );
}

/**
 * User update permission guard with hierarchical restrictions
 */
export function CanUpdateUser({ children, targetUserRole, fallback = null }: { children: ReactNode; targetUserRole?: string; fallback?: ReactNode }) {
  return (
    <PermissionGuard permission={USER_PERMISSIONS.UPDATE_USER} targetUserRole={targetUserRole} fallback={fallback}>
      {children}
    </PermissionGuard>
  );
}

/**
 * User delete permission guard
 */
export function CanDeleteUsers({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGuard permission={USER_PERMISSIONS.DELETE_USER} fallback={fallback}>
      {children}
    </PermissionGuard>
  );
}

/**
 * System management permission guard
 */
export function CanManageSystem({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGuard permission={USER_PERMISSIONS.MANAGE_SYSTEM} fallback={fallback}>
      {children}
    </PermissionGuard>
  );
}
