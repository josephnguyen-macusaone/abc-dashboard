'use client';

import nextDynamic from 'next/dynamic';
import { ProtectedRoute } from '@/presentation/components/routes';
import { AccessDeniedPage } from '@/presentation/components/pages';
import { LoadingOverlay } from '@/presentation/components/atoms';

const LicensesContent = nextDynamic(
  () =>
    import('@/presentation/components/pages/dashboard/licenses-page-content').then((m) => ({
      default: m.LicensesContent,
    })),
  {
    loading: () => <LoadingOverlay text="Loading license management..." />,
    ssr: false, // Server never loads DashboardTemplate; avoids 20–30s render
  }
);

export default function LicensesPage() {
  return (
    <ProtectedRoute
      fallback={
        <AccessDeniedPage message="You don't have permission to access license management." />
      }
    >
      <LicensesContent />
    </ProtectedRoute>
  );
}
