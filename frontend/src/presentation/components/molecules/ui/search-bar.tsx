'use client';

import * as React from 'react';
import { Input } from '@/presentation/components/atoms';
import { Button } from '@/presentation/components/atoms/primitives/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/presentation/components/atoms/forms/select';
import { Search, X } from 'lucide-react';
import { cn } from '@/shared/helpers';

/** Prefix option for "search in" (e.g. DBA vs Agents Name). Used when prefix is shown. */
export type SearchPrefixValue = 'dba' | 'agentsName';

const PREFIX_OPTIONS: { value: SearchPrefixValue; label: string }[] = [
  { value: 'dba', label: 'DBA' },
  { value: 'agentsName', label: 'Agents' },
];

export interface SearchBarProps extends Omit<React.ComponentProps<'input'>, 'type'> {
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

  /** Optional: show "search in" prefix (DBA / Agents). When set, renders dropdown + input. */
  searchField?: SearchPrefixValue | undefined;
  /** Called when prefix selection changes. Required when searchField is used. */
  onSearchFieldChange?: (value: SearchPrefixValue) => void;
  /** If true, hide the prefix dropdown even when searchField/onSearchFieldChange are set */
  hidePrefix?: boolean;
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
  searchField,
  onSearchFieldChange,
  hidePrefix = false,
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
      if (event.key === 'Enter') {
        event.preventDefault();
      }
      onKeyDown?.(event);
    },
    [onKeyDown],
  );

  const handleClear = React.useCallback(() => {
    onValueChange?.('');
    onClear?.();
  }, [onClear, onValueChange]);

  const effectiveField = searchField ?? 'dba';
  const showPrefix = !hidePrefix && searchField !== undefined && onSearchFieldChange !== undefined;

  const inputBlock = (
    <div className={cn('relative w-full', showPrefix && 'flex-1 min-w-0')}>
      <Search
        className={cn(
          'absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground pointer-events-none z-10',
          showPrefix && 'left-2',
        )}
      />
      <Input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={cn(
          'pl-10 pr-8',
          showPrefix && 'h-8 rounded-none border-0 border-l border-input py-2 pl-9',
          inputClassName,
        )}
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

  if (showPrefix) {
    return (
      <div
        className={cn(
          'flex items-center gap-0 rounded-md border border-input bg-transparent overflow-hidden',
          className,
        )}
      >
        <Select
          value={effectiveField}
          onValueChange={(v) => onSearchFieldChange(v as SearchPrefixValue)}
        >
          <SelectTrigger
            className={cn(
              'h-8 min-w-0 w-[100px] max-w-[100px] shrink-0 rounded-none border-0 border-r border-input bg-muted/30 shadow-none',
              'text-xs text-left',
              '[&>span]:text-xs [&>span]:text-left [&>span]:line-clamp-1',
              'focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 outline-none',
            )}
            aria-label="Search in"
          >
            <SelectValue placeholder="Search in" />
          </SelectTrigger>
          <SelectContent size="sm">
            {PREFIX_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="py-1.5">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {inputBlock}
      </div>
    );
  }

  return <div className={cn('relative w-full', className)}>{inputBlock}</div>;
}
