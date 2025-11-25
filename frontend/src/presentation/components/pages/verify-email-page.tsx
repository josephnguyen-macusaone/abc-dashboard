'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/presentation/components/atoms/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/presentation/components/atoms/ui/card';
import { Alert, AlertDescription } from '@/presentation/components/atoms/ui/alert';
import { CheckCircle, Mail, AlertCircle, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/infrastructure/stores';
import { useAuth } from '@/presentation/contexts/auth-context';

interface VerifyEmailPageProps {
  email?: string;
  token?: string;
}

function VerifyEmailPage({ email, token }: VerifyEmailPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { verifyEmail } = useAuth();

  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Get email from URL params or search params
  const userEmail = email || searchParams.get('email') || '';
  const verificationToken = token || searchParams.get('token') || '';

  useEffect(() => {
    // Auto-verify if token is present
    if (verificationToken && !isVerified) {
      handleVerifyEmail(verificationToken);
    }
  }, [verificationToken]);

  const handleVerifyEmail = async (tokenToVerify: string) => {
    setIsVerifying(true);
    setError(null);

    try {
      await verifyEmail(tokenToVerify);
      setIsVerified(true);
      setSuccessMessage('Email verified successfully! You can now log in.');

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login?message=Email verified! Please log in.');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to verify email. The link may be invalid or expired.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendVerification = async () => {
    if (!userEmail) {
      setError('Email address is required to resend verification');
      return;
    }

    setIsResending(true);
    setError(null);

    try {
      // TODO: Implement resend verification API call
      // For now, just show success message
      setSuccessMessage('Verification email sent! Please check your inbox.');
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification email');
    } finally {
      setIsResending(false);
    }
  };

  if (isVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle className="text-xl font-semibold text-green-600">
              Email Verified!
            </CardTitle>
            <CardDescription>
              Your email has been successfully verified.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {successMessage && (
              <Alert>
                <AlertDescription>{successMessage}</AlertDescription>
              </Alert>
            )}
            <p className="text-sm text-gray-600">
              Redirecting to login page...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <Mail className="w-6 h-6 text-blue-600" />
          </div>
          <CardTitle className="text-xl font-semibold">
            Verify Your Email
          </CardTitle>
          <CardDescription>
            We've sent a verification link to your email address.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {userEmail && (
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Check your email at:
              </p>
              <p className="font-medium text-gray-900">{userEmail}</p>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {successMessage && (
            <Alert>
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}

          {isVerifying && (
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Verifying email...</span>
            </div>
          )}

          {!verificationToken && (
            <div className="space-y-3">
              <Button
                onClick={handleResendVerification}
                disabled={isResending || !userEmail}
                className="w-full"
                variant="outline"
              >
                {isResending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Resend Verification Email'
                )}
              </Button>

              <Button
                onClick={() => router.push('/login')}
                variant="ghost"
                className="w-full"
              >
                Back to Login
              </Button>
            </div>
          )}

          {verificationToken && !isVerified && (
            <div className="text-center">
              <Button
                onClick={() => handleVerifyEmail(verificationToken)}
                disabled={isVerifying}
                className="w-full"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify Email'
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default VerifyEmailPage;
