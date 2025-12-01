'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button, Typography } from '@/presentation/components/atoms';
import {
  UserStatsCards,
  UserFilters,
  UserTable,
  UserFormModal,
} from '@/presentation/components/molecules/user-management';
import { UserCreateForm } from './user-create-form';
import { UserEditForm } from './user-edit-form';
import { UserDeleteDialog } from './user-delete-dialog';
import { cn } from '@/shared/utils';
import type { User } from '@/domain/entities/user-entity';
import { canManageRole } from '@/shared/constants';
import { UserPlus } from 'lucide-react';
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
  const [roleFilter, setRoleFilter] = useState<'admin' | 'manager' | 'staff' | 'all'>('all');
  const [currentView, setCurrentView] = useState<'list' | 'create' | 'edit' | 'delete' | 'changePassword'>('list');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const toast = useToast();
  // Load users with filters
  const handleLoadUsers = useCallback(async () => {
    try {
      await onLoadUsers?.({
        search: searchTerm || undefined,
        role: roleFilter !== 'all' ? roleFilter : undefined,
      });
    } catch (err) {
      const error = err as Error;
      console.error('Error loading users:', error);
      onError?.(error.message || 'Failed to load users');
    }
  }, [searchTerm, roleFilter, onLoadUsers, onError]);

  // Load users on mount
  useEffect(() => {
    onLoadUsers?.({}); // Load all users initially
  }, [onLoadUsers]); // Only on mount or when onLoadUsers changes

  // Update filters and reload when search or role changes
  useEffect(() => {
    const timer = setTimeout(() => {
      handleLoadUsers();
    }, 300); // Debounce search

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

  const handleChangePassword = (user: User) => {
    setSelectedUser(user);
    setCurrentView('changePassword');
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

  const canEditUser = (user: User) => {
    const canEdit = currentUser.role === 'admin' && canManageRole(currentUser.role, user.role);
    return canEdit;
  };

  const canDeleteUser = (user: User) => {
    const canDelete = currentUser.role === 'admin' && canManageRole(currentUser.role, user.role);
    return canDelete;
  };

  // Render different views
  if (currentView === 'create') {
    return (
      <div className="space-y-4">
        <Button
          variant="link"
          onClick={handleFormCancel}
          className="p-0 h-auto text-body-s text-primary hover:text-primary/80"
        >
          ← Back to User List
        </Button>
        <UserCreateForm
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      </div>
    );
  }

  if (currentView === 'edit' && selectedUser) {
    return (
      <div className="space-y-4">
        <Button
          variant="link"
          onClick={handleFormCancel}
          className="p-0 h-auto text-body-s text-primary hover:text-primary/80"
        >
          ← Back to User List
        </Button>
        <UserEditForm
          user={selectedUser}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      </div>
    );
  }

  if (currentView === 'delete' && selectedUser) {
    return (
      <UserDeleteDialog
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
        <Button
          variant="link"
          onClick={handleFormCancel}
          className="p-0 h-auto text-body-s text-primary hover:text-primary/80"
        >
          ← Back to User List
        </Button>
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

          {currentUser.role === 'admin' && (
            <Button onClick={handleCreateUser}>
              <UserPlus className="h-4 w-4" />
              <Typography variant="button-m">Add User</Typography>
            </Button>
          )}
        </div>

        {/* Statistics */}
        <UserStatsCards users={users} isLoading={isLoading} />

      {/* Filters */}
      <UserFilters
        searchTerm={searchTerm}
        roleFilter={roleFilter}
        onSearchChange={setSearchTerm}
        onRoleFilterChange={setRoleFilter}
        onClearFilters={async () => {
          setSearchTerm('');
          setRoleFilter('all');
          // Explicitly refetch users with cleared filters
          try {
            await onLoadUsers?.({});
          } catch (err) {
            const error = err as Error;
            onError?.(error.message || 'Failed to clear filters');
            toast.error('Failed to clear filters');
          }
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
        onChangePassword={handleChangePassword}
        onCreateFirst={handleCreateUser}
        isLoading={isLoading}
      />
    </div>
  );
}