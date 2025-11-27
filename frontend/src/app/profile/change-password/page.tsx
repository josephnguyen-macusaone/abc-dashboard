'use client';

import { ProtectedRoute } from '@/presentation/components/routes';
import { ChangePasswordPage } from '@/presentation/components/pages/change-password-page';

export default function ChangePassword() {
  return (
    <ProtectedRoute>
      <ChangePasswordPage />
    </ProtectedRoute>
  );
}
