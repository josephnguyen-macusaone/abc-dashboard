'use client';

import { useState } from 'react';
import { UsersList, UserCreateForm, UserEditForm } from '@/presentation/components/organisms';
import { UserDeleteDialog } from '@/presentation/components/organisms/user-management/user-delete-dialog';
import { User } from '@/application/dto/user-dto';
import { Button } from '@/presentation/components/atoms/ui/button';
import { Typography } from '@/presentation/components/atoms';

interface UserManagementPageProps {
  initialView?: 'list' | 'create' | 'edit' | 'delete';
}

export function UserManagementPage({ initialView = 'list' }: UserManagementPageProps) {
  const [currentView, setCurrentView] = useState<'list' | 'create' | 'edit' | 'delete'>(initialView);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleCreateUser = () => {
    setCurrentView('create');
  };

  const handleSuccess = () => {
    // Refresh the data and go back to list view
    setRefreshTrigger(prev => prev + 1);
    setCurrentView('list');
  };

  const handleCancel = () => {
    setCurrentView('list');
    setSelectedUser(null);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setCurrentView('edit');
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setCurrentView('delete');
  };

  if (currentView === 'create') {
    return (
      <div className="space-y-4">
        <Button
          variant="link"
          onClick={handleCancel}
          className="p-0 h-auto text-body-s text-primary hover:text-primary/80"
        >
          ← Back to User List
        </Button>
        <UserCreateForm
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </div>
    );
  }

  if (currentView === 'edit' && selectedUser) {
    return (
      <div className="space-y-4">
        <Button
          variant="link"
          onClick={handleCancel}
          className="p-0 h-auto text-body-s text-primary hover:text-primary/80"
        >
          ← Back to User List
        </Button>
        <UserEditForm
          user={selectedUser}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
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
        onSuccess={() => {
          setRefreshTrigger(prev => prev + 1);
          setCurrentView('list');
          setSelectedUser(null);
        }}
      />
    );
  }

  return (
    <UsersList
      onCreateUser={handleCreateUser}
      onEditUser={handleEditUser}
      onDeleteUser={handleDeleteUser}
      refreshTrigger={refreshTrigger}
    />
  );
}
