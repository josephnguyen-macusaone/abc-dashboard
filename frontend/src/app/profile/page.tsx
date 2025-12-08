import { ProfilePage } from '@/presentation/components/pages';
import { ProtectedRoute } from '@/presentation/components/routes';

// Force dynamic rendering for this protected route
export const dynamic = 'force-dynamic';

export default function Profile() {
  return (
    <ProtectedRoute>
      <ProfilePage />
    </ProtectedRoute>
  );
}