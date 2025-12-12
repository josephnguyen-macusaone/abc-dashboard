'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/presentation/contexts/auth-context';
import { useToast } from '@/presentation/contexts/toast-context';
import { UserManagement } from '@/presentation/components/organisms/user-management';
import { User, UserRole } from '@/domain/entities/user-entity';
import { UserListParams } from '@/application/dto/user-dto';
import { SortBy, SortOrder } from '@/shared/types';
import { DashboardTemplate } from '@/presentation/components/templates';
import { logger } from '@/shared/utils';
import { useUserStore, selectUsers, selectUserLoading, selectUserPagination } from '@/infrastructure/stores/user-store';

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
  const { error: showError } = useToast();

  const users = useUserStore(selectUsers);
  const loadingUsers = useUserStore(selectUserLoading);
  const userPagination = useUserStore(selectUserPagination);
  const fetchUsers = useUserStore(state => state.fetchUsers);
  const getUserStats = useUserStore(state => state.getUserStats);

  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [userStats, setUserStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Prevent duplicate API calls in React Strict Mode
  const hasLoadedRef = useRef(false);

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
  }) => {
    try {
      // Extract role from params or use current roleFilter
      let roleParam: UserRole | undefined;
      if (params.role !== undefined) {
        // Handle both single value and array from column filters
        const roleValue = Array.isArray(params.role) ? params.role[0] : params.role;
        if (roleValue) {
          roleParam = roleValue as UserRole;
          // Update the roleFilter state to keep UI in sync
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

      const queryParams: UserListParams = {
        page: params.page,
        limit: params.limit,
        email: params.search, // Use search as email filter
        displayName: params.displayName,
        role: roleParam,
        isActive: isActiveParam,
        sortBy: (params.sortBy as SortBy) || SortBy.CREATED_AT,
        sortOrder: params.sortOrder === "desc" ? SortOrder.DESC : SortOrder.ASC,
      };

      await fetchUsers(queryParams);
      // fetchUsers updates the pagination state in the store
    } catch (error) {
      logger.error('Error loading users with pagination', { error });
      showError?.('Failed to load users');
    }
  }, [fetchUsers, showError, roleFilter]);

  // Load user stats
  const loadUserStats = useCallback(async () => {
    try {
      setLoadingStats(true);
      const stats = await getUserStats();
      setUserStats(stats);
    } catch (error) {
      logger.error('Error loading user stats', { error });
    } finally {
      setLoadingStats(false);
    }
  }, [getUserStats]);

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

  // Load users and stats on mount (prevent duplicate calls in React Strict Mode)
  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadUsers();
      loadUserStats();
    }
  }, [loadUsers, loadUserStats]);

  // Reload users when role filter changes
  useEffect(() => {
    if (hasLoadedRef.current) {
      loadUsers({ role: roleFilter || undefined });
    }
  }, [roleFilter, loadUsers]);

  // Filter users by date range (role filtering is now handled server-side)
  const filteredUsers = useMemo(() => {
    let filtered = users;

    // Apply date range filter only (role filtering is server-side)
    if (dateRange.from || dateRange.to) {
      filtered = filtered.filter(user => {
        if (!user.createdAt) return false;

        const userDate = new Date(user.createdAt);
        const fromDate = dateRange.from ? new Date(dateRange.from) : null;
        const toDate = dateRange.to ? new Date(dateRange.to) : null;

        // Set toDate to end of day for inclusive filtering
        if (toDate) {
          toDate.setHours(23, 59, 59, 999);
        }

        if (fromDate && userDate < fromDate) return false;
        if (toDate && userDate > toDate) return false;

        return true;
      });
    }

    return filtered;
  }, [users, dateRange]);

  // Handle date range changes
  const handleDateRangeChange = useCallback((values: { range: { from?: Date; to?: Date } }) => {
    // If the range has no "from" date, it means clear was pressed
    if (!values.range.from) {
      setDateRange({}); // Clear the date range
    } else {
      setDateRange({
        from: values.range.from,
        to: values.range.to,
      });
    }
  }, []);

  // Handle role filtering
  const handleRoleFilter = useCallback((role: string | null) => {
    setRoleFilter(role);
  }, []);

  if (!currentUser) {
    return (
      <DashboardTemplate>
        <div className="text-center py-8">
          <p>Please log in to access user management.</p>
        </div>
      </DashboardTemplate>
    );
  }

  return (
    <UserManagement
      currentUser={currentUser}
      users={filteredUsers}
      isLoading={loadingUsers}
      onLoadUsers={loadUsers}
      dateRange={dateRange}
      onDateRangeChange={handleDateRangeChange}
      onRoleFilter={handleRoleFilter}
      activeRoleFilter={roleFilter}
      onQueryChange={handleQueryChange}
      pageCount={userPagination.totalPages}
      totalCount={userPagination.total}
      userStats={userStats}
      isLoadingStats={loadingStats}
    />
  );
}
