'use client';

import * as React from 'react';
import PhoneInputWithCountry, { type Country } from 'react-phone-number-input';
import { cn } from '@/shared/helpers';

export interface PhoneInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'ref'> {
  value?: string;
  onChange?: (value: string | undefined) => void;
  defaultCountry?: Country;
  className?: string;
  inputClassName?: string;
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value, onChange, defaultCountry, className, inputClassName, disabled, ...props }, ref) => {
    // Only create ref callback if ref is actually provided
    // This prevents the library from trying to access a null ref
    const numberInputProps = React.useMemo(() => {
      const baseProps: any = {
        className: cn(
          'file:text-foreground placeholder:text-muted-foreground',
          'selection:bg-primary selection:text-primary-foreground',
          'h-11 w-full min-w-0 rounded-md border-0 bg-background',
          'px-3 py-3 text-body-s',
          'transition-[color,box-shadow,border-color] outline-none',
          'focus-visible:outline-none focus-visible:shadow-sm',
          'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
          inputClassName
        ),
        ...props,
      };

      // Only add ref if it's provided
      if (ref) {
        baseProps.ref = (node: HTMLInputElement | null) => {
          if (typeof ref === 'function') {
            ref(node);
          } else if (ref) {
            ref.current = node;
          }
        };
      }

      return baseProps;
    }, [ref, inputClassName, props]);

    // Adapter function to handle the onChange type properly
    const handlePhoneChange = React.useCallback((phoneValue: string | undefined) => {
      // Convert to string and call the onChange handler
      onChange?.(phoneValue);
    }, [onChange]);

    return (
      <div className={cn('relative phone-input-wrapper', className)}>
        <PhoneInputWithCountry
          international
          defaultCountry={defaultCountry || 'US'}
          value={value}
          onChange={handlePhoneChange}
          disabled={disabled}
          className="phone-input"
          numberInputProps={numberInputProps}
        />
      </div>
    );
  }
);

PhoneInput.displayName = 'PhoneInput';

export { PhoneInput };

