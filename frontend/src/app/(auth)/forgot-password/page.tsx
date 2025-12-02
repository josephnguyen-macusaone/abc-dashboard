import { ForgotPasswordPage } from '@/presentation/components/pages/auth';
import { ProtectedRoute } from '@/presentation/components/routes';

export default function ForgotPassword() {
  return (
    <ProtectedRoute>
      <ForgotPasswordPage />
    </ProtectedRoute>
  );
}
