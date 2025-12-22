'use client';

import { useState } from 'react';
import { Button, Input, Typography } from '@/presentation/components/atoms';
import { FormField } from '@/presentation/components/molecules';
import { useAuthStore } from '@/infrastructure/stores/auth';
import { cn, logger } from '@/shared/helpers';
import { Lock, Eye, EyeOff, Loader2, KeyRound } from 'lucide-react';

interface ChangePasswordFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
  requiresCurrentPassword?: boolean;
  isForcedChange?: boolean;
}

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export function ChangePasswordForm({
  onSuccess,
  onCancel,
  className,
  requiresCurrentPassword = true,
  isForcedChange = false
}: ChangePasswordFormProps) {
  const { changePassword } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

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

    // Only validate current password if required
    if (requiresCurrentPassword && !formData.currentPassword.trim()) {
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

    // Only check if new password differs from current if current password was provided
    if (requiresCurrentPassword && formData.currentPassword && formData.currentPassword === formData.newPassword) {
      validationErrors.newPassword = 'New password must be different from current password';
    }

    setErrors(validationErrors);
    return Object.values(validationErrors).every(error => !error);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      await changePassword(formData.currentPassword || '', formData.newPassword);
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

      // Success toast will be handled by the page component
      onSuccess?.();
    } catch (error: any) {
      // Error toast will be handled by the auth store
      logger.error('Password change form error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn('w-full space-y-6', className)}>
      {/* Password Change Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Current Password - Only show if required */}
        {requiresCurrentPassword && (
          <FormField
            label="Current Password"
            error={errors.currentPassword}
            className="space-y-3"
          >
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type={showCurrentPassword ? 'text' : 'password'}
                placeholder="Enter your current password"
                value={formData.currentPassword}
                onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                disabled={isLoading}
                className={cn(
                  'pl-10 pr-10 h-11',
                  errors.currentPassword && 'border-destructive focus:border-destructive'
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
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
          </FormField>
        )}

        {/* New Password */}
        <FormField
          label="New Password"
          error={errors.newPassword}
          className="space-y-3"
        >
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type={showNewPassword ? 'text' : 'password'}
              placeholder="Enter your new password"
              value={formData.newPassword}
              onChange={(e) => handleInputChange('newPassword', e.target.value)}
              disabled={isLoading}
              className={cn(
                'pl-10 pr-10 h-11',
                errors.newPassword && 'border-destructive focus:border-destructive'
              )}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
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
        </FormField>

        {/* Confirm New Password */}
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
              disabled={isLoading}
              className={cn(
                'pl-10 pr-10 h-11',
                errors.confirmPassword && 'border-destructive focus:border-destructive'
              )}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
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
        </FormField>

        {/* Password Requirements */}
        <div className="bg-muted/50 rounded-lg p-4 border border-border">
          {/* MAC USA ONE Typography: Label S for requirements title */}
          <Typography variant="label-s" className="text-foreground mb-2">
            Password Requirements:
          </Typography>
          {/* MAC USA ONE Typography: Body XS for requirement list */}
          <ul className="text-body-xs text-muted-foreground list-disc list-inside space-y-0.5 ml-2">
            <li>At least 8 characters long</li>
            <li>One uppercase letter</li>
            <li>One lowercase letter</li>
            <li>One number</li>
            <li>One special character</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-end gap-3">
          {!isForcedChange && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              <KeyRound className="w-4 h-4" />
              <span className='text-button-s pb-0.5'>Cancel</span>
            </Button>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full sm:w-auto"
            variant="default"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className='text-button-s pb-0.5'>
                  {isForcedChange ? 'Setting...' : 'Changing...'}
                </span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span className='text-button-s pb-0.5'>
                  {isForcedChange ? 'Set Password' : 'Change Password'}
                </span>
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
