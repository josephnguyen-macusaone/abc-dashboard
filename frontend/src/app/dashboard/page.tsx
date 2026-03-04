'use client';

import nextDynamic from 'next/dynamic';
import { ProtectedRoute } from '@/presentation/components/routes';
import { AccessDeniedPage } from '@/presentation/components/pages';
import { LoadingOverlay } from '@/presentation/components/atoms';

const DashboardPage = nextDynamic(
  () =>
    import('@/presentation/components/pages/dashboard/dashboard-page').then((m) => ({
      default: m.DashboardPage,
    })),
  {
    loading: () => <LoadingOverlay text="Loading dashboard..." />,
    ssr: false, // Skip SSR for heavy dashboard; server sends shell, client loads content (faster first response)
  }
);

export default function Dashboard() {
  return (
    <ProtectedRoute
      fallback={
        <AccessDeniedPage message="You don't have permission to access the dashboard." />
      }
    >
      <DashboardPage />
    </ProtectedRoute>
  );
}
