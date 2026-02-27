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

/** Prefix option for "search in" (e.g. DBA vs Agents Name vs Zipcode). Used when prefix is shown. */
export type SearchPrefixValue = 'dba' | 'agentsName' | 'zip';

const PREFIX_OPTIONS: { value: SearchPrefixValue; label: string }[] = [
  { value: 'dba', label: 'DBA' },
  { value: 'agentsName', label: 'Agents' },
  { value: 'zip', label: 'Zipcode' },
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
  /** When set, shows a search button and triggers search only on click (not on typing). Enter key also triggers. */
  onSearch?: () => void;
  /** When 'external', search button is not rendered inside input - parent renders it separately. Use with onSearch. */
  searchButtonPosition?: 'inline' | 'external';
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
  onSearch,
  searchButtonPosition = 'inline',
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
        if (onSearch) onSearch();
      }
      onKeyDown?.(event);
    },
    [onKeyDown, onSearch],
  );

  const handleClear = React.useCallback(() => {
    onValueChange?.('');
    onClear?.();
  }, [onClear, onValueChange]);

  const effectiveField = searchField ?? 'dba';
  const showPrefix = !hidePrefix && searchField !== undefined && onSearchFieldChange !== undefined;

  const inputBlock = (
    <div className={cn('relative w-full', showPrefix && 'flex-1 min-w-0')}>
      {!showPrefix && (
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground pointer-events-none z-10"
        />
      )}
      <Input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={cn(
          'pl-10',
          onSearch && searchButtonPosition === 'inline' ? 'pr-24' : 'pr-8',
          showPrefix && 'h-8 rounded-none border-0 border-l-0 border-input py-2 pl-3',
          inputClassName,
        )}
      />
      <div className="absolute right-1 top-1/2 flex h-7 -translate-y-1/2 items-center gap-0.5">
        {onSearch && searchButtonPosition === 'inline' && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 shrink-0 bg-transparent hover:opacity-70"
            onClick={onSearch}
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </Button>
        )}
        {allowClear && value && !disabled ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 hover:bg-transparent shrink-0"
            onClick={handleClear}
            aria-label="Clear search"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </Button>
        ) : null}
      </div>
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
              'h-8 min-w-0 w-[100px] max-w-[100px] shrink-0 rounded-l-md rounded-r-none border-0 border-r border-input bg-muted/30 shadow-none pl-3',
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
