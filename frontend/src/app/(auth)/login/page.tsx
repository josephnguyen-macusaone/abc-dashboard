import { LoginPage } from '@/presentation/components/pages';
import { ProtectedRoute } from '@/presentation/components/routes';

export default function Login() {
  return (
    <ProtectedRoute>
      <LoginPage />
    </ProtectedRoute>
  );
}
