'use client';

import nextDynamic from 'next/dynamic';
import { ProtectedRoute } from '@/presentation/components/routes';
import { AccessDeniedPage } from '@/presentation/components/pages';
import { LoadingOverlay } from '@/presentation/components/atoms';

const UsersContent = nextDynamic(
  () =>
    import('@/presentation/components/pages/dashboard/users-page-content').then((m) => ({
      default: m.UsersContent,
    })),
  {
    loading: () => <LoadingOverlay text="Loading user management..." />,
    ssr: false, // Server never loads DashboardTemplate; avoids 20–30s render
  }
);

export default function UsersPage() {
  return (
    <ProtectedRoute
      fallback={
        <AccessDeniedPage message="You don't have permission to access user management." />
      }
    >
      <UsersContent />
    </ProtectedRoute>
  );
}
