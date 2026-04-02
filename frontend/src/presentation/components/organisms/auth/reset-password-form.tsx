'use client';

import { useState } from 'react';
import { Button, Input, Typography } from '@/presentation/components/atoms';
import { FormField } from '@/presentation/components/molecules';
import { useToast } from '@/presentation/contexts/toast-context';
import { useAuthStore } from '@/infrastructure/stores/auth';
import { useResetPasswordFormStore } from '@/infrastructure/stores/auth/forms';
import { cn } from '@/shared/helpers';
import { Eye, EyeOff, Lock, CheckCircle } from 'lucide-react';

interface ResetPasswordFormProps {
  token?: string;
  /** Called when the user chooses to go to login after a successful reset (avoids racing navigation with the success panel). */
  onContinueToLogin?: () => void;
  onBackToLogin?: () => void;
  className?: string;
}

interface ResetPasswordFormData {
  password: string;
  confirmPassword: string;
}

export function ResetPasswordForm({ token, onContinueToLogin, onBackToLogin, className }: ResetPasswordFormProps) {
  const toast = useToast();
  const resetPassword = useAuthStore((s) => s.resetPassword);
  const authLoading = useAuthStore((s) => s.isLoading);

  // Use Zustand store for form state management
  const {
    data: formData,
    errors,
    setFieldValue,
    validateForm,
    reset: resetForm,
  } = useResetPasswordFormStore();

  // Local UI state (minimal)
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleInputChange = (field: keyof ResetPasswordFormData, value: string) => {
    setFieldValue(field, value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;
    if (!token) return;

    try {
      await resetPassword(token, formData.password);
      setIsSuccess(true);
      resetForm();
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : 'Failed to reset password';
      toast.error(msg);
    }
  };

  if (isSuccess) {
    return (
      <div className="text-center space-y-6">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>

        <div className="space-y-2">
          <Typography variant="title-l" className="text-foreground">
            Password Reset Successful
          </Typography>
          <Typography variant="body-m" className="text-muted-foreground">
            Your password has been successfully reset. You can now sign in with your new password.
          </Typography>
        </div>
        {onContinueToLogin ? (
          <Button
            type="button"
            variant="default"
            className="w-full h-11"
            onClick={onContinueToLogin}
          >
            Continue to login
          </Button>
        ) : null}
      </div>
    );
  }

  if (!token) {
    return (
      <div className="text-center space-y-6">
        <Typography variant="title-l" className="text-foreground">
          Invalid Reset Link
        </Typography>
        <Typography variant="body-m" className="text-muted-foreground">
          The password reset link is invalid or has expired.
        </Typography>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <Typography variant="title-l" className="text-foreground">
            Reset Your Password
          </Typography>
          <Typography variant="body-m" className="text-muted-foreground">
            Enter your new password below.
          </Typography>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* New Password Field */}
          <FormField
            label="New Password"
            error={errors.password}
            className="space-y-3"
          >
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your new password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className={cn(
                  'pl-10 pr-10 h-11',
                  errors.password && 'border-destructive focus:border-destructive'
                )}
                disabled={authLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={authLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </FormField>

          {/* Confirm Password Field */}
          <FormField
            label="Confirm New Password"
            error={errors.confirmPassword}
            className="space-y-3"
          >
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm your new password"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                className={cn(
                  'pl-10 pr-10 h-11',
                  errors.confirmPassword && 'border-destructive focus:border-destructive'
                )}
                disabled={authLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={authLoading}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </FormField>

          {/* Submit Button */}
          <Button
            type="submit"
            variant="default"
            className="w-full h-11 text-button-m transition-all duration-200"
            size="default"
            disabled={authLoading || !formData.password.trim() || !formData.confirmPassword.trim()}
          >
            {authLoading ? (
              <div className="flex items-center space-x-2">
                <Typography variant="button-m" className="pt-0.5">Resetting...</Typography>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Lock className="w-4 h-4" />
                <Typography variant="button-s">
                  Reset Password
                </Typography>
              </div>
            )}
          </Button>
        </form>

        {/* Back to Login */}
        {onBackToLogin && !isSuccess && (
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
