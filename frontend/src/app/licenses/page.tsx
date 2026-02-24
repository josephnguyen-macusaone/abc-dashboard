import nextDynamic from 'next/dynamic';
import { ProtectedRoute } from '@/presentation/components/routes';
import { AccessDeniedPage } from '@/presentation/components/pages';
import { DashboardTemplate } from '@/presentation/components/templates';

const LicenseManagementPage = nextDynamic(
  () =>
    import('@/presentation/components/pages/dashboard/license-management-page').then((m) => ({
      default: m.LicenseManagementPage,
    })),
  { loading: () => <div className="flex min-h-[200px] items-center justify-center" /> }
);

// Force dynamic rendering for this protected route
export const dynamic = 'force-dynamic';

export default function LicensesPage() {
  return (
    <ProtectedRoute
      fallback={
        <AccessDeniedPage message="You don't have permission to access license management." />
      }
    >
      <DashboardTemplate>
        <div className="space-y-8">
          <LicenseManagementPage />
        </div>
      </DashboardTemplate>
    </ProtectedRoute>
  );
}