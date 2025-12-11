'use client';

import { useState, useEffect, useCallback } from 'react';
import { Typography } from '@/presentation/components/atoms';
import { UserStatsCards } from '@/presentation/components/molecules/domain/user-management';
import { UsersDataTable } from '@/presentation/components/molecules/domain/user-management';
import { DateRangeFilterCard } from '@/presentation/components/molecules/domain/dashboard/date-range-filter-card';
import { UserManagementSkeleton } from './user-management-skeleton';
import { UserCreateForm } from './user-create-form';
import { UserEditForm } from './user-edit-form';
import { UserDeleteForm } from './user-delete-form';
import { UserFormTemplate } from '@/presentation/components/templates';
import { cn } from '@/shared/utils';
import type { User } from '@/domain/entities/user-entity';
import { PermissionUtils } from '@/shared/constants';

/**
 * UserManagement Component
 *
 * Orchestrates the user management UI including:
 * - User list view with data table
 * - Create/Edit/Delete form views
 * - Statistics cards
 *
 * Note: CRUD operations are handled directly by form components
 * which access UserContext internally. This component only manages
 * view state and passes the refresh callback.
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
  /** Callback when role filter is applied */
  onRoleFilter?: (role: string | null) => void;
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
  onRoleFilter,
  className
}: UserManagementProps) {
  const [currentView, setCurrentView] = useState<'list' | 'create' | 'edit' | 'delete'>('list');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const handleDateRangeUpdate = useCallback(
    (values: { range: { from?: Date; to?: Date } }) => {
      onDateRangeChange?.(values);
      onLoadUsers?.({});
    },
    [onDateRangeChange, onLoadUsers]
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
    // Refresh the data and go back to list view
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
  // - Manager can edit staff only
  const canEditUser = (user: User) => {
    return PermissionUtils.canUpdateTargetUser(
      currentUser.role,
      currentUser.id,
      user.id,
      user.role
    );
  };

  // Check if current user can delete a target user
  // - Users CANNOT delete themselves
  // - Admin can delete anyone EXCEPT other admins
  // - Manager can delete staff only
  // - Staff cannot delete anyone
  const canDeleteUser = (user: User) => {
    return PermissionUtils.canDeleteTargetUser(
      currentUser.role,
      currentUser.id,
      user.id,
      user.role
    );
  };

  // Render different views
  if (currentView === 'create') {
    return (
      <UserFormTemplate onBack={handleFormCancel}>
        <UserCreateForm
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      </UserFormTemplate>
    );
  }

  if (currentView === 'edit' && selectedUser) {
    return (
      <UserFormTemplate onBack={handleFormCancel}>
        <UserEditForm
          user={selectedUser}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      </UserFormTemplate>
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

  // Loading state
  if (isLoading) {
    return (
      <UserManagementSkeleton
        showDateFilter={!!onDateRangeChange}
        className={className}
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
      <div className="mb-5">
        <UserStatsCards
          users={users}
          isLoading={isLoading}
          onRoleFilter={onRoleFilter}
        />
      </div>

      {/* Users Table */}
      <UsersDataTable
        data={users}
        currentUser={currentUser}
        canEdit={canEditUser}
        canDelete={canDeleteUser}
        onEdit={handleEditUser}
        onDelete={handleDeleteUser}
        onCreateUser={PermissionUtils.canCreateUser(currentUser.role) ? handleCreateUser : undefined}
        isLoading={isLoading}
      />
    </div>
  );
}