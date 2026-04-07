'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { AuthTemplate } from '@/presentation/components/templates';
import { VerifyEmailForm, type VerifyEmailFormState } from '@/presentation/components/organisms/auth';

// URL → state (see backend verify-email-redirect redirects):
//   ?pending=true&email=...  → pending
//   ?error=expired           → expired
//   ?error=invalid           → invalid
//   (no error param)         → pending

export function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const email = searchParams.get('email') ? decodeURIComponent(searchParams.get('email') ?? '') : '';
  const error = searchParams.get('error');

  const state: VerifyEmailFormState =
    error === 'expired' ? 'expired' : error === 'invalid' ? 'invalid' : 'pending';

  return (
    <AuthTemplate>
      <VerifyEmailForm
        email={email}
        state={state}
        onBackToLogin={() => router.push('/login')}
        onGoToSignup={() => router.push('/signup')}
      />
    </AuthTemplate>
  );
}

export default VerifyEmailPage;
