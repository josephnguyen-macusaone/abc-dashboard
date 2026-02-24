import nextDynamic from 'next/dynamic';
import { ProtectedRoute } from '@/presentation/components/routes';
import { AccessDeniedPage } from '@/presentation/components/pages';
import { DashboardTemplate } from '@/presentation/components/templates';
import { UserDataTableSkeleton } from '@/presentation/components/molecules/domain/user-management';

const UserManagementPage = nextDynamic(
  () =>
    import('@/presentation/components/pages/dashboard/user-management-page').then((m) => ({
      default: m.UserManagementPage,
    })),
  { loading: () => <UserDataTableSkeleton /> }
);

// Force dynamic rendering for this protected route
export const dynamic = 'force-dynamic';

export default function UsersPage() {
  return (
    <ProtectedRoute
      fallback={
        <AccessDeniedPage message="You don't have permission to access user management." />
      }
    >
      <DashboardTemplate>
        <div className="space-y-8">
          <UserManagementPage />
        </div>
      </DashboardTemplate>
    </ProtectedRoute>
  );
}