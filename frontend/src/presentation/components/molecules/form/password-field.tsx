import { forwardRef, useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';

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
      <div className={`space-y-3 ${className}`}>
        <label
          htmlFor={id}
          className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2"
        >
          <Lock className="h-4 w-4 text-purple-500" />
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-lg blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"></div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
            <input
              ref={ref}
              id={id}
              type={showPassword ? 'text' : 'password'}
              placeholder={placeholder}
              className="w-full h-12 pl-12 pr-12 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
              disabled={disabled}
              {...props}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 hover:text-purple-500 transition-colors focus:outline-none"
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
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400 animate-in slide-in-from-left-2 duration-200">
            <div className="w-1 h-1 bg-red-500 rounded-full"></div>
            <p className="text-sm">{error}</p>
          </div>
        )}
      </div>
    );
  }
);

PasswordField.displayName = 'PasswordField';

