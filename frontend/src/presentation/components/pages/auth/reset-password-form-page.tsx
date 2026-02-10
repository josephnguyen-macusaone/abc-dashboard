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
    <div className="h-screen flex items-center justify-center bg-background px-4 py-6 sm:px-6 lg:px-8 overflow-hidden">
      <div className="w-full max-w-md">
        <AuthTemplate>
          <ResetPasswordForm
            token={token || undefined}
            onSuccess={handleSuccess}
            onBackToLogin={handleBackToLogin}
          />
        </AuthTemplate>
      </div>
    </div>
  );
}
