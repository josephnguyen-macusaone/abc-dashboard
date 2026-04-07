'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthTemplate } from '@/presentation/components/templates';
import { ResetPasswordForm } from '@/presentation/components/organisms/auth';
import { Typography } from '@/presentation/components/atoms';

function ResetPasswordFormPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get('token');

  const handleBackToLogin = () => {
    router.push('/login');
  };

  const handleContinueToLogin = () => {
    router.replace('/login?reset=true');
  };

  return (
    <AuthTemplate>
      <ResetPasswordForm
        token={token || undefined}
        onContinueToLogin={handleContinueToLogin}
        onBackToLogin={handleBackToLogin}
      />
    </AuthTemplate>
  );
}

export function ResetPasswordFormPage() {
  return (
    <Suspense
      fallback={
        <AuthTemplate>
          <div className="flex min-h-[12rem] items-center justify-center">
            <Typography variant="body-m" color="muted">
              Loading…
            </Typography>
          </div>
        </AuthTemplate>
      }
    >
      <ResetPasswordFormPageContent />
    </Suspense>
  );
}
