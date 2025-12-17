'use client';

import * as React from 'react';
import { Input } from '@/presentation/components/atoms';
import { Button } from '@/presentation/components/atoms/primitives/button';
import { Search, X } from 'lucide-react';
import { cn } from '@/shared/utils';

export interface SearchBarProps extends Omit<React.ComponentProps<"input">, "type"> {
  /**
   * Placeholder text for the search input
   */
  placeholder?: string;
  /**
   * Current search value
   */
  value: string;
  /**
   * Callback when search value changes (string convenience)
   */
  onValueChange?: (value: string) => void;
  /**
   * Callback when search input changes (native event) — kept for compatibility
   */
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /**
   * Show clear (X) button
   */
  allowClear?: boolean;
  /**
   * Additional className for the wrapper div
   */
  className?: string;
  /**
   * Additional className for the input element
   */
  inputClassName?: string;
  /**
   * Whether the search bar is disabled
   */
  disabled?: boolean;
  /**
   * Optional handler when cleared
   */
  onClear?: () => void;
}

export function SearchBar({
  placeholder = 'Search...',
  value,
  onValueChange,
  onChange,
  allowClear = true,
  className,
  inputClassName,
  disabled,
  onClear,
  onKeyDown,
  ...props
}: SearchBarProps) {
  const handleChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onValueChange?.(event.target.value);
      onChange?.(event);
    },
    [onChange, onValueChange],
  );

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      // Prevent form submission on Enter key
      if (event.key === 'Enter') {
        event.preventDefault();
      }
      // Call the parent's onKeyDown if provided
      onKeyDown?.(event);
    },
    [onKeyDown],
  );

  const handleClear = React.useCallback(() => {
    onValueChange?.('');
    onClear?.();
  }, [onClear, onValueChange]);

  return (
    <div className={cn('relative w-full', className)}>
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
      <Input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={cn('pl-10 pr-8', inputClassName)}
      />
      {allowClear && value && !disabled ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1/2 h-7 -translate-y-1/2 px-2 hover:bg-transparent"
          onClick={handleClear}
          aria-label="Clear search"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </Button>
      ) : null}
    </div>
  );
}

