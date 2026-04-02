'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Typography } from '@/presentation/components/atoms';
import { InputField } from '@/presentation/components/molecules';
import { useToast } from '@/presentation/contexts/toast-context';
import { useAuthStore } from '@/infrastructure/stores/auth';
import { useForgotPasswordFormStore } from '@/infrastructure/stores/auth/forms';
import { Mail, CheckCircle, AlertCircle } from 'lucide-react';
import logger from '@/shared/helpers/logger';
import { FORGOT_PASSWORD_EMAIL_STORAGE_KEY } from '@/shared/constants/auth-flow-storage';

interface ForgotPasswordFormProps {
  onBackToLogin?: () => void;
  className?: string;
}

interface ForgotPasswordFormData {
  email: string;
}

export function ForgotPasswordForm({ onBackToLogin, className }: ForgotPasswordFormProps) {
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sentFromUrl = searchParams.get('sent') === '1';

  const [storedEmail, setStoredEmail] = useState<string | null>(null);
  const [emailHydrated, setEmailHydrated] = useState(false);

  useEffect(() => {
    if (!sentFromUrl || typeof window === 'undefined') {
      setStoredEmail(null);
      setEmailHydrated(true);
      return;
    }
    setStoredEmail(sessionStorage.getItem(FORGOT_PASSWORD_EMAIL_STORAGE_KEY));
    setEmailHydrated(true);
  }, [sentFromUrl]);

  const requestPasswordReset = useAuthStore((state) => state.requestPasswordReset);
  const authLoading = useAuthStore((state) => state.isLoading);
  const clearPasswordResetState = useAuthStore((state) => state.clearPasswordResetState);

  const showSentConfirmation = sentFromUrl && emailHydrated;

  const {
    data: formData,
    errors,
    touched,
    setFieldValue,
    setTouched,
    validateForm,
    reset: resetForm,
  } = useForgotPasswordFormStore();

  // Real-time email validation
  const emailValidation = useMemo(() => {
    const email = formData.email;
    const isValidFormat = /\S+@\S+\.\S+/.test(email);
    const hasAtSymbol = email.includes('@');
    const hasValidDomain = hasAtSymbol && email.split('@')[1]?.includes('.');

    return {
      isValidFormat,
      hasAtSymbol,
      hasValidDomain,
      isEmpty: !email.trim(),
      isValid: isValidFormat
    };
  }, [formData.email]);

  const handleInputChange = (field: keyof ForgotPasswordFormData, value: string) => {
    setFieldValue(field, value);

    // Mark field as touched for validation
    if (!touched[field]) {
      setTouched(field, true);
    }
  };

  const handleInputBlur = (field: keyof ForgotPasswordFormData) => {
    setTouched(field, true);
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    const submittedEmail = formData.email.trim();

    try {
      await requestPasswordReset(submittedEmail);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(FORGOT_PASSWORD_EMAIL_STORAGE_KEY, submittedEmail);
      }
      resetForm();
      router.replace('/forgot-password?sent=1');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to send password reset email';
      logger.error('Forgot password error:', { error });
      toast.error(message, {
        description: 'Please try again or contact support if the problem persists.',
        duration: 5000,
      });
    }
  };

  const handleTryDifferentEmail = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(FORGOT_PASSWORD_EMAIL_STORAGE_KEY);
    }
    clearPasswordResetState();
    resetForm();
    router.replace('/forgot-password');
  };

  if (showSentConfirmation) {
    return (
      <div className="text-center space-y-4 mt-6">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center animate-in zoom-in-50 duration-300 delay-150">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>

        <div className="space-y-2 animate-in fade-in-0 slide-in-from-bottom-2 duration-300 delay-300">
          <Typography variant="title-m" className="text-foreground">
            Check Your Email
          </Typography>
          <div>
            <Typography variant="body-s" className="text-muted-foreground">
              If an account exists for that address, we&apos;ve sent an email with a link to continue
              (verify your account or reset your password).
            </Typography>
            {storedEmail ? (
              <Typography variant="body-s" className="text-foreground font-medium mt-2">
                {storedEmail}
              </Typography>
            ) : null}
          </div>
        </div>

        <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-300 delay-500">
          <div className="bg-blue-50 border border-blue-200 rounded-lg pb-3 pt-2 px-4 space-y-2 text-left">
            <Typography variant="caption" className="text-blue-800">
              <strong>Next steps</strong>
              <ul className="list-disc list-inside">
                <li>Check your email inbox (and spam folder)</li>
                <li>Open the link in the email</li>
                <li>Follow the instructions on the page</li>
              </ul>
            </Typography>
          </div>

          <Typography variant="body-xs" className="text-muted-foreground">
            Didn&apos;t receive the email? Check your spam folder or try a different email address.
          </Typography>

          <div className="space-y-3">
            <Button
              onClick={handleTryDifferentEmail}
              variant="outline"
              className="w-full hover:bg-green-50 hover:border-green-200 transition-colors"
            >
              <Mail className="w-4 h-4" />
              <Typography variant="button-s">Try Different Email</Typography>
            </Button>

            {onBackToLogin && (
              <Button
                type="button"
                variant="ghost"
                className="p-0 h-auto"
                onClick={onBackToLogin}
              >
                <Typography variant="button-m" color="muted" className="hover:text-primary transition-colors">
                  Back to Login
                </Typography>
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className} transition-all duration-300`}>
      <div className="space-y-6 mt-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <Typography variant="title-m" className="text-foreground">
            Forgot Your Password?
          </Typography>
          <Typography variant="body-s" className="text-muted-foreground">
            Enter your email address and we&apos;ll send you a link to reset your password.
          </Typography>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <InputField
            label="Email Address"
            type="email"
            placeholder="Enter your email address"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            onBlur={() => handleInputBlur('email')}
            error={errors.email}
            disabled={authLoading}
            icon={
              formData.email && touched.email ? (
                emailValidation.isValid ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : !emailValidation.isEmpty ? (
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                ) : (
                  <Mail className="h-4 w-4" />
                )
              ) : (
                <Mail className="h-4 w-4" />
              )
            }
            inputClassName={`h-11 transition-colors ${formData.email && touched.email
              ? emailValidation.isValid
                ? 'border-green-500 focus:border-green-500'
                : !emailValidation.isEmpty
                  ? 'border-amber-500 focus:border-amber-500'
                  : ''
              : ''
              }`}
            className="space-y-3"
          />

          <Button
            type="submit"
            variant="default"
            className={`w-full h-11 text-button-m transition-all duration-200 ${emailValidation.isValid ? 'shadow-md hover:shadow-lg' : ''
              }`}
            size="default"
            disabled={authLoading || !emailValidation.isValid}
          >
            {authLoading ? (
              <div className="flex items-center space-x-2">
                <Typography variant="button-m">Sending reset link...</Typography>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4" />
                <Typography variant="button-s">
                  {emailValidation.isValid ? 'Send Reset Link' : 'Enter valid email'}
                </Typography>
              </div>
            )}
          </Button>
        </form>
        {/* Back to Login */}
        {onBackToLogin && (
          <div className="text-center">
            <Button
              type="button"
              variant="ghost"
              className="p-0 h-auto"
              onClick={onBackToLogin}
            >
              <Typography variant="button-m" color="muted" className="hover:text-primary">Back to Login</Typography>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
