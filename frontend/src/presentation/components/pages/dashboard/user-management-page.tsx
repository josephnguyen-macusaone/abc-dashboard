'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/presentation/contexts/auth-context';
import { useToast } from '@/presentation/contexts/toast-context';
import { UserManagement } from '@/presentation/components/organisms/user-management';
import { User, UserRole } from '@/domain/entities/user-entity';
import { UserListParams } from '@/application/dto/user-dto';
import { SortBy, SortOrder } from '@/shared/types';
import { logger } from '@/shared/utils';
import { useUserStore, selectUsers, selectUserLoading, selectUserPagination, selectUserStats } from '@/infrastructure/stores/user-store';

/**
 * UserManagementPage
 *
 * Page component that handles:
 * - User data fetching and state management
 * - Authentication guard
 *
 * Note: CRUD operations (Create, Update, Delete) are handled directly
 * by the form components (UserCreateForm, UserEditForm, UserDeleteForm)
 * which access the UserContext directly.
 */
export function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const { error: showError, info: showInfo } = useToast();

  const users = useUserStore(selectUsers);
  const loadingUsers = useUserStore(selectUserLoading);
  const userPagination = useUserStore(selectUserPagination);
  const userStats = useUserStore(selectUserStats);
  const fetchUsers = useUserStore(state => state.fetchUsers);

  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [roleFilter, setRoleFilter] = useState<string | null>(null);

  // Prevent duplicate API calls in React Strict Mode
  const hasLoadedRef = useRef(false);

  // Track authentication state changes to show toast only once
  const prevUserRef = useRef(currentUser);
  useEffect(() => {
    if (!currentUser && prevUserRef.current) {
      // User just became unauthenticated
      showInfo('Please log in to access user management.');
    }
    prevUserRef.current = currentUser;
  }, [currentUser, showInfo]);

  // Handle pagination and filtering changes
  const handleQueryChange = useCallback(async (params: {
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    role?: string | string[];
    displayName?: string;
    search?: string;
    isActive?: string | string[];
    createdAtFrom?: string;
    createdAtTo?: string;
    updatedAtFrom?: string;
    updatedAtTo?: string;
    lastLoginFrom?: string;
    lastLoginTo?: string;
  }) => {
    try {
      // Extract role from params
      let roleParam: UserRole | undefined;
      if (params.role !== undefined) {
        // Handle both single value and array from column filters
        const roleValue = Array.isArray(params.role) ? params.role[0] : params.role;
        if (roleValue) {
          roleParam = roleValue as UserRole;
          setRoleFilter(roleValue);
        } else {
          // Empty array or falsy value means clear filter
          roleParam = undefined;
          setRoleFilter(null);
        }
      } else {
        roleParam = roleFilter as UserRole | undefined;
      }

      // Extract status/isActive filter
      let isActiveParam: boolean | undefined;
      if (params.isActive !== undefined) {
        const statusValue = Array.isArray(params.isActive) ? params.isActive[0] : params.isActive;
        if (statusValue === "true") {
          isActiveParam = true;
        } else if (statusValue === "false") {
          isActiveParam = false;
        } else {
          isActiveParam = undefined;
        }
      }

      // Build query params - use 'search' parameter as expected by backend
      const queryParams: UserListParams = {
        page: params.page,
        limit: params.limit,
        search: params.search,
        searchField: params.search ? 'email' : undefined,
        displayName: params.displayName,
        role: roleParam,
        isActive: isActiveParam,
        sortBy: (params.sortBy as SortBy) || SortBy.CREATED_AT,
        sortOrder: params.sortOrder === "desc" ? SortOrder.DESC : SortOrder.ASC,
        createdAtFrom: params.createdAtFrom,
        createdAtTo: params.createdAtTo,
        updatedAtFrom: params.updatedAtFrom,
        updatedAtTo: params.updatedAtTo,
        lastLoginFrom: params.lastLoginFrom,
        lastLoginTo: params.lastLoginTo,
      };

      await fetchUsers(queryParams);
    } catch (error) {
      logger.error('Error loading users with pagination', { error });
      showError?.('Failed to load users');
    }
  }, [fetchUsers, showError, roleFilter]);


  // Load users on mount and when needed
  const loadUsers = useCallback(async (filters?: { role?: string }) => {
    try {
      const params: UserListParams = {
        page: 1,
        limit: 20, // Standard pagination
        role: filters?.role as UserRole | undefined, // Cast to UserRole enum
        sortBy: SortBy.CREATED_AT, // Sort by creation date
        sortOrder: SortOrder.DESC, // Latest users first
      };

      await fetchUsers(params);
      // fetchUsers updates the pagination state in the store
    } catch (error) {
      logger.error('Error loading users', { error });
      showError?.('Failed to load users');
    }
  }, [fetchUsers, showError]);

  // Load users on mount (prevent duplicate calls in React Strict Mode)
  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadUsers();
    }
  }, [loadUsers]);

  // Reload users when role filter changes
  useEffect(() => {
    if (hasLoadedRef.current) {
      loadUsers({ role: roleFilter || undefined });
    }
  }, [roleFilter, loadUsers]);

  // Handle date range changes - now triggers server-side filtering
  const handleDateRangeChange = useCallback((values: { range: { from?: Date; to?: Date } }) => {
    const newDateRange = values.range.from ? {
      from: values.range.from,
      to: values.range.to,
    } : {};

    setDateRange(newDateRange);

    // Build date field parameters for createdAt (default)
    const dateFieldParams: Record<string, string | undefined> = {};
    if (newDateRange.from) {
      dateFieldParams['createdAtFrom'] = newDateRange.from.toISOString();
    }
    if (newDateRange.to) {
      dateFieldParams['createdAtTo'] = newDateRange.to.toISOString();
    }

    // Trigger server-side filtering with date range
    handleQueryChange({
      page: 1, // Reset to page 1 when filtering changes
      limit: 20,
      role: roleFilter || undefined,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      ...dateFieldParams,
    });
  }, [roleFilter, handleQueryChange]);

  // Handle role filtering
  const handleRoleFilter = useCallback((role: string | null) => {
    setRoleFilter(role);
  }, []);

  return (
    <UserManagement
      currentUser={currentUser as unknown as User}
      users={users}
      isLoading={loadingUsers}
      onLoadUsers={loadUsers}
      dateRange={dateRange}
      onDateRangeChange={handleDateRangeChange}
      onQueryChange={handleQueryChange}
      pageCount={userPagination.totalPages}
      totalCount={userStats?.total}
    />
  );
}
