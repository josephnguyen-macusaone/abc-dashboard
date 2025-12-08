'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/presentation/contexts/auth-context';
import { useUser } from '@/presentation/contexts/user-context';
import { useToast } from '@/presentation/contexts/toast-context';
import { UserManagement } from '@/presentation/components/organisms/user-management';
import { User, UserRole } from '@/domain/entities/user-entity';
import { UserListParams } from '@/application/dto/user-dto';
import { SortBy, SortOrder } from '@/shared/types';
import { DashboardTemplate } from '@/presentation/components/templates';
import { logger } from '@/shared/utils';

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
  const { getUsers, loading } = useUser();
  const { error: showError } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [roleFilter, setRoleFilter] = useState<string | null>(null);

  // Prevent duplicate API calls in React Strict Mode
  const hasLoadedRef = useRef(false);

  // Load users on mount and when needed
  const loadUsers = useCallback(async (filters?: { search?: string; role?: string }) => {
    try {
      const params: UserListParams = {
        page: 1,
        limit: 100, // Get all users for now
        email: filters?.search, // Search by email (supports partial matches via backend regex)
        role: filters?.role as UserRole | undefined, // Cast to UserRole enum
        sortBy: SortBy.CREATED_AT, // Sort by creation date
        sortOrder: SortOrder.DESC, // Latest users first
      };

      const result = await getUsers(params);
      setUsers(result.users || []);
    } catch (error) {
      logger.error('Error loading users', { error });
      showError?.('Failed to load users');
    }
  }, [getUsers, showError]);

  // Load users on mount (prevent duplicate calls in React Strict Mode)
  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadUsers();
    }
  }, [loadUsers]);

  // Filter users by date range and role
  const filteredUsers = useMemo(() => {
    let filtered = users;

    // Apply role filter first
    if (roleFilter) {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    // Apply date range filter
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
  }, [users, dateRange, roleFilter]);

  // Handle date range changes
  const handleDateRangeChange = useCallback((values: { range: { from: Date; to: Date | undefined }; rangeCompare?: any }) => {
    // If the range has no "to" date, it means clear was pressed
    if (values.range.from && !values.range.to) {
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
      isLoading={loading.getUsers}
      onLoadUsers={loadUsers}
      dateRange={dateRange}
      onDateRangeChange={handleDateRangeChange}
      onRoleFilter={handleRoleFilter}
    />
  );
}
