'use client';

import { ProtectedRoute } from '@/presentation/components/routes';
import { ChangePasswordPage } from '@/presentation/components/pages';

export default function ChangePassword() {
  return (
    <ProtectedRoute>
      <ChangePasswordPage />
    </ProtectedRoute>
  );
}
