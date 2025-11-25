import RegisterPage from '@/presentation/components/pages/register-page';
import { ProtectedRoute } from '@/presentation/components/routes';

export default function Register() {
  return (
    <ProtectedRoute requireAuth={false} redirectTo="/dashboard">
      <RegisterPage />
    </ProtectedRoute>
  );
}
