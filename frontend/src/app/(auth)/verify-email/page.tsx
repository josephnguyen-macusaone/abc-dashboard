import { Suspense } from 'react';
import { VerifyEmailPage } from '@/presentation/components/pages/auth/verify-email-page';

export default function VerifyEmail() {
  return (
    <Suspense>
      <VerifyEmailPage />
    </Suspense>
  );
}
