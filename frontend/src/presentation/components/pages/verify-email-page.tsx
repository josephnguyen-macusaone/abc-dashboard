'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/infrastructure/stores/auth-store';
import { AuthTemplate } from '@/presentation/components/templates/auth-template';
import { ErrorBoundary } from '@/presentation/components/organisms/common/error-boundary';
import { toast } from '@/presentation/hooks/use-toast';

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
        toast({
          title: 'Verification Error',
          description: 'Verification token missing. Please check your email for the verification link.',
          variant: 'destructive',
        });
        router.push('/login');
        return;
      }

      try {
        const response = await verifyEmail(email || '', token || '');
        toast({
          title: 'Email Verified!',
          description: response.message,
          variant: 'default',
        });
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

        toast({
          title: 'Verification Failed',
          description: errorMessage,
          variant: 'destructive',
        });
        router.push(redirectTo);
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

  return null;
}

export default VerifyEmailPage;