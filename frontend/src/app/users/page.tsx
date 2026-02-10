import { ProtectedRoute } from '@/presentation/components/routes';
import { AccessDeniedPage, UserManagementPage } from '@/presentation/components/pages';
import { DashboardTemplate } from '@/presentation/components/templates';
import { USER_ROLES } from '@/shared/constants';

// Force dynamic rendering for this protected route
export const dynamic = 'force-dynamic';

export default function UsersPage() {
  return (
    <ProtectedRoute fallback={
      <AccessDeniedPage
        message="You don't have permission to access user management."
      />
    }>
      <DashboardTemplate>
        <div className="space-y-8">
          <UserManagementPage />
        </div>
      </DashboardTemplate>
    </ProtectedRoute>
  );
}