'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/presentation/contexts/auth-context';
import { useUser } from '@/presentation/contexts/user-context';
import { useToast } from '@/presentation/contexts/toast-context';
import { UserManagement } from '@/presentation/components/organisms/user-management';
import { User, UserRole } from '@/domain/entities/user-entity';
import { UserListParams } from '@/application/dto/user-dto';
import { DashboardTemplate } from '@/presentation/components/templates';

export function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const { getUsers, createUser, updateUser, deleteUser, loading } = useUser();
  const { success: showSuccess, error: showError } = useToast();

  const [users, setUsers] = useState<User[]>([]);

  // Load users on mount and when needed
  const loadUsers = useCallback(async (filters?: { search?: string; role?: string }) => {
    try {
      const params: UserListParams = {
        page: 1,
        limit: 100, // Get all users for now
        email: filters?.search, // Search by email (supports partial matches via backend regex)
        role: filters?.role as UserRole | undefined, // Cast to UserRole enum
      };

      const result = await getUsers(params);
      setUsers(result.users || []);
    } catch (error) {
      console.error('Error loading users:', error);
      showError?.('Failed to load users');
    }
  }, [getUsers, showError]);

  // Load users on mount
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Handle user creation
  const handleCreateUser = useCallback(async (userData: { username: string; role: string; password?: string; firstName?: string; lastName?: string }) => {
    try {
      await createUser({
        username: userData.username,
        email: `${userData.username}@example.com`, // Generate email from username
        firstName: userData.firstName || userData.username,
        lastName: userData.lastName || '',
        role: userData.role as UserRole,
      });

      // Reload users
      await loadUsers();

      showSuccess?.(`User "${userData.username}" created successfully`);
    } catch (error) {
      console.error('Error creating user:', error);
      showError?.('Failed to create user');
      throw error;
    }
  }, [createUser, loadUsers, showSuccess, showError]);

  // Handle user password update (Note: password updates may not be implemented yet)
  const handleUpdateUserPassword = useCallback(async (
    userId: string,
    passwordData: { oldPassword: string; newPassword: string; confirmPassword: string }
  ) => {
    try {
      // For now, password updates are not implemented in the current architecture
      // This would need a separate use case and service method
      console.warn('Password update not implemented yet');

      // For demo purposes, show success
      showSuccess?.('Password update feature not implemented yet');

      // Uncomment when password update is implemented:
      // await updateUser(userId, {
      //   // password fields would go here
      // });
    } catch (error) {
      console.error('Error updating user password:', error);
      showError?.('Failed to update user password');
      throw error;
    }
  }, [showSuccess, showError]);

  // Handle user deletion
  const handleDeleteUser = useCallback(async (userId: string) => {
    try {
      await deleteUser(userId);

      // Reload users
      await loadUsers();

      showSuccess?.('User deleted successfully');
    } catch (error) {
      console.error('Error deleting user:', error);
      showError?.('Failed to delete user');
      throw error;
    }
  }, [deleteUser, loadUsers]);

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
    <div className="space-y-8">
      <UserManagement
        currentUser={currentUser}
        users={users}
        isLoading={loading.getUsers}
        onLoadUsers={loadUsers}
        onCreateUser={handleCreateUser}
        onUpdateUserPassword={handleUpdateUserPassword}
        onDeleteUser={handleDeleteUser}
        onSuccess={showSuccess}
        onError={showError}
      />
    </div>
  );
}
