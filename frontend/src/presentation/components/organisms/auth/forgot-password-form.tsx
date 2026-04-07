'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Typography } from '@/presentation/components/atoms';
import { InputField } from '@/presentation/components/molecules';
import { useToast } from '@/presentation/contexts/toast-context';
import { useAuthStore } from '@/infrastructure/stores/auth';
import { useForgotPasswordFormStore } from '@/infrastructure/stores/auth/forms';
import { Mail, CheckCircle, AlertCircle } from 'lucide-react';
import logger from '@/shared/helpers/logger';

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

  const requestPasswordReset = useAuthStore((state) => state.requestPasswordReset);
  const authLoading = useAuthStore((state) => state.isLoading);

  const {
    data: formData,
    errors,
    touched,
    setFieldValue,
    setTouched,
    validateForm,
    reset: resetForm,
  } = useForgotPasswordFormStore();

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
      isValid: isValidFormat,
    };
  }, [formData.email]);

  const handleInputChange = (field: keyof ForgotPasswordFormData, value: string) => {
    setFieldValue(field, value);
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
      resetForm();
      router.replace('/login?password_link_sent=true');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to send password reset email';
      logger.error('Forgot password error:', { error });
      toast.error(message, {
        description: 'Please try again or contact support if the problem persists.',
        duration: 5000,
      });
    }
  };

  return (
    <div className={`${className} transition-all duration-300`}>
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <Typography variant="title-m" className="text-foreground">
            Forgot Your Password?
          </Typography>
          <Typography variant="body-s" className="text-muted-foreground">
            Enter your email address and we&apos;ll send you a link to reset your password.
          </Typography>
        </div>

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
            inputClassName={`h-10 transition-colors ${
              formData.email && touched.email
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
            className={`w-full h-10 text-button-m transition-all duration-200 ${
              emailValidation.isValid ? 'shadow-md hover:shadow-lg' : ''
            }`}
            size="default"
            disabled={authLoading || !emailValidation.isValid}
          >
            {authLoading ? (
              <div className="flex items-center gap-2">
                <Typography variant="button-m">Sending reset link...</Typography>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <Typography variant="button-m">
                  {emailValidation.isValid ? 'Send Reset Link' : 'Enter valid email'}
                </Typography>
              </div>
            )}
          </Button>
        </form>

        {onBackToLogin && (
          <div className="text-center">
            <Button type="button" variant="ghost" className="p-0 h-auto" onClick={onBackToLogin}>
              <Typography variant="button-m" color="muted" className="hover:text-primary">
                Back to Login
              </Typography>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
