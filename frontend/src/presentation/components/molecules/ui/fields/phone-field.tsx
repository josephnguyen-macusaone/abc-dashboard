'use client';

import * as React from 'react';
import { PhoneInput, type PhoneInputProps } from '@/presentation/components/atoms/forms/phone-input';
import { FormField, type FormFieldProps } from './form-field';
import { cn } from '@/shared/helpers';

export interface PhoneFieldProps extends Omit<FormFieldProps, 'children'> {
  value?: string;
  onChange?: (value: string | undefined) => void;
  defaultCountry?: PhoneInputProps['defaultCountry'];
  disabled?: boolean;
  inputClassName?: string;
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
}: PhoneFieldProps) {
  return (
    <FormField
      label={label}
      error={error}
      required={required}
      className={className}
      description={description}
      id={id}
    >
      <PhoneInput
        value={value}
        onChange={onChange}
        defaultCountry={defaultCountry}
        disabled={disabled}
        inputClassName={cn(
          error && 'border-destructive focus:border-destructive',
          inputClassName
        )}
        placeholder="Enter phone number"
      />
    </FormField>
  );
}

