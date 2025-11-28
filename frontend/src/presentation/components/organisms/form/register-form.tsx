'use client';

import { useState } from 'react';
import { Button, Input, Typography } from '@/presentation/components/atoms';
import { InputField, FormField } from '@/presentation/components/molecules';
import { useAuth } from '@/presentation/contexts/auth-context';
import { cn } from '@/shared/utils';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';

interface RegisterFormProps {
  onSuccess?: (email: string, username: string) => void;
  onSwitchToLogin?: () => void;
  className?: string;
}

interface RegisterFormData {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export function RegisterForm({ onSuccess, onSwitchToLogin, className }: RegisterFormProps) {
  const { register } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<RegisterFormData>({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof RegisterFormData, string | null>>>({});
  const [showPassword, setShowPassword] = useState(false);

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
    if (!formData.username.trim()) {
      validationErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      validationErrors.username = 'Username must be at least 3 characters long';
    } else if (formData.username.length > 30) {
      validationErrors.username = 'Username cannot exceed 30 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      validationErrors.username = 'Username can only contain letters, numbers, and underscores';
    }
    if (!formData.password.trim()) {
      validationErrors.password = 'Password is required';
    } else {
      // Password strength validation
      const passwordErrors: string[] = [];
      if (formData.password.length < 8) {
        passwordErrors.push('at least 8 characters');
      }
      if (!/(?=.*[a-z])/.test(formData.password)) {
        passwordErrors.push('one lowercase letter');
      }
      if (!/(?=.*[A-Z])/.test(formData.password)) {
        passwordErrors.push('one uppercase letter');
      }
      if (!/(?=.*\d)/.test(formData.password)) {
        passwordErrors.push('one number');
      }
      if (passwordErrors.length > 0) {
        validationErrors.password = `Password must contain ${passwordErrors.join(', ')}`;
      }
    }
    setErrors(validationErrors);
    const hasErrors = Object.values(validationErrors).some(error => error !== null && error !== undefined);
    if (hasErrors) return;
    setIsLoading(true);
    setError(null);
    try {
      await register(formData.username, formData.firstName, formData.lastName, formData.email, formData.password);
      onSuccess?.(formData.email, formData.username);
    } catch (error) {
      // Error toast is now handled by the auth context
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
            {/* MAC USA ONE Typography: Title S for error title */}
            <Typography variant="title-s" color="error" className="text-destructive">
              Registration Error
            </Typography>
            {/* MAC USA ONE Typography: Body S for error message */}
            <Typography variant="body-s" color="error" className="text-destructive/80 mt-1">
              {error}
            </Typography>
          </div>
        </div>
      )}

      {/* Registration Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name Fields - First and Last Name in same row */}
        <div className="grid grid-cols-2 gap-4">
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
        </div>

        {/* Username Field */}
        <InputField
          label="Username"
          type="text"
          placeholder="Choose a username"
          value={formData.username}
          onChange={(e) => handleInputChange('username', e.target.value)}
          error={errors.username}
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
        {/* MAC USA ONE Typography: Body S for footer text */}
        <Typography variant="body-s" color="muted" as="p">
          Already have an account?{' '}
          <Button
            type="button"
            variant="link"
            className="p-0 h-auto text-body-s text-primary hover:text-primary/80"
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
