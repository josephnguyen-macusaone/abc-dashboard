'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/infrastructure/stores/auth-store';
import { AuthTemplate } from '@/presentation/components/templates/auth-template';
import { ErrorBoundary } from '@/presentation/components/organisms/common/error-boundary';
import { toast } from '@/presentation/components/atoms';

interface VerifyEmailPageProps {
  token?: string;
  email?: string;
}

function VerifyEmailPage({ token, email }: VerifyEmailPageProps) {
  const router = useRouter();
  const { verifyEmail } = useAuthStore();
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
        <AuthTemplate
          title="Something went wrong"
          subtitle="We encountered an error while loading the verification page"
        >
          <div className="text-center">
            <p className="text-muted-foreground mb-4">
              Please try refreshing the page or contact support if the problem persists.
            </p>
          </div>
        </AuthTemplate>
      }>
        <AuthTemplate
          title="Verifying Your Email"
          subtitle="Please wait while we verify your email address..."
        >
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Verifying Your Email</h3>
              <p className="text-gray-600">Please wait while we verify your email address...</p>
            </div>
          </div>
        </AuthTemplate>
      </ErrorBoundary>
    );
  }

  // Show helpful message when no token is provided
  return (
    <ErrorBoundary fallback={
      <AuthTemplate
        title="Something went wrong"
        subtitle="We encountered an error while loading the verification page"
      >
        <div className="text-center">
          <p className="text-muted-foreground mb-4">
            Please try refreshing the page or contact support if the problem persists.
          </p>
        </div>
      </AuthTemplate>
    }>
      <AuthTemplate
        title="Check Your Email"
        subtitle="We sent you a verification link"
      >
        <div className="text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-900">Verification Link Required</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              To verify your email address, please check your email inbox for a verification link from us.
              Click the link in the email to complete your email verification.
            </p>

            {email && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">
                  <strong>Email sent to:</strong> {email}
                </p>
              </div>
            )}

            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                Didn't receive the email? Check your spam folder or contact support.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => router.push('/login')}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Back to Login
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Refresh Page
                </button>
              </div>
            </div>
          </div>
        </div>
      </AuthTemplate>
    </ErrorBoundary>
  );
}

export default VerifyEmailPage;