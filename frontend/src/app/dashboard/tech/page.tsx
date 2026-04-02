'use client';

import { ProtectedRoute } from '@/presentation/components/routes';
import { AccessDeniedPage } from '@/presentation/components/pages';
import { TechRoleDashboardPage } from '@/presentation/components/pages/dashboard';

export default function TechDashboardRoutePage() {
  return (
    <ProtectedRoute
      fallback={
        <AccessDeniedPage message="You don't have permission to access the dashboard." />
      }
    >
      <TechRoleDashboardPage />
    </ProtectedRoute>
  );
}
