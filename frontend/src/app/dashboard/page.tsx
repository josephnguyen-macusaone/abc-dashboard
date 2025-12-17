import { ProtectedRoute } from '@/presentation/components/routes';
import { AccessDeniedPage, DashboardPage } from '@/presentation/components/pages';

// Force dynamic rendering for this protected route
export const dynamic = 'force-dynamic';

export default function Dashboard() {
  return (
    <ProtectedRoute fallback={
      <AccessDeniedPage
        message="You don't have permission to access the dashboard."
      />
    }>
      <DashboardPage />
    </ProtectedRoute>
  );
}
