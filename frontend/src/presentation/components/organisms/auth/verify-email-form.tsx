'use client';

import { Mail, XCircle } from 'lucide-react';
import { Button, Typography } from '@/presentation/components/atoms';
import { useAuthStore } from '@/infrastructure/stores/auth';
import { useToast } from '@/presentation/contexts/toast-context';
import logger from '@/shared/helpers/logger';
import { cn } from '@/shared/helpers';

/**
 * Matches URL-driven verify flow:
 * - pending: after signup or no error param
 * - expired / invalid: backend redirect to /verify-email?error=...
 */
export type VerifyEmailFormState = 'pending' | 'expired' | 'invalid';

interface VerifyEmailFormProps {
  email: string;
  state: VerifyEmailFormState;
  onBackToLogin: () => void;
  onGoToSignup: () => void;
  className?: string;
}

export function VerifyEmailForm({
  email,
  state,
  onBackToLogin,
  onGoToSignup,
  className,
}: VerifyEmailFormProps) {
  const toast = useToast();
  const resendVerificationEmail = useAuthStore((s) => s.resendVerificationEmail);
  const authLoading = useAuthStore((s) => s.isLoading);

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
    <div className={cn('flex w-full flex-col items-center space-y-6 text-center', className)}>
      {state === 'pending' && (
        <>
          <div className="flex justify-center pt-3">
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
              <span className="font-bold text-primary">{email}</span>
            ) : (
              'your email address'
            )}
            . Click the link in the email to activate your account.
          </Typography>
          <div className="w-full rounded-lg border bg-muted/40 p-4 text-left space-y-2">
            <Typography variant="body-s" color="muted">
              Didn&apos;t receive the email?
            </Typography>
            <Typography variant="body-s" color="muted">
              Check your spam folder, or contact support if the problem persists.
            </Typography>
          </div>
          <div className="flex w-full flex-col space-y-3">
            {email.trim() ? (
              <Button
                variant="default"
                className="h-10 w-full text-button-m"
                size="default"
                disabled={authLoading}
                onClick={() => void onResendVerification()}
              >
                <Typography variant="button-m">Resend verification email</Typography>
              </Button>
            ) : null}
            <div className="text-center">
              <Button variant="ghost" className="p-0 h-auto" onClick={onBackToLogin}>
                <Typography variant="button-m" color="muted" className="hover:text-primary">
                  Back to Login
                </Typography>
              </Button>
            </div>
          </div>
        </>
      )}

      {(state === 'expired' || state === 'invalid') && (
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
            {state === 'expired'
              ? 'This verification link has expired. Please sign up again to get a new link.'
              : 'This verification link is invalid or has already been used.'}
          </Typography>
          <div className="flex w-full flex-col space-y-3">
            {state === 'expired' && (
              <Button
                variant="default"
                className="h-10 w-full text-button-m"
                size="default"
                onClick={onGoToSignup}
              >
                <Typography variant="button-m">Sign up again</Typography>
              </Button>
            )}
            {email.trim() && state === 'invalid' && (
              <Button
                variant="default"
                className="h-10 w-full text-button-m"
                size="default"
                disabled={authLoading}
                onClick={() => void onResendVerification()}
              >
                <Typography variant="button-m">Resend verification email</Typography>
              </Button>
            )}
            <div className="text-center">
              <Button variant="ghost" className="p-0 h-auto" onClick={onBackToLogin}>
                <Typography variant="button-m" color="muted" className="hover:text-primary">
                  Back to Login
                </Typography>
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
