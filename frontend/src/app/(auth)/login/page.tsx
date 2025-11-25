import LoginPage from '@/presentation/components/pages/login-page';
import { ProtectedRoute } from '@/presentation/components/routes';

export default function Login() {
  return (
    <ProtectedRoute requireAuth={false} redirectTo="/dashboard">
      <LoginPage />
    </ProtectedRoute>
  );
}
