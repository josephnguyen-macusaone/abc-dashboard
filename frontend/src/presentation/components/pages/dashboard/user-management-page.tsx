'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/presentation/contexts/auth-context';
import { useToast } from '@/presentation/contexts/toast-context';
import { UserManagement } from '@/presentation/components/organisms/user-management';
import { User } from '@/domain/entities/user-entity';
import { logger } from '@/shared/helpers';
import { useUserStore } from '@/infrastructure/stores/user';
import { ApiExceptionDto } from '@/application/dto/api-dto';

// Helper function to check if error should be shown to user
const shouldShowError = (error: unknown): boolean => {
  // Don't show errors that have been handled by auth system (redirecting to login)
  if (error instanceof ApiExceptionDto && error.authHandled) {
    return false;
  }
  return true;
};

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

  const userStore = useUserStore();
  const { users, fetchUsers } = userStore;
  const userFilters = userStore.filters;
  const userPagination = userStore.pagination;
  const userStats = userStore.stats;
  const loadingUsers = userStore.listLoading;

  // Prevent duplicate API calls in React Strict Mode
  const hasLoadedRef = useRef(false);

  // Derive dateRange from store filters (like license implementation)
  const dateRange = useMemo(() => {
    if (userFilters.createdAtFrom || userFilters.createdAtTo) {
      return {
        from: userFilters.createdAtFrom ? new Date(userFilters.createdAtFrom) : undefined,
        to: userFilters.createdAtTo ? new Date(userFilters.createdAtTo) : undefined,
      };
    }
    return {};
  }, [userFilters.createdAtFrom, userFilters.createdAtTo]);

  // Track authentication state changes to show toast only once
  const prevUserRef = useRef(currentUser);
  useEffect(() => {
    if (!currentUser && prevUserRef.current) {
      // User just became unauthenticated
      showInfo('Please log in to access user management.');
    }
    prevUserRef.current = currentUser;
  }, [currentUser, showInfo]);

  // Handle pagination and filtering changes (simplified like admin-dashboard)
  const handleQueryChange = useCallback(async (params: {
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    role?: string | string[];
    displayName?: string;
    search?: string;
    searchField?: string;
    isActive?: string | string[];
    createdAtFrom?: string;
    createdAtTo?: string;
    updatedAtFrom?: string;
    updatedAtTo?: string;
    lastLoginFrom?: string;
    lastLoginTo?: string;
  }) => {
    try {
      // Convert string values to appropriate types for store
      const storeParams: any = {
        ...params,
        // searchField stays as string, store interface accepts it
        // role: can be string | string[], store accepts UserRole | UserRole[]
        // isActive: convert string | string[] to boolean | boolean[]
        isActive: params.isActive !== undefined
          ? (Array.isArray(params.isActive)
            ? params.isActive.map(v => v === 'true')
            : params.isActive === 'true')
          : undefined,
      };

      // Store handles merging with current filters
      await fetchUsers(storeParams);
    } catch (error) {
      logger.error('Failed to fetch users', { error });
      if (shouldShowError(error)) {
        showError?.('Failed to load users');
      }
    }
  }, [fetchUsers, showError]);


  // Load users on mount (simplified)
  const loadUsers = useCallback(async () => {
    try {
      await fetchUsers({
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
    } catch (error) {
      logger.error('Error loading users', { error });
      if (shouldShowError(error)) {
        showError?.('Failed to load users');
      }
    }
  }, [fetchUsers, showError]);

  // Load users on mount (prevent duplicate calls in React Strict Mode)
  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadUsers();
    }
  }, [loadUsers]);

  // Handle date range changes (simplified)
  const handleDateRangeChange = useCallback((values: { range: { from?: Date; to?: Date } }) => {
    const dateFieldParams: Record<string, string | undefined> = {};

    if (values.range.from) {
      dateFieldParams['createdAtFrom'] = values.range.from.toISOString();
    }
    if (values.range.to) {
      dateFieldParams['createdAtTo'] = values.range.to.toISOString();
    }

    // Trigger server-side filtering with date range
    handleQueryChange({
      page: 1,
      limit: 20,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      ...dateFieldParams,
    });
  }, [handleQueryChange]);

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
      totalCount={userPagination.total}
    />
  );
}
