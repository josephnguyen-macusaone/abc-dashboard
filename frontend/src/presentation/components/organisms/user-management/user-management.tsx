'use client';

import { useState, useCallback } from 'react';
import { Typography } from '@/presentation/components/atoms';
import { UsersDataTable, UserStatsCards } from '@/presentation/components/molecules/domain/user-management';
import { DateRangeFilterCard } from '@/presentation/components/molecules/domain/dashboard/date-range-filter-card';
import { UserCreateForm } from './user-create-form';
import { UserEditForm } from './user-edit-form';
import { UserDeleteForm } from './user-delete-form';
import { cn } from '@/shared/helpers';
import type { User } from '@/domain/entities/user-entity';
import { PermissionUtils } from '@/shared/constants';
import { useUserStore } from '@/infrastructure/stores/user';

/**
 * UserManagement Component
 *
 * Orchestrates the user management UI including:
 * - User list view with data table
 * - Create/Edit/Delete form views
 * - Statistics cards
 *
 * Note: CRUD operations are handled by form components via useUserStore.
 * This component manages view state and passes the refresh callback.
 */
interface UserManagementProps {
  /** Current authenticated user */
  currentUser: User;
  /** List of users to display */
  users: User[];
  /** Loading state for the user list */
  isLoading?: boolean;
  /** Callback to reload users (called after CRUD operations) */
  onLoadUsers?: (filters?: { search?: string; role?: string }) => Promise<void>;
  /** Current date range filter */
  dateRange?: { from?: Date; to?: Date };
  /** Callback when date range changes */
  onDateRangeChange?: (values: { range: { from?: Date; to?: Date } }) => void;
  /** Callback when table query changes (pagination/sort/filter) */
  onQueryChange?: (params: {
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    search?: string;
    searchField?: string;
    role?: string | string[];
    isActive?: string | string[];
    displayName?: string;
    createdAtFrom?: string;
    createdAtTo?: string;
    updatedAtFrom?: string;
    updatedAtTo?: string;
    lastLoginFrom?: string;
    lastLoginTo?: string;
  }) => void;
  /** Server page count for pagination */
  pageCount?: number;
  /** Total number of users */
  totalCount?: number;
  /** Additional CSS classes */
  className?: string;
}

export function UserManagement({
  currentUser,
  users,
  isLoading = false,
  onLoadUsers,
  dateRange,
  onDateRangeChange,
  onQueryChange,
  pageCount,
  totalCount,
  className
}: UserManagementProps) {
  const [currentView, setCurrentView] = useState<'list' | 'create' | 'edit' | 'delete'>('list');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Get stats from store
  const userStore = useUserStore();
  const userStats = userStore.stats;
  const isLoadingStats = userStore.statsLoading;

  const handleDateRangeUpdate = useCallback(
    (values: { range: { from?: Date; to?: Date } }) => {
      onDateRangeChange?.(values);
    },
    [onDateRangeChange]
  );

  // Reload users handler (called after CRUD operations)
  const handleLoadUsers = useCallback(async () => {
    await onLoadUsers?.({});
  }, [onLoadUsers]);

  // Form navigation handlers
  const handleCreateUser = () => {
    setCurrentView('create');
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setCurrentView('edit');
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setCurrentView('delete');
  };

  // Form success/cancel handlers
  const handleFormSuccess = () => {
    handleLoadUsers();
    setCurrentView('list');
    setSelectedUser(null);
  };

  const handleFormCancel = () => {
    setCurrentView('list');
    setSelectedUser(null);
  };

  // Check if current user can edit a target user
  // - Users can edit their own profile
  // - Admin can edit anyone EXCEPT other admins
  // - Managers edit their direct reports (managed_by) of the staff role they own
  const canEditUser = (user: User) => {
    return PermissionUtils.canUpdateTargetUser(
      currentUser.role,
      currentUser.id,
      user.id,
      user.role,
      user.managedBy,
    );
  };

  // Check if current user can delete a target user
  // - Cannot delete yourself
  // - Admin: any role except another admin
  // - Manager: like admin but cannot delete admins or other managers
  const canDeleteUser = (user: User) => {
    return PermissionUtils.canDeleteTargetUser(
      currentUser.role,
      currentUser.id,
      user.id,
      user.role,
      user.managedBy,
    );
  };

  // Create user permission check
  const canCreateUser = PermissionUtils.canCreateUser(currentUser.role);
  const onCreateUserHandler = canCreateUser ? handleCreateUser : undefined;

  // Render different views
  if (currentView === 'create') {
    return <UserCreateForm onSuccess={handleFormSuccess} onCancel={handleFormCancel} />;
  }

  if (currentView === 'edit' && selectedUser) {
    return (
      <UserEditForm
        user={selectedUser}
        onSuccess={handleFormSuccess}
        onCancel={handleFormCancel}
      />
    );
  }

  if (currentView === 'delete' && selectedUser) {
    return (
      <UserDeleteForm
        user={selectedUser}
        open={true}
        onOpenChange={(open) => {
          if (!open) {
            setCurrentView('list');
            setSelectedUser(null);
          }
        }}
        onSuccess={handleFormSuccess}
      />
    );
  }

  // Default list view
  return (
    <div className={cn('bg-card border border-border rounded-xl shadow-sm px-6 py-6', className)}>
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center justify-between">
          <div className="">
            <Typography variant="title-l" className="text-foreground">
              User Management
            </Typography>
            <Typography variant="body-s" color="muted" className="text-muted-foreground mt-1">
              Manage user accounts and roles
            </Typography>
          </div>
          {/* Date Range Filter */}
          {onDateRangeChange && (
            <DateRangeFilterCard
              initialDateFrom={dateRange?.from}
              initialDateTo={dateRange?.to}
              onUpdate={handleDateRangeUpdate}
              align="end"
            />
          )}
        </div>
      </div>

      {/* Statistics */}
      <div className="mb-4">
        <UserStatsCards
          userStats={userStats ?? undefined}
          viewerRole={currentUser.role}
          isLoading={isLoading || isLoadingStats}
        />
      </div>

      {/* Users Table - w-full ensures table stretches to fill container */}
      <div className="w-full min-w-0">
        <UsersDataTable
          data={users}
          currentUser={currentUser}
          canEdit={canEditUser}
          canDelete={canDeleteUser}
          onEdit={handleEditUser}
          onDelete={handleDeleteUser}
          onCreateUser={onCreateUserHandler}
          isLoading={isLoading}
          onQueryChange={onQueryChange}
          pageCount={pageCount}
          totalCount={totalCount}
        />
      </div>
    </div>
  );
}