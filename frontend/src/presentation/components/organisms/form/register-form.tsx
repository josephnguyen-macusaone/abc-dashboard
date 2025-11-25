'use client';

import { useState } from 'react';
import { Button, Input, Typography } from '@/presentation/components/atoms';
import { InputField, FormField } from '@/presentation/components/molecules';
import { useAuth } from '@/presentation/contexts/auth-context';
import { useToast } from '@/presentation/hooks/use-toast';
import { cn } from '@/shared/utils';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';

interface RegisterFormProps {
  onSuccess?: (email: string) => void;
  onSwitchToLogin?: () => void;
  className?: string;
}

interface RegisterFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export function RegisterForm({ onSuccess, onSwitchToLogin, className }: RegisterFormProps) {
  const { register } = useAuth();
  const { showError } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<RegisterFormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof RegisterFormData, string | null>>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleInputChange = (field: keyof RegisterFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    const validationErrors: Partial<Record<keyof RegisterFormData, string | null>> = {};
    if (!formData.firstName.trim()) {
      validationErrors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      validationErrors.lastName = 'Last name is required';
    }
    if (!formData.email.trim()) {
      validationErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      validationErrors.email = 'Please enter a valid email address';
    }
    if (!formData.password.trim()) {
      validationErrors.password = 'Password is required';
    }
    if (!formData.confirmPassword.trim()) {
      validationErrors.confirmPassword = 'Please confirm your password';
    }
    if (formData.password !== formData.confirmPassword) {
      validationErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(validationErrors);
    const hasErrors = Object.values(validationErrors).some(error => error !== null && error !== undefined);
    if (hasErrors) return;

    setIsLoading(true);
    setError(null);

    try {
      await register(formData.firstName, formData.lastName, formData.email, formData.password);
      onSuccess?.(formData.email);
    } catch (error) {
      showError(
        'Registration Failed',
        error instanceof Error ? error : 'An unexpected error occurred'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn('w-full max-w-md space-y-6', className)}>
      {/* Error Alert */}
      {error && (
        <div className={cn(
          'p-4 rounded-lg border border-destructive/20 bg-destructive/10',
          'flex items-start space-x-3'
        )}>
          <div className="flex-1">
            <Typography variant="p" size="sm" weight="medium" color="destructive" className="text-destructive">
              Registration Error
            </Typography>
            <Typography variant="p" size="sm" color="destructive" className="text-destructive/80 mt-1">
              {error}
            </Typography>
          </div>
        </div>
      )}

      {/* Registration Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* First Name Field */}
        <InputField
          label="First Name"
          type="text"
          placeholder="Enter your first name"
          value={formData.firstName}
          onChange={(e) => handleInputChange('firstName', e.target.value)}
          error={errors.firstName}
          disabled={isLoading}
          inputClassName="h-11"
          className="space-y-3"
        />

        {/* Last Name Field */}
        <InputField
          label="Last Name"
          type="text"
          placeholder="Enter your last name"
          value={formData.lastName}
          onChange={(e) => handleInputChange('lastName', e.target.value)}
          error={errors.lastName}
          disabled={isLoading}
          inputClassName="h-11"
          className="space-y-3"
        />

        {/* Email Field */}
        <InputField
          label="Email"
          type="email"
          placeholder="Enter your email address"
          value={formData.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
          error={errors.email}
          disabled={isLoading}
          icon={<Mail className="h-4 w-4" />}
          inputClassName="h-11"
          className="space-y-3"
        />

        {/* Password Fields */}
        <div className="space-y-4">
          {/* Password */}
          <FormField
            label="Password"
            error={errors.password}
            className="space-y-3"
          >
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a strong password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className={cn(
                  'pl-10 pr-10 h-11',
                  errors.password && 'border-destructive focus:border-destructive'
                )}
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </FormField>

          {/* Confirm Password */}
          <FormField
            label="Confirm Password"
            error={errors.confirmPassword}
            className="space-y-3"
          >
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                className={cn(
                  'pl-10 pr-10 h-11',
                  errors.confirmPassword && 'border-destructive focus:border-destructive'
                )}
                disabled={isLoading}
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
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          variant="default"
          className="w-full h-11 mt-4 font-semibold rounded-lg"
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Creating Account...</span>
            </div>
          ) : (
            'Create Account'
          )}
        </Button>
      </form>

      {/* Footer */}
      <div className="text-center">
        <Typography variant="p" size="sm" color="muted" className="text-muted-foreground">
          Already have an account?{' '}
          <Button
            type="button"
            variant="link"
            className="p-0 h-auto text-sm text-primary hover:text-primary/80"
            onClick={onSwitchToLogin}
            disabled={isLoading}
          >
            Sign in
          </Button>
        </Typography>
      </div>
    </div>
  );
}
