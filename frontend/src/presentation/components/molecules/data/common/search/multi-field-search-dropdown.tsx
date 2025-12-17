'use client';

import * as React from 'react';
import { Search, ChevronDown, X } from 'lucide-react';
import {
  Button,
  Input,
  Separator,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/presentation/components/atoms';
import { cn } from '@/shared/utils';

// ============================================================================
// Types
// ============================================================================

export interface SearchField {
  /** Unique field identifier */
  key: string;

  /** Display label */
  label: string;

  /** Field type for input validation */
  type?: 'text' | 'email' | 'phone' | 'number';

  /** Optional placeholder text */
  placeholder?: string;

  /** Optional icon */
  icon?: React.ComponentType<{ className?: string }>;
}

export interface MultiFieldSearchDropdownProps {
  /** Available search fields */
  fields: SearchField[];

  /** Current search value */
  value: string;

  /** Currently selected field (use 'all' for multi-field search) */
  selectedField: string;

  /** Callback when search value changes */
  onValueChange: (value: string) => void;

  /** Callback when selected field changes */
  onFieldChange: (field: string) => void;

  /** Placeholder text */
  placeholder?: string;

  /** Optional class name */
  className?: string;

  /** Debounce delay in milliseconds */
  debounceMs?: number;

  /** Whether the search is currently loading */
  isLoading?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function MultiFieldSearchDropdown({
  fields,
  value,
  selectedField,
  onValueChange,
  onFieldChange,
  placeholder = 'Search...',
  className,
  debounceMs = 300,
  isLoading = false,
}: MultiFieldSearchDropdownProps) {
  const [localValue, setLocalValue] = React.useState(value);
  const debounceTimerRef = React.useRef<NodeJS.Timeout | undefined>(undefined);

  // Sync external value changes
  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounced search
  const handleValueChange = React.useCallback(
    (newValue: string) => {
      setLocalValue(newValue);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        onValueChange(newValue);
      }, debounceMs);
    },
    [onValueChange, debounceMs]
  );

  // Clear search
  const handleClear = React.useCallback(() => {
    setLocalValue('');
    onValueChange('');
  }, [onValueChange]);

  // Get current field configuration
  const currentField = fields.find((f) => f.key === selectedField);
  const isAllFields = selectedField === 'all' || !currentField;

  // Determine placeholder
  const currentPlaceholder = currentField?.placeholder || placeholder;

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <div
      className={cn(
        'flex items-center gap-0 border rounded-md bg-background',
        'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
        className
      )}
    >
      {/* Field Selector Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 rounded-r-none border-r px-3 hover:bg-muted"
          >
            <span className="text-sm font-medium">
              {isAllFields ? 'All Fields' : currentField?.label}
            </span>
            <ChevronDown className="ml-1 h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem
            onClick={() => onFieldChange('all')}
            className={cn(isAllFields && 'bg-accent')}
          >
            <Search className="mr-2 h-4 w-4" />
            All Fields
          </DropdownMenuItem>
          <Separator className="my-1" />
          {fields.map((field) => {
            const Icon = field.icon;
            return (
              <DropdownMenuItem
                key={field.key}
                onClick={() => onFieldChange(field.key)}
                className={cn(selectedField === field.key && 'bg-accent')}
              >
                {Icon && <Icon className="mr-2 h-4 w-4" />}
                {field.label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Search Input */}
      <div className="relative flex-1">
        <Input
          type="search"
          value={localValue}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleValueChange(e.target.value)}
          placeholder={currentPlaceholder}
          className="h-9 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 pl-3 pr-20"
        />

        {/* Search Icon or Loading Indicator */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 gap-2">
          {isLoading && (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          )}

          {localValue && !isLoading && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-transparent"
              onClick={handleClear}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Clear search</span>
            </Button>
          )}

          <Search className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}
