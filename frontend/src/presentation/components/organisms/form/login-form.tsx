'use client';

import { useState, useEffect } from 'react';
import { Button, Input, Typography } from '@/presentation/components/atoms';
import { InputField, FormField } from '@/presentation/components/molecules';
import { useAuth } from '@/presentation/contexts/auth-context';
import { useAuthStore } from '@/infrastructure/stores/auth-store';
import { cn } from '@/shared/utils';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { toast } from '@/presentation/components/atoms';

interface LoginFormProps {
  onSuccess?: () => void;
  className?: string;
}

interface LoginFormData {
  email: string;
  password: string;
}

export function LoginForm({ onSuccess, className }: LoginFormProps) {
  const { login } = useAuth();
  const { emailVerificationRequired, emailVerificationMessage, clearEmailVerificationState } = useAuthStore();
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof LoginFormData, string | null>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Show email verification message when required
  useEffect(() => {
    if (emailVerificationRequired && emailVerificationMessage) {
      toast.info(`${emailVerificationMessage}`);
      clearEmailVerificationState();
    }
  }, [emailVerificationRequired, emailVerificationMessage, clearEmailVerificationState]);

  const handleInputChange = (field: keyof LoginFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Basic validation
    const validationErrors: Partial<Record<keyof LoginFormData, string | null>> = {};
    if (!formData.email.trim()) {
      validationErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      validationErrors.email = 'Please enter a valid email address';
    }
    if (!formData.password.trim()) {
      validationErrors.password = 'Password is required';
    }
    setErrors(validationErrors);
    const hasErrors = Object.values(validationErrors).some(error => error !== null && error !== undefined);
    if (hasErrors) return;
    setIsLoading(true);
    try {
      await login(formData.email, formData.password);
      onSuccess?.();
    } catch (error: unknown) {
      // Only show error for non-email-verification errors
      const errorMessage = (error as Error)?.message || 'Login failed';
      if (!errorMessage.includes('verify your email') && !errorMessage.includes('Check your email')) {
        toast.error(errorMessage);
      }
      // Email verification errors are handled by the useEffect above
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn('w-full max-w-md space-y-6', className)}>
      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
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

        {/* Password Field */}
        <FormField
          label="Password"
          error={errors.password}
          className="space-y-3"
        >
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
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

        {/* Submit Button */}
        <Button
          type="submit"
          variant="default"
          className="w-full h-11 mt-4 text-button-m"
          size="default"
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span className="text-button-m">Signing in...</span>
            </div>
          ) : (
            'Sign In'
          )}
        </Button>
      </form>

      {/* Additional Links */}
      <div className="text-center space-y-2">
        <Button
          type="button"
          variant="link"
          className="text-muted-foreground hover:text-primary p-0 h-auto"
          onClick={() => {
            toast.info('Password reset functionality will be available soon.');
          }}
        >
          Forgot your password?
        </Button>
      </div>
    </div>
  );
}
