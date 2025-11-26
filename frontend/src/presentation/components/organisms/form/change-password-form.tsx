'use client';

import { useState } from 'react';
import { Button, Input, Typography } from '@/presentation/components/atoms';
import { InputField, FormField } from '@/presentation/components/molecules';
import { useAuth } from '@/presentation/contexts/auth-context';
import { useToast } from '@/presentation/hooks/use-toast';
import { cn } from '@/shared/utils';
import { Lock, Eye, EyeOff, Loader2, KeyRound } from 'lucide-react';

interface ChangePasswordFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
}

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export function ChangePasswordForm({ onSuccess, onCancel, className }: ChangePasswordFormProps) {
  const { handleChangePassword } = useAuth();
  const { showSuccess } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<PasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof PasswordFormData, string | null>>>({});
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleInputChange = (field: keyof PasswordFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validatePasswordStrength = (password: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  const validateForm = (): boolean => {
    const validationErrors: Partial<Record<keyof PasswordFormData, string | null>> = {};

    if (!formData.currentPassword.trim()) {
      validationErrors.currentPassword = 'Current password is required';
    }

    if (!formData.newPassword.trim()) {
      validationErrors.newPassword = 'New password is required';
    } else {
      const passwordValidation = validatePasswordStrength(formData.newPassword);
      if (!passwordValidation.isValid) {
        validationErrors.newPassword = passwordValidation.errors[0];
      }
    }

    if (!formData.confirmPassword.trim()) {
      validationErrors.confirmPassword = 'Please confirm your new password';
    } else if (formData.newPassword !== formData.confirmPassword) {
      validationErrors.confirmPassword = 'Passwords do not match';
    }

    if (formData.currentPassword === formData.newPassword) {
      validationErrors.newPassword = 'New password must be different from current password';
    }

    setErrors(validationErrors);
    return Object.values(validationErrors).every(error => !error);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    setError(null);

    try {
      await handleChangePassword(formData.currentPassword, formData.newPassword);

      // Clear form on success
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

      showSuccess('Password changed successfully!');
      onSuccess?.();
    } catch (error) {
      // Error toast is now handled by the auth context
      // We can still show local error state for validation feedback if needed
      const errorMessage = error instanceof Error ? error.message : 'Failed to change password';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn('w-full max-w-md space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2">
          <KeyRound className="h-5 w-5 text-primary" />
        </div>
        <div>
          <Typography variant="h3" size="lg" weight="semibold">
            Change Password
          </Typography>
          <Typography variant="p" size="sm" className="text-muted-foreground">
            Update your password to keep your account secure
          </Typography>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className={cn(
          'p-4 rounded-lg border border-destructive/20 bg-destructive/10',
          'flex items-start space-x-3'
        )}>
          <div className="flex-1">
            <Typography variant="p" size="sm" weight="medium" color="destructive" className="text-destructive">
              Password Change Error
            </Typography>
            <Typography variant="p" size="sm" color="destructive" className="text-destructive/80 mt-1">
              {error}
            </Typography>
          </div>
        </div>
      )}

      {/* Password Change Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Current Password */}
        <FormField
          label="Current Password"
          className="space-y-3"
        >
          <div className="relative">
            <Input
              type={showCurrentPassword ? 'text' : 'password'}
              placeholder="Enter your current password"
              value={formData.currentPassword}
              onChange={(e) => handleInputChange('currentPassword', e.target.value)}
              disabled={isLoading}
              className={cn(
                'h-11 pr-10',
                errors.currentPassword && 'border-destructive focus-visible:ring-destructive'
              )}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              disabled={isLoading}
            >
              {showCurrentPassword ? (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Eye className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </div>
          {errors.currentPassword && (
            <Typography variant="p" size="xs" color="destructive" className="text-destructive">
              {errors.currentPassword}
            </Typography>
          )}
        </FormField>

        {/* New Password */}
        <FormField
          label="New Password"
          className="space-y-3"
        >
          <div className="relative">
            <Input
              type={showNewPassword ? 'text' : 'password'}
              placeholder="Enter your new password"
              value={formData.newPassword}
              onChange={(e) => handleInputChange('newPassword', e.target.value)}
              disabled={isLoading}
              className={cn(
                'h-11 pr-10',
                errors.newPassword && 'border-destructive focus-visible:ring-destructive'
              )}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowNewPassword(!showNewPassword)}
              disabled={isLoading}
            >
              {showNewPassword ? (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Eye className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </div>
          {errors.newPassword && (
            <Typography variant="p" size="xs" color="destructive" className="text-destructive">
              {errors.newPassword}
            </Typography>
          )}
        </FormField>

        {/* Confirm New Password */}
        <FormField
          label="Confirm New Password"
          className="space-y-3"
        >
          <div className="relative">
            <Input
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Confirm your new password"
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              disabled={isLoading}
              className={cn(
                'h-11 pr-10',
                errors.confirmPassword && 'border-destructive focus-visible:ring-destructive'
              )}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              disabled={isLoading}
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Eye className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </div>
          {errors.confirmPassword && (
            <Typography variant="p" size="xs" color="destructive" className="text-destructive">
              {errors.confirmPassword}
            </Typography>
          )}
        </FormField>

        {/* Password Requirements */}
        <div className="text-xs text-muted-foreground space-y-1">
          <Typography variant="p" size="xs" weight="medium" className="text-foreground">
            Password Requirements:
          </Typography>
          <ul className="list-disc list-inside space-y-0.5 ml-2">
            <li>At least 8 characters long</li>
            <li>One uppercase letter</li>
            <li>One lowercase letter</li>
            <li>One number</li>
            <li>One special character</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
          <Button
            type="submit"
            disabled={isLoading}
            className="flex-1 sm:flex-none"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Changing...
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 mr-2" />
                Change Password
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 sm:flex-none"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
