'use client';

import * as React from 'react';
import { Filter, X, Check } from 'lucide-react';
import { Button } from '@/presentation/components/atoms/primitives/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/presentation/components/atoms/primitives/popover';
import { Badge } from '@/presentation/components/atoms/primitives/badge';
import { Separator } from '@/presentation/components/atoms/primitives/separator';
import { Typography } from '@/presentation/components/atoms/display/typography';
import { cn } from '@/shared/utils';
import type { FilterConfig, FilterValue } from '@/shared/types/data-display';
import { FilterControl } from './filter-control';

// ============================================================================
// Types
// ============================================================================

export interface AdvancedFilterPanelProps {
  /** Filter configurations */
  filters: FilterConfig[];

  /** Current filter values */
  values: Record<string, FilterValue>;

  /** Callback when a filter value changes */
  onChange: (filterId: string, value: FilterValue) => void;

  /** Callback when all filters are reset */
  onReset: () => void;

  /** Callback when filters are applied (for lazy application) */
  onApply?: () => void;

  /** Optional class name */
  className?: string;

  /** Show apply/cancel buttons instead of instant application */
  lazyApplication?: boolean;

  /** Filter panel title */
  title?: string;

  /** Maximum height for the filter panel content */
  maxHeight?: number;
}

// ============================================================================
// Component
// ============================================================================

export function AdvancedFilterPanel({
  filters,
  values,
  onChange,
  onReset,
  onApply,
  className,
  lazyApplication = false,
  title = 'Advanced Filters',
  maxHeight = 500,
}: AdvancedFilterPanelProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [localValues, setLocalValues] = React.useState<Record<string, FilterValue>>(values);

  // Sync external values when panel is closed
  React.useEffect(() => {
    if (!isOpen) {
      setLocalValues(values);
    }
  }, [values, isOpen]);

  // Count active filters
  const activeFilterCount = React.useMemo(() => {
    return Object.entries(values).filter(([key, value]) => {
      if (value === null || value === undefined || value === '') return false;
      if (Array.isArray(value) && value.length === 0) return false;
      if (typeof value === 'object' && 'from' in value && 'to' in value) {
        return value.from !== undefined || value.to !== undefined;
      }
      return true;
    }).length;
  }, [values]);

  // Handle local value change (for lazy application)
  const handleLocalChange = React.useCallback(
    (filterId: string, value: FilterValue) => {
      if (lazyApplication) {
        setLocalValues((prev) => ({ ...prev, [filterId]: value }));
      } else {
        // Instant application
        onChange(filterId, value);
      }
    },
    [lazyApplication, onChange]
  );

  // Handle apply button (for lazy application)
  const handleApply = React.useCallback(() => {
    Object.entries(localValues).forEach(([filterId, value]) => {
      onChange(filterId, value);
    });
    onApply?.();
    setIsOpen(false);
  }, [localValues, onChange, onApply]);

  // Handle cancel (for lazy application)
  const handleCancel = React.useCallback(() => {
    setLocalValues(values);
    setIsOpen(false);
  }, [values]);

  // Handle reset
  const handleReset = React.useCallback(() => {
    if (lazyApplication) {
      setLocalValues({});
    }
    onReset();
  }, [lazyApplication, onReset]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn('relative', className)}>
          <Filter className="mr-2 h-4 w-4" />
          {title}
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-96 p-0"
        align="start"
        side="bottom"
        sideOffset={4}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 pb-3">
          <Typography variant="title-s" className="font-semibold">
            {title}
          </Typography>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={activeFilterCount === 0}
            className="h-7 px-2 text-xs"
          >
            <X className="mr-1 h-3 w-3" />
            Reset All
          </Button>
        </div>

        <Separator />

        {/* Filter Controls */}
        <div
          className="overflow-y-auto p-4 space-y-4"
          style={{ maxHeight: `${maxHeight}px` }}
        >
          {filters.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Filter className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <Typography variant="body-s">No filters available</Typography>
            </div>
          ) : (
            filters.map((filter) => (
              <FilterControl
                key={filter.id}
                filter={filter}
                value={lazyApplication ? localValues[filter.id] : values[filter.id]}
                onChange={(value) => handleLocalChange(filter.id, value)}
              />
            ))
          )}
        </div>

        {/* Footer (for lazy application) */}
        {lazyApplication && (
          <>
            <Separator />
            <div className="flex items-center justify-end gap-2 p-3">
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleApply}>
                <Check className="mr-2 h-4 w-4" />
                Apply Filters
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
