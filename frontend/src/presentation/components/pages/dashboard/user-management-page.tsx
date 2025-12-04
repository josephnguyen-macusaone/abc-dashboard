'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
      users={users}
      isLoading={loading.getUsers}
      onLoadUsers={loadUsers}
    />
  );
}
