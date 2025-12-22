'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button, Input, Typography } from '@/presentation/components/atoms';
import { Loading } from '@/presentation/components/atoms';
import { InputField } from '@/presentation/components/molecules';
import { useToast } from '@/presentation/contexts/toast-context';
import { authApi } from '@/infrastructure/api/auth';
import { Mail, CheckCircle, ArrowLeft, AlertCircle, ChevronDown } from 'lucide-react';
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
  const [formData, setFormData] = useState<ForgotPasswordFormData>({
    email: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof ForgotPasswordFormData, string | null>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof ForgotPasswordFormData, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isHelpExpanded, setIsHelpExpanded] = useState(false);

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
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error when user starts typing (but keep validation feedback)
    if (errors[field] && submitAttempted) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }

    // Mark field as touched for validation
    if (!touched[field]) {
      setTouched(prev => ({ ...prev, [field]: true }));
    }
  };

  const handleInputBlur = (field: keyof ForgotPasswordFormData) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    setSubmitAttempted(true); // Enable validation on blur
  };

  const validateForm = () => {
    const validationErrors: Partial<Record<keyof ForgotPasswordFormData, string | null>> = {};

    if (!formData.email.trim()) {
      validationErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      validationErrors.email = 'Please enter a valid email address';
    }

    setErrors(validationErrors);
    return Object.values(validationErrors).every(error => !error);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await authApi.forgotPassword(formData.email);
      setIsSuccess(true);
      toast.success('Password reset email sent successfully!', {
        description: 'Check your email for reset instructions.',
        duration: 5000,
      });
    } catch (error: any) {
      logger.error('Forgot password error:', error);
      toast.error(error.message || 'Failed to send password reset email', {
        description: 'Please try again or contact support if the problem persists.',
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTryDifferentEmail = () => {
    setIsSuccess(false);
    setFormData({ email: '' });
  };

  if (isSuccess) {
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
              We&apos;ve sent a password reset link to
            </Typography>
            <Typography variant="body-s" className="text-foreground font-medium">
              {formData.email}
            </Typography>
          </div>
        </div>

        <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-300 delay-500">
          <div className="bg-blue-50 border border-blue-200 rounded-lg pb-3 pt-2 px-4 space-y-2 text-left">
            <Typography variant="caption" className="text-blue-800">
              <strong>Next steps</strong>
              <ul className="list-disc list-inside">
                <li>Check your email inbox (and spam folder)</li>
                <li>Click the &quot;Reset Password&quot; link</li>
                <li>Follow the instructions in the email</li>
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
            disabled={isLoading}
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
            disabled={isLoading || !emailValidation.isValid}
          >
            {isLoading ? (
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
