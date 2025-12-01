'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Typography } from '@/presentation/components/atoms';
import { InputField, FormField } from '@/presentation/components/molecules';
import { AuthTemplate } from '@/presentation/components/templates';
import { useToast } from '@/presentation/contexts/toast-context';
import { authApi } from '@/infrastructure/api/auth';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<{ email?: string }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    const validationErrors: { email?: string } = {};
    if (!email.trim()) {
      validationErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      validationErrors.email = 'Please enter a valid email address';
    }
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) return;

    setIsLoading(true);
    try {
      await authApi.requestPasswordReset(email);
      setIsSuccess(true);
      toast.success('Password reset email sent successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send password reset email');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    router.push('/login');
  };

  if (isSuccess) {
    return (
      <div className="h-screen flex items-center justify-center bg-background px-4 py-6 sm:px-6 lg:px-8 overflow-hidden">
        <div className="w-full max-w-md space-y-8">
          <AuthTemplate>
            <div className="text-center space-y-6">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>

              <div className="space-y-2">
                <Typography variant="title-l" className="text-foreground">
                  Check Your Email
                </Typography>
                <Typography variant="body-m" className="text-muted-foreground">
                  We've sent a password reset link to{' '}
                  <span className="font-medium text-foreground">{email}</span>
                </Typography>
              </div>

              <div className="space-y-4">
                <Typography variant="body-s" className="text-muted-foreground">
                  Didn't receive the email? Check your spam folder or try again.
                </Typography>

                <div className="space-y-3">
                  <Button
                    onClick={() => setIsSuccess(false)}
                    variant="outline"
                    className="w-full"
                  >
                    Try Different Email
                  </Button>
                  <Button
                    onClick={handleBackToLogin}
                    className="w-full"
                  >
                    Back to Login
                  </Button>
                </div>
              </div>
            </div>
          </AuthTemplate>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex items-center justify-center bg-background px-4 py-6 sm:px-6 lg:px-6 lg:px-8 overflow-hidden">
      <div className="w-full max-w-md space-y-8">
        <AuthTemplate>
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
              <Typography variant="title-l" className="text-foreground">
                Forgot Your Password?
              </Typography>
              <Typography variant="body-m" className="text-muted-foreground">
                  Enter your email address and we'll send you a link to reset your password.
              </Typography>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <InputField
                label="Email Address"
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
                disabled={isLoading}
                icon={<Mail className="h-4 w-4" />}
                inputClassName="h-11"
                className="space-y-3"
              />

              <Button
                type="submit"
                variant="default"
                className="w-full h-11 text-button-m"
                size="default"
                disabled={isLoading || !email.trim()}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <Typography variant="button-m" className="pt-0.5">Sending...</Typography>
                  </div>
                ) : (
                  <Typography variant="button-m" className="pt-0.5">Send Reset Link</Typography>
                )}
              </Button>
            </form>

            {/* Back to Login */}
            <div className="text-center">
              <Button
                type="button"
                variant="ghost"
                onClick={handleBackToLogin}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Login
              </Button>
            </div>
          </div>
        </AuthTemplate>
      </div>
    </div>
  );
}