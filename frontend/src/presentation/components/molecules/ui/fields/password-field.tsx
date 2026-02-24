'use client';

import { forwardRef, useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { Input, Label } from '@/presentation/components/atoms';
import { cn } from '@/shared/helpers';

interface PasswordFieldProps {
  id: string;
  label: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  ({
    id,
    label,
    placeholder,
    error,
    disabled,
    required,
    className,
    ...props
  }, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
      <div className={cn('space-y-3', className)}>
        <Label
          htmlFor={id}
          className="flex items-center gap-2"
        >
          <Lock className="h-4 w-4 text-primary" />
          {label}
          {required && <span className="text-destructive">*</span>}
        </Label>
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/20 rounded-lg blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"></div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              ref={ref}
              id={id}
              type={showPassword ? 'text' : 'password'}
              placeholder={placeholder}
              className={cn(
                'w-full h-12 pl-12 pr-12',
                error && 'border-destructive focus:border-destructive'
              )}
              disabled={disabled}
              {...props}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground hover:text-primary transition-colors focus:outline-none"
              onClick={() => setShowPassword(!showPassword)}
              disabled={disabled}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
        {error && (
          <div className="flex items-center gap-2 text-error animate-in slide-in-from-left-2 duration-200">
            <div className="w-1 h-1 bg-error rounded-full"></div>
            {/* MAC USA ONE Typography: Body XS for error messages */}
            <p className="text-body-xs">{error}</p>
          </div>
        )}
      </div>
    );
  }
);

PasswordField.displayName = 'PasswordField';
