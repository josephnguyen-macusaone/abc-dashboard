'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { AuthTemplate } from '@/presentation/components/templates';
import { ResetPasswordForm } from '@/presentation/components/organisms/auth';

export function ResetPasswordFormPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get('token');

  const handleBackToLogin = () => {
    router.push('/login');
  };

  const handleSuccess = () => {
    router.push('/login');
  };

  return (
    <AuthTemplate>
      <ResetPasswordForm
        token={token || undefined}
        onSuccess={handleSuccess}
        onBackToLogin={handleBackToLogin}
      />
    </AuthTemplate>
  );
}
