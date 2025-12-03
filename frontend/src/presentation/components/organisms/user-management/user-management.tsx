'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button, Typography } from '@/presentation/components/atoms';
import {
  UserStatsCards,
  UserFilters,
  UserTable,
  UserFormModal,
} from '@/presentation/components/molecules/domain/user-management';
import { UserCreateForm } from './user-create-form';
import { UserEditForm } from './user-edit-form';
import { UserDeleteForm } from './user-delete-form';
import { cn } from '@/shared/utils';
import type { User } from '@/domain/entities/user-entity';
import { canManageRole, USER_ROLES, PermissionUtils } from '@/shared/constants';
import { UserPlus, ArrowLeft } from 'lucide-react';
import { useToast } from '@/presentation/contexts/toast-context';

interface UserManagementProps {
  currentUser: User;
  users: User[];
  isLoading?: boolean;
  onUserCreate?: (user: Partial<User>) => Promise<void>;
  onUserUpdate?: (userId: string, updates: Partial<User>) => Promise<void>;
  onUserDelete?: (userId: string) => Promise<void>;
  onLoadUsers?: (filters?: { search?: string; role?: string }) => Promise<void>;
  onCreateUser?: (userData: { username: string; role: string; password?: string }) => Promise<void>;
  onUpdateUserPassword?: (userId: string, passwordData: { oldPassword: string; newPassword: string; confirmPassword: string }) => Promise<void>;
  onDeleteUser?: (userId: string) => Promise<void>;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
  className?: string;
}

export function UserManagement({
  currentUser,
  users,
  isLoading = false,
  onUserCreate,
  onUserUpdate,
  onUserDelete,
  onLoadUsers,
  onCreateUser,
  onUpdateUserPassword,
  onDeleteUser,
  onSuccess,
  onError,
  className
}: UserManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'admin' | 'manager' | 'staff' | 'all'>('all'); // TODO: Use USER_ROLES type
  const [currentView, setCurrentView] = useState<'list' | 'create' | 'edit' | 'delete' | 'changePassword'>('list');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const toast = useToast();
  // Load users with filters (debounced)
  const handleLoadUsers = useCallback(async () => {
    try {
      await onLoadUsers?.({
        search: searchTerm || undefined,
        role: roleFilter !== 'all' ? roleFilter : undefined,
      });
    } catch (err) {
      const error = err as Error;
      onError?.(error.message || 'Failed to load users');
    }
  }, [searchTerm, roleFilter, onLoadUsers, onError]);

  // Load users on mount
  useEffect(() => {
    onLoadUsers?.({}); // Load all users initially
  }, [onLoadUsers]); // Only on mount or when onLoadUsers changes

  // Update filters and reload when search or role changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      handleLoadUsers();
    }, 500); // 500ms debounce delay

    return () => clearTimeout(timer);
  }, [searchTerm, roleFilter, handleLoadUsers]);

  // Apply client-side filtering for all filters
  // This ensures filtering works even if API doesn't support it or returns all users
  const filteredUsers = users.filter(user => {
    // Search filter - match against username or display name
    const displayName = user.displayName || user.name || user.username || user.id;
    const matchesSearch = !searchTerm || displayName.toLowerCase().includes(searchTerm.toLowerCase());

    // Role filter
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

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
      <UserCreateForm
        onSuccess={handleFormSuccess}
        onCancel={handleFormCancel}
      />
    );
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

  if (currentView === 'changePassword' && selectedUser) {
    return (
      <div className="space-y-4">
        <UserFormModal
          title={`Change Password for ${selectedUser.displayName || selectedUser.username}`}
          user={selectedUser}
          passwordOnly={true}
          onSubmit={async (updates) => {
            // Handle password change
            if (onUpdateUserPassword) {
              const passwordData = updates as any;
              await onUpdateUserPassword(selectedUser.id, {
                oldPassword: passwordData.oldPassword || '',
                newPassword: passwordData.newPassword || '',
                confirmPassword: passwordData.confirmPassword || '',
              });
            }
            handleFormSuccess();
          }}
          onClose={handleFormCancel}
          loading={isLoading}
          open={true}
        />
      </div>
    );
  }

  // Default list view
  return (
    <div className={cn('bg-card border border-border rounded-xl shadow-sm', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-6">
        <div>
          <Typography variant="title-l" className="text-foreground">
            User Management
          </Typography>
          <Typography variant="body-s" color="muted" className="text-muted-foreground mt-0.5">
            Manage user accounts and roles
          </Typography>
        </div>

        {/* Show Add User button for users who can create users (Admin and Manager) */}
        {PermissionUtils.canCreateUser(currentUser.role) && (
          <Button onClick={handleCreateUser}>
            <UserPlus className="h-4 w-4" />
            <Typography variant="button-s">Add User</Typography>
          </Button>
        )}
      </div>

      {/* Statistics */}
      <UserStatsCards
        users={users}
        isLoading={isLoading}
        className="px-6"
      />

      {/* Filters */}
      <UserFilters
        searchTerm={searchTerm}
        roleFilter={roleFilter}
        onSearchChange={setSearchTerm}
        onRoleFilterChange={setRoleFilter}
        onClearFilters={async () => {
          setSearchTerm('');
          setRoleFilter('all');
          await toast.promise(
            onLoadUsers?.({}) || Promise.resolve(),
            {
              loading: 'Refreshing user list...',
              success: 'Filters cleared successfully',
              error: (error: any) => {
                onError?.(error.message || 'Failed to clear filters');
                return 'Failed to clear filters';
              }
            }
          );
        }}
      />

      {/* Users Table */}
      <UserTable
        users={filteredUsers}
        currentUser={currentUser}
        canEdit={canEditUser}
        canDelete={canDeleteUser}
        onEdit={handleEditUser}
        onDelete={handleDeleteUser}
        onCreateFirst={handleCreateUser}
        isLoading={isLoading}
      />
    </div>
  );
}