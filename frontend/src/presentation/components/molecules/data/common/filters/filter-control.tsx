'use client';

import * as React from 'react';
import { Calendar, X } from 'lucide-react';
import { Input } from '@/presentation/components/atoms/forms/input';
import { Label } from '@/presentation/components/atoms/forms/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/presentation/components/atoms/forms/select';
import { Checkbox } from '@/presentation/components/atoms/forms/checkbox';
import { Button } from '@/presentation/components/atoms/primitives/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/presentation/components/atoms/primitives/popover';
import { Calendar as CalendarComponent } from '@/presentation/components/atoms/primitives/calendar';
import { Typography } from '@/presentation/components/atoms/display/typography';
import { cn } from '@/shared/utils';
import { format } from 'date-fns';
import type { FilterConfig, FilterValue, DateRange, NumberRange } from '@/shared/types/data-display';

// ============================================================================
// Types
// ============================================================================

export interface FilterControlProps {
  /** Filter configuration */
  filter: FilterConfig;

  /** Current value */
  value: FilterValue;

  /** Callback when value changes */
  onChange: (value: FilterValue) => void;
}

// ============================================================================
// Component
// ============================================================================

export function FilterControl({ filter, value, onChange }: FilterControlProps) {
  // Render based on filter type
  switch (filter.type) {
    case 'text':
      return <TextFilter filter={filter} value={value as string} onChange={onChange} />;

    case 'select':
      return <SelectFilter filter={filter} value={value as string} onChange={onChange} />;

    case 'multi-select':
      return <MultiSelectFilter filter={filter} value={value as string[]} onChange={onChange} />;

    case 'date-range':
      return <DateRangeFilter filter={filter} value={value as DateRange} onChange={onChange} />;

    case 'number-range':
      return <NumberRangeFilter filter={filter} value={value as NumberRange} onChange={onChange} />;

    case 'boolean':
      return <BooleanFilter filter={filter} value={value as boolean} onChange={onChange} />;

    case 'custom':
      if (filter.render) {
        return <>{filter.render({ value, onChange, config: filter })}</>;
      }
      return null;

    default:
      return null;
  }
}

// ============================================================================
// Filter Type Components
// ============================================================================

function TextFilter({
  filter,
  value,
  onChange,
}: {
  filter: FilterConfig;
  value: string;
  onChange: (value: FilterValue) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={filter.id} className="text-sm font-medium">
        {filter.label}
      </Label>
      {filter.description && (
        <Typography variant="body-xs" className="text-muted-foreground">
          {filter.description}
        </Typography>
      )}
      <Input
        id={filter.id}
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={filter.description}
        className="h-9"
      />
    </div>
  );
}

function SelectFilter({
  filter,
  value,
  onChange,
}: {
  filter: FilterConfig;
  value: string;
  onChange: (value: FilterValue) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={filter.id} className="text-sm font-medium">
        {filter.label}
      </Label>
      {filter.description && (
        <Typography variant="body-xs" className="text-muted-foreground">
          {filter.description}
        </Typography>
      )}
      <Select value={value || ''} onValueChange={onChange}>
        <SelectTrigger id={filter.id} className="h-9">
          <SelectValue placeholder="Select an option" />
        </SelectTrigger>
        <SelectContent>
          {filter.options?.map((option) => (
            <SelectItem
              key={String(option.value)}
              value={String(option.value)}
              disabled={option.disabled}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function MultiSelectFilter({
  filter,
  value,
  onChange,
}: {
  filter: FilterConfig;
  value: string[];
  onChange: (value: FilterValue) => void;
}) {
  const selected = value || [];

  const handleToggle = (optionValue: string) => {
    const newValue = selected.includes(optionValue)
      ? selected.filter((v) => v !== optionValue)
      : [...selected, optionValue];
    onChange(newValue);
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{filter.label}</Label>
      {filter.description && (
        <Typography variant="body-xs" className="text-muted-foreground">
          {filter.description}
        </Typography>
      )}
      <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
        {filter.options?.map((option) => (
          <div key={String(option.value)} className="flex items-center space-x-2">
            <Checkbox
              id={`${filter.id}-${option.value}`}
              checked={selected.includes(String(option.value))}
              onCheckedChange={() => handleToggle(String(option.value))}
              disabled={option.disabled}
            />
            <label
              htmlFor={`${filter.id}-${option.value}`}
              className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              {option.label}
            </label>
          </div>
        ))}
      </div>
      {selected.length > 0 && (
        <Typography variant="body-xs" className="text-muted-foreground">
          {selected.length} selected
        </Typography>
      )}
    </div>
  );
}

function DateRangeFilter({
  filter,
  value,
  onChange,
}: {
  filter: FilterConfig;
  value: DateRange;
  onChange: (value: FilterValue) => void;
}) {
  const dateRange = value || {};

  const handleFromChange = (date: Date | undefined) => {
    onChange({ ...dateRange, from: date });
  };

  const handleToChange = (date: Date | undefined) => {
    onChange({ ...dateRange, to: date });
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{filter.label}</Label>
      {filter.description && (
        <Typography variant="body-xs" className="text-muted-foreground">
          {filter.description}
        </Typography>
      )}

      <div className="grid grid-cols-2 gap-2">
        {/* From Date */}
        <div className="space-y-1">
          <Label htmlFor={`${filter.id}-from`} className="text-xs text-muted-foreground">
            From
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id={`${filter.id}-from`}
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal h-9',
                  !dateRange.from && 'text-muted-foreground'
                )}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {dateRange.from ? format(dateRange.from, 'PPP') : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={dateRange.from}
                onSelect={handleFromChange}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* To Date */}
        <div className="space-y-1">
          <Label htmlFor={`${filter.id}-to`} className="text-xs text-muted-foreground">
            To
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id={`${filter.id}-to`}
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal h-9',
                  !dateRange.to && 'text-muted-foreground'
                )}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {dateRange.to ? format(dateRange.to, 'PPP') : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={dateRange.to}
                onSelect={handleToChange}
                initialFocus
                disabled={(date) => (dateRange.from ? date < dateRange.from : false)}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Clear button */}
      {(dateRange.from || dateRange.to) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange({})}
          className="h-7 text-xs"
        >
          <X className="mr-1 h-3 w-3" />
          Clear dates
        </Button>
      )}
    </div>
  );
}

function NumberRangeFilter({
  filter,
  value,
  onChange,
}: {
  filter: FilterConfig;
  value: NumberRange;
  onChange: (value: FilterValue) => void;
}) {
  const numberRange = value || {};

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const min = e.target.value ? parseFloat(e.target.value) : undefined;
    onChange({ ...numberRange, min });
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const max = e.target.value ? parseFloat(e.target.value) : undefined;
    onChange({ ...numberRange, max });
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{filter.label}</Label>
      {filter.description && (
        <Typography variant="body-xs" className="text-muted-foreground">
          {filter.description}
        </Typography>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor={`${filter.id}-min`} className="text-xs text-muted-foreground">
            Min
          </Label>
          <Input
            id={`${filter.id}-min`}
            type="number"
            value={numberRange.min ?? ''}
            onChange={handleMinChange}
            placeholder="Min"
            className="h-9"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor={`${filter.id}-max`} className="text-xs text-muted-foreground">
            Max
          </Label>
          <Input
            id={`${filter.id}-max`}
            type="number"
            value={numberRange.max ?? ''}
            onChange={handleMaxChange}
            placeholder="Max"
            className="h-9"
          />
        </div>
      </div>
    </div>
  );
}

function BooleanFilter({
  filter,
  value,
  onChange,
}: {
  filter: FilterConfig;
  value: boolean;
  onChange: (value: FilterValue) => void;
}) {
  const handleChange = (checked: boolean) => {
    onChange(checked);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <Checkbox
          id={filter.id}
          checked={value || false}
          onCheckedChange={handleChange}
        />
        <div className="flex flex-col space-y-0.5">
          <Label
            htmlFor={filter.id}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
          >
            {filter.label}
          </Label>
          {filter.description && (
            <Typography variant="body-xs" className="text-muted-foreground">
              {filter.description}
            </Typography>
          )}
        </div>
      </div>
    </div>
  );
}
