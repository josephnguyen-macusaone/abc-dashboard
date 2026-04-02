'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, Mail, XCircle, Loader2 } from 'lucide-react';
import { Button, Typography } from '@/presentation/components/atoms';
import { AuthTemplate } from '@/presentation/components/templates';
import { useAuthStore } from '@/infrastructure/stores/auth';
import { useToast } from '@/presentation/contexts/toast-context';
import logger from '@/shared/helpers/logger';

type PageState = 'pending' | 'verifying' | 'success' | 'error';

export function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const verifyEmail = useAuthStore((s) => s.verifyEmail);
  const resendVerificationEmail = useAuthStore((s) => s.resendVerificationEmail);
  const authLoading = useAuthStore((s) => s.isLoading);

  const token = searchParams.get('token');
  const email = searchParams.get('email') ? decodeURIComponent(searchParams.get('email') ?? '') : '';

  const [state, setState] = useState<PageState>(token ? 'verifying' : 'pending');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!token) return;

    setState('verifying');
    verifyEmail(token)
      .then(() => setState('success'))
      .catch((err: unknown) => {
        setErrorMessage(
          (err as { message?: string })?.message ?? 'Verification failed. The link may have expired.'
        );
        setState('error');
      });
  }, [token, verifyEmail]);

  async function onResendVerification() {
    if (!email.trim()) return;
    try {
      const { message } = await resendVerificationEmail(email);
      toast.success(message);
    } catch (err: unknown) {
      logger.error('Resend verification failed:', { err });
      const msg = err instanceof Error ? err.message : 'Could not resend email';
      toast.error(msg);
    }
  }

  return (
    <AuthTemplate>
      <div className="w-full max-w-md space-y-6 text-center py-4">
        {state === 'pending' && (
          <>
            <div className="flex justify-center">
              <div className="rounded-full bg-orange-100 p-5">
                <Mail className="h-10 w-10 text-orange-500" />
              </div>
            </div>
            <Typography variant="title-l" className="font-semibold">
              Check your email
            </Typography>
            <Typography variant="body-m" color="muted">
              We sent a verification link to{' '}
              {email ? (
                <span className="font-medium text-foreground">{email}</span>
              ) : (
                'your email address'
              )}
              . Click the link in the email to activate your account.
            </Typography>
            <div className="rounded-lg border bg-muted/40 p-4 text-left space-y-1">
              <Typography variant="body-s" color="muted">
                Didn&apos;t receive the email?
              </Typography>
              <Typography variant="body-s" color="muted">
                Check your spam folder, or contact support if the problem persists.
              </Typography>
            </div>
            {email.trim() ? (
              <Button
                variant="default"
                className="w-full h-11"
                disabled={authLoading}
                onClick={() => void onResendVerification()}
              >
                Resend verification email
              </Button>
            ) : null}
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => router.push('/login')}
            >
              Back to login
            </Button>
          </>
        )}

        {state === 'verifying' && (
          <>
            <div className="flex justify-center">
              <div className="rounded-full bg-muted p-5">
                <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
              </div>
            </div>
            <Typography variant="title-l" className="font-semibold">
              Verifying your email…
            </Typography>
            <Typography variant="body-m" color="muted">
              Please wait while we confirm your email address.
            </Typography>
          </>
        )}

        {state === 'success' && (
          <>
            <div className="flex justify-center">
              <div className="rounded-full bg-green-100 p-5">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
            </div>
            <Typography variant="title-l" className="font-semibold">
              Email verified!
            </Typography>
            <Typography variant="body-m" color="muted">
              Your account is now active. You can log in and start using ABC Dashboard.
            </Typography>
            <Button
              variant="default"
              className="w-full h-11"
              onClick={() => router.push('/login')}
            >
              Go to login
            </Button>
          </>
        )}

        {state === 'error' && (
          <>
            <div className="flex justify-center">
              <div className="rounded-full bg-red-100 p-5">
                <XCircle className="h-10 w-10 text-destructive" />
              </div>
            </div>
            <Typography variant="title-l" className="font-semibold">
              Verification failed
            </Typography>
            <Typography variant="body-m" color="muted">
              {errorMessage}
            </Typography>
            <div className="space-y-2">
              <Button
                variant="default"
                className="w-full h-11"
                onClick={() => router.push('/signup')}
              >
                Sign up again
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => router.push('/login')}
              >
                Back to login
              </Button>
            </div>
          </>
        )}
      </div>
    </AuthTemplate>
  );
}

export default VerifyEmailPage;
