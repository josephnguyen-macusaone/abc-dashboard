'use client';

import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { AuthTemplate } from '@/presentation/components/templates';
import { ForgotPasswordForm } from '@/presentation/components/organisms/auth';
import { Typography } from '@/presentation/components/atoms';

function ForgotPasswordPageContent() {
  const router = useRouter();

  const handleBackToLogin = () => {
    router.push('/login');
  };

  return (
    <AuthTemplate>
      <ForgotPasswordForm onBackToLogin={handleBackToLogin} />
    </AuthTemplate>
  );
}

export default function ForgotPasswordPage() {
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
      <ForgotPasswordPageContent />
    </Suspense>
  );
}
