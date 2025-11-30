'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/infrastructure/stores/auth-store';
import { AuthTemplate } from '@/presentation/components/templates/auth-template';
import { ErrorBoundary } from '@/presentation/components/organisms/common/error-boundary';
import { useToast } from '@/presentation/contexts/toast-context';
import { Typography } from '@/presentation/components/atoms';
import { Button } from '@/presentation/components/atoms/ui/button';

interface VerifyEmailPageProps {
  token?: string;
  email?: string;
}

function VerifyEmailPage({ token, email }: VerifyEmailPageProps) {
  const router = useRouter();
  const { verifyEmail } = useAuthStore();
  const toast = useToast();
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    const verifyEmailToken = async () => {
      if (!token) {
        // Don't immediately redirect - show helpful UI instead
        setIsVerifying(false);
        return;
      }

      try {
        const response = await verifyEmail(email || '', token || '');
        toast.success(response.message || 'Email verified successfully!');
        router.push('/login?verified=true');
      } catch (error) {
        console.error('Email verification error:', error);

        let errorMessage = 'Verification failed. Please try again or contact support.';
        let redirectTo = '/login';

        if (error instanceof Error) {
          if (error.message.includes('expired')) {
            errorMessage = 'Verification link has expired. Please register again.';
            redirectTo = '/register';
          } else if (error.message.includes('already activated')) {
            errorMessage = 'Account already verified! Please login.';
          } else if (error.message.includes('Invalid')) {
            errorMessage = 'Invalid verification link. Please check your email for the correct link.';
          }
        }

        toast.error(errorMessage);
        router.push('/login');
      } finally {
        setIsVerifying(false);
      }
    };

    verifyEmailToken();
  }, [token, email, verifyEmail, router]);

  if (isVerifying) {
    return (
      <ErrorBoundary fallback={
        <AuthTemplate>
          <div className="text-center">
            <Typography variant="title-l" className="mb-2">Something went wrong</Typography>
            <Typography variant="body-m" color="muted">
              We encountered an error while loading the verification page. Please try refreshing the page or contact support if the problem persists.
            </Typography>
          </div>
        </AuthTemplate>
      }>
        <AuthTemplate>
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              {/* MAC USA ONE Typography: Title M for verifying title */}
              <Typography variant="title-m" className="mb-2">
                Verifying Your Email
              </Typography>
              {/* MAC USA ONE Typography: Body M for verifying message */}
              <Typography variant="body-m" color="muted">
                Please wait while we verify your email address...
              </Typography>
            </div>
          </div>
        </AuthTemplate>
      </ErrorBoundary>
    );
  }

  // Show helpful message when no token is provided
  return (
    <ErrorBoundary fallback={
      <AuthTemplate>
        <div className="text-center">
          <Typography variant="title-l" className="mb-2">Something went wrong</Typography>
          <Typography variant="body-m" color="muted">
            We encountered an error while loading the verification page. Please try refreshing the page or contact support if the problem persists.
          </Typography>
        </div>
      </AuthTemplate>
    }>
      <AuthTemplate>
        <div className="text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-secondary rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-secondary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>

          <div className="space-y-4">
            {/* MAC USA ONE Typography: Title L for main heading */}
            <Typography variant="title-l">
              Verification Link Required
            </Typography>
            {/* MAC USA ONE Typography: Body M for description */}
            <Typography variant="body-m" color="muted" className="max-w-md mx-auto">
              To verify your email address, please check your email inbox for a verification link from us.
              Click the link in the email to complete your email verification.
            </Typography>

            {email && (
              <div className="bg-muted rounded-lg p-4">
                {/* MAC USA ONE Typography: Body S for email info */}
                <Typography variant="body-s" color="muted" as="p">
                  <strong>Email sent to:</strong> {email}
                </Typography>
              </div>
            )}

            <div className="space-y-3">
              {/* MAC USA ONE Typography: Body S for help text */}
              <Typography variant="body-s" color="muted" as="p">
                Didn't receive the email? Check your spam folder or contact support.
              </Typography>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={() => router.push('/login')}
                  variant="default"
                >
                  Back to Login
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                >
                  Refresh Page
                </Button>
              </div>
            </div>
          </div>
        </div>
      </AuthTemplate>
    </ErrorBoundary>
  );
}

export default VerifyEmailPage;
