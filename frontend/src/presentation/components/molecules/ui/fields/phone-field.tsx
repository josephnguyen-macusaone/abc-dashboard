'use client';

import * as React from 'react';
import { PhoneInput, type PhoneInputProps } from '@/presentation/components/atoms/forms/phone-input';
import { FormField, type FormFieldProps } from './form-field';
import { Button } from '@/presentation/components/atoms';
import { cn } from '@/shared/helpers';
import { X } from 'lucide-react';

export interface PhoneFieldProps extends Omit<FormFieldProps, 'children'> {
  value?: string;
  onChange?: (value: string | undefined) => void;
  defaultCountry?: PhoneInputProps['defaultCountry'];
  disabled?: boolean;
  inputClassName?: string;
  /** When true, show a clear (X) button when the field has a value */
  clearable?: boolean;
}

export function PhoneField({
  label,
  error,
  required,
  className,
  description,
  id,
  value,
  onChange,
  defaultCountry,
  disabled,
  inputClassName,
  clearable = false,
}: PhoneFieldProps) {
  const hasValue = typeof value === 'string' && value.trim() !== '';
  const onClear = () => onChange?.(undefined);

  return (
    <FormField
      label={label}
      error={error}
      required={required}
      className={className}
      description={description}
      id={id}
    >
      <div className="relative">
        <PhoneInput
          value={value}
          onChange={onChange}
          defaultCountry={defaultCountry}
          disabled={disabled}
          inputClassName={cn(
            clearable && hasValue && 'pr-10',
            error && 'border-destructive focus:border-destructive',
            inputClassName
          )}
          placeholder="Enter phone number"
        />
        {clearable && hasValue && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground z-10"
            onClick={onClear}
            disabled={disabled}
            aria-label="Clear phone number"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </FormField>
  );
}

