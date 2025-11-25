import { DashboardPage } from '@/presentation/components/pages/dashboard-page';
import { ProtectedRoute } from '@/presentation/components/routes';

export default function Dashboard() {
  return (
    <ProtectedRoute requireAuth={true} redirectTo="/login">
      <DashboardPage />
    </ProtectedRoute>
  );
}
