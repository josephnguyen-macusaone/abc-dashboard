import { ProtectedRoute } from '@/presentation/components/routes';
import { AccessDeniedPage, LicenseManagementPage } from '@/presentation/components/pages';
import { DashboardTemplate } from '@/presentation/components/templates';
import { USER_ROLES } from '@/shared/constants';

// Force dynamic rendering for this protected route
export const dynamic = 'force-dynamic';

export default function LicensesPage() {
  return (
    <ProtectedRoute fallback={
      <AccessDeniedPage
        message="You don't have permission to access license management."
      />
    }>
      <DashboardTemplate>
        <div className="space-y-8">
          <LicenseManagementPage />
        </div>
      </DashboardTemplate>
    </ProtectedRoute>
  );
}