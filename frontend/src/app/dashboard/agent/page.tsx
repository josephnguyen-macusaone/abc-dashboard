'use client';

import { ProtectedRoute } from '@/presentation/components/routes';
import { AccessDeniedPage } from '@/presentation/components/pages';
import { AgentRoleDashboardPage } from '@/presentation/components/pages/dashboard';

export default function AgentDashboardRoutePage() {
  return (
    <ProtectedRoute
      fallback={
        <AccessDeniedPage message="You don't have permission to access the dashboard." />
      }
    >
      <AgentRoleDashboardPage />
    </ProtectedRoute>
  );
}
