import { ResetPasswordFormPage } from '@/presentation/components/pages/auth';
import { ProtectedRoute } from '@/presentation/components/routes';

export default function ResetPassword() {
  return (
    <ProtectedRoute>
      <ResetPasswordFormPage />
    </ProtectedRoute>
  );
}
