'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, Mail, User, UserPlus } from 'lucide-react';
import { Button, Input, Typography } from '@/presentation/components/atoms';
import { FormField, InputField, PhoneField } from '@/presentation/components/molecules';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/presentation/components/atoms/forms/select';
import { useToast } from '@/presentation/contexts/toast-context';
import { useAuthStore } from '@/infrastructure/stores/auth';
import { ROLE_DEFINITIONS, USER_ROLES, type UserRoleType } from '@/shared/constants/auth';
import { cn } from '@/shared/helpers';

type SignupRole = 'agent' | 'tech' | 'accountant';

interface SignupFormProps {
  onSuccess?: () => void;
  className?: string;
}

interface SignupFormState {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  phone: string;
  password: string;
  confirmPassword: string;
  role: SignupRole;
}

const SIGNUP_ROLE_OPTIONS: SignupRole[] = [USER_ROLES.AGENT, USER_ROLES.TECH, USER_ROLES.ACCOUNTANT];

export function SignupForm({ onSuccess, className }: SignupFormProps) {
  const router = useRouter();
  const toast = useToast();
  const signup = useAuthStore((s) => s.signup);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof SignupFormState, string>>>({});
  const [formData, setFormData] = useState<SignupFormState>({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: USER_ROLES.AGENT,
  });

  function onFieldChange<K extends keyof SignupFormState>(field: K, value: SignupFormState[K]) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  function validateForm() {
    const nextErrors: Partial<Record<keyof SignupFormState, string>> = {};

    if (!formData.firstName.trim()) nextErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) nextErrors.lastName = 'Last name is required';
    if (!formData.email.trim()) nextErrors.email = 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) nextErrors.email = 'Enter a valid email';
    if (formData.password.length < 8) nextErrors.password = 'Password must be at least 8 characters';
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password))
      nextErrors.password = 'Use upper, lower, and number';
    if (formData.confirmPassword !== formData.password)
      nextErrors.confirmPassword = 'Passwords do not match';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!validateForm()) return;

    const email = formData.email.trim();

    await toast.promise(
      signup({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email,
        password: formData.password,
        role: formData.role,
        username: formData.username.trim() || undefined,
        phone: formData.phone.trim() || undefined,
      }),
      {
        loading: 'Creating account...',
        success: () => {
          onSuccess?.();
          router.push(`/verify-email?pending=true&email=${encodeURIComponent(email)}`);
          return 'Account created! Check your email to verify.';
        },
        error: (error: unknown) =>
          (error as { message?: string })?.message || 'Signup failed. Please try again.',
      }
    );
  }

  return (
    <div className={cn('w-full max-w-md space-y-6 mt-6', className)}>
      <form onSubmit={onSubmit} className="space-y-4">
        <InputField
          label="First Name"
          type="text"
          placeholder="Enter your first name"
          value={formData.firstName}
          onChange={(event) => onFieldChange('firstName', event.target.value)}
          error={errors.firstName}
          disabled={isLoading}
          icon={<User className="h-4 w-4" />}
          inputClassName="h-11"
          className="space-y-3"
        />

        <InputField
          label="Last Name"
          type="text"
          placeholder="Enter your last name"
          value={formData.lastName}
          onChange={(event) => onFieldChange('lastName', event.target.value)}
          error={errors.lastName}
          disabled={isLoading}
          icon={<User className="h-4 w-4" />}
          inputClassName="h-11"
          className="space-y-3"
        />

        <InputField
          label="Email"
          type="email"
          autoComplete="off"
          placeholder="Enter your email address"
          value={formData.email}
          onChange={(event) => onFieldChange('email', event.target.value)}
          error={errors.email}
          disabled={isLoading}
          icon={<Mail className="h-4 w-4" />}
          inputClassName="h-11"
          className="space-y-3"
        />

        <InputField
          label="Username (Optional)"
          type="text"
          placeholder="Auto-generated when empty"
          value={formData.username}
          onChange={(event) => onFieldChange('username', event.target.value)}
          disabled={isLoading}
          icon={<User className="h-4 w-4" />}
          inputClassName="h-11"
          className="space-y-3"
        />

        <PhoneField
          label="Phone (Optional)"
          value={formData.phone}
          onChange={(value) => onFieldChange('phone', value || '')}
          disabled={isLoading}
          inputClassName="h-11"
          className="space-y-3"
        />

        <FormField label="Role" className="space-y-3">
          <Select
            value={formData.role}
            onValueChange={(value: SignupRole) => onFieldChange('role', value)}
            disabled={isLoading}
          >
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {SIGNUP_ROLE_OPTIONS.map((role) => (
                <SelectItem key={role} value={role}>
                  {ROLE_DEFINITIONS[role as UserRoleType].displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField label="Password" error={errors.password} className="space-y-3">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Create a password"
              value={formData.password}
              onChange={(event) => onFieldChange('password', event.target.value)}
              className={cn('pl-10 pr-10 h-11', errors.password && 'border-destructive')}
              disabled={isLoading}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
              onClick={() => setShowPassword((prev) => !prev)}
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

        <FormField label="Confirm Password" error={errors.confirmPassword} className="space-y-3">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={(event) => onFieldChange('confirmPassword', event.target.value)}
              className={cn('pl-10 pr-10 h-11', errors.confirmPassword && 'border-destructive')}
              disabled={isLoading}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
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

        <Button type="submit" variant="default" className="w-full h-11 mt-4" disabled={isLoading}>
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <Typography variant="button-m" className="pt-0.5">
                Creating account...
              </Typography>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              <Typography variant="button-l" className="pt-0.5">
                Sign Up
              </Typography>
            </div>
          )}
        </Button>
      </form>

      <div className="text-center">
        <Button type="button" variant="ghost" className="p-0 h-auto" onClick={() => router.push('/login')}>
          <Typography variant="button-m" color="muted" className="hover:text-primary">
            Already have an account? Sign in
          </Typography>
        </Button>
      </div>
    </div>
  );
}
