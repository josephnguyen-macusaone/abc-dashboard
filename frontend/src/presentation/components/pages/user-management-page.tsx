'use client';

import { useState } from 'react';
import { UsersList } from '@/presentation/components/organisms/users-list';
import { UserCreateForm } from '@/presentation/components/organisms/user-create-form';

interface UserManagementPageProps {
  initialView?: 'list' | 'create';
}

export function UserManagementPage({ initialView = 'list' }: UserManagementPageProps) {
  const [currentView, setCurrentView] = useState<'list' | 'create'>(initialView);
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
  };

  if (currentView === 'create') {
    return (
      <div className="space-y-4">
        <button
          onClick={handleCancel}
          className="text-blue-600 hover:text-blue-800 underline"
        >
          ← Back to User List
        </button>
        <UserCreateForm
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </div>
    );
  }

  return (
    <UsersList
      onCreateUser={handleCreateUser}
      refreshTrigger={refreshTrigger}
    />
  );
}
