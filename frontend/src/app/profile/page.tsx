import { ProfilePage } from '@/presentation/components/pages';
import { ProtectedRoute } from '@/presentation/components/routes';

export default function Profile() {
  return (
    <ProtectedRoute>
      <ProfilePage />
    </ProtectedRoute>
  );
}