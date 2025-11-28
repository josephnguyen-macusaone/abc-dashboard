'use client';

import { useState } from 'react';
import { UsersList, UserCreateForm } from '@/presentation/components/organisms';
import { Button } from '@/presentation/components/atoms/ui/button';
import { Typography } from '@/presentation/components/atoms';

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

  return (
    <UsersList
      onCreateUser={handleCreateUser}
      refreshTrigger={refreshTrigger}
    />
  );
}
