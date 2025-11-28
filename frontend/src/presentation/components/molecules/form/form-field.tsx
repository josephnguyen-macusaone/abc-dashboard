'use client';

import * as React from 'react';
import { Typography, Input, Label } from '@/presentation/components/atoms';
import { cn } from '@/shared/utils';

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        // MAC USA ONE Typography: Body S for textarea (matches input)
        'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-body-s ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = 'Textarea';

export interface FormFieldProps {
  label?: string;
  error?: string | null;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
  id?: string;
  description?: string;
}

export function FormField({
  label,
  error,
  required = false,
  className,
  children,
  id,
  description
}: FormFieldProps) {
  const fieldId = id || React.useId();

  return (
    <div className={cn('space-y-4', className)}>
      {label && (
        <Label htmlFor={fieldId} className="block">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}

      <div className="relative">
        {React.cloneElement(children as React.ReactElement<any>, {
          id: fieldId,
          'aria-invalid': !!error,
          'aria-describedby': error ? `${fieldId}-error` : description ? `${fieldId}-description` : undefined,
        })}
      </div>

      {description && !error && (
        <Typography
          variant="caption"
          color="muted"
          className="text-muted-foreground"
          id={`${fieldId}-description`}
        >
          {description}
        </Typography>
      )}

      {error && (
        <Typography
          variant="body-xs"
          color="error"
          className="text-error"
          id={`${fieldId}-error`}
        >
          {error}
        </Typography>
      )}
    </div>
  );
}

export interface InputFieldProps extends Omit<FormFieldProps, 'children'> {
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  icon?: React.ReactNode;
  inputClassName?: string;
  maxLength?: number;
}

export function InputField({
  label,
  error,
  required,
  className,
  type = 'text',
  placeholder,
  value,
  onChange,
  disabled,
  icon,
  inputClassName,
  description,
  id,
  maxLength
}: InputFieldProps) {


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
        {icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground z-10">
            {icon}
          </div>
        )}
        <Input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          maxLength={maxLength}
          className={cn(
            icon && 'pl-10',
            error && 'border-destructive focus:border-destructive',
            inputClassName
          )}
        />
      </div>
    </FormField>
  );
}

export interface TextAreaFieldProps extends Omit<FormFieldProps, 'children'> {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  rows?: number;
  maxLength?: number;
}

export function TextAreaField({
  label,
  error,
  required,
  className,
  placeholder,
  value,
  onChange,
  disabled,
  rows = 3,
  description,
  id,
  maxLength
}: TextAreaFieldProps) {

  return (
    <FormField
      label={label}
      error={error}
      required={required}
      className={className}
      description={description}
      id={id}
    >
      <Textarea
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        rows={rows}
        maxLength={maxLength}
        className={cn(
          error && 'border-destructive focus:border-destructive'
        )}
      />
    </FormField>
  );
}
