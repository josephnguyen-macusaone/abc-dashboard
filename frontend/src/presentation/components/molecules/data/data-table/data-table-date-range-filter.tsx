'use client';

import { Calendar, XCircle } from 'lucide-react';
import * as React from 'react';

import { Badge } from '@/presentation/components/atoms/primitives/badge';
import { Button } from '@/presentation/components/atoms/primitives/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/presentation/components/atoms/primitives/popover';
import { DateRangePicker, type DateRange } from '@/presentation/components/atoms/forms/date-range-picker';
import { cn } from '@/shared/helpers';

export interface DataTableDateRangeFilterProps {
  /** Current date range; null = filter inactive */
  value?: { from?: Date; to?: Date } | null;
  /** Callback when date range changes; pass null to clear */
  onDateRangeChange?: (range: { from?: Date; to?: Date } | null) => void;
  /** Title for the filter button */
  title?: string;
  /** Alignment of popover */
  align?: 'start' | 'center' | 'end';
  /** Additional class name */
  className?: string;
}

const formatDateShort = (d: Date): string =>
  `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}/${d.getFullYear()}`;

export function DataTableDateRangeFilter({
  value,
  onDateRangeChange,
  title = 'Date Range',
  align = 'start',
  className,
}: DataTableDateRangeFilterProps) {
  const [open, setOpen] = React.useState(false);

  const hasRange = value?.from || value?.to;

  const handleUpdate = React.useCallback(
    (values: { range: DateRange; rangeCompare?: DateRange }) => {
      const { range } = values;
      const hasRangeValues = range?.from || range?.to;
      if (hasRangeValues && range) {
        onDateRangeChange?.({ from: range.from, to: range.to });
      } else {
        onDateRangeChange?.(null);
      }
    },
    [onDateRangeChange],
  );

  const handleClear = React.useCallback(
    (e?: React.MouseEvent) => {
      e?.preventDefault();
      e?.stopPropagation();
      onDateRangeChange?.(null);
    },
    [onDateRangeChange],
  );

  const labelText = React.useMemo(() => {
    if (!hasRange || (!value?.from && !value?.to)) return null;
    const from = value.from;
    const to = value.to;
    if (from && to) {
      return `${formatDateShort(from)} - ${formatDateShort(to)}`;
    }
    if (from) return `From ${formatDateShort(from)}`;
    if (to) return `To ${formatDateShort(to)}`;
    return null;
  }, [hasRange, value?.from, value?.to]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-8 border-dashed font-normal',
            hasRange
              ? 'w-auto min-w-0 max-w-[200px] justify-start gap-1.5 px-2 sm:w-auto sm:min-w-0 sm:shrink-0 sm:max-w-none sm:px-3'
              : 'w-8 shrink-0 justify-center p-0 sm:w-auto sm:min-w-0 sm:shrink-0 sm:px-3 sm:py-0',
            className,
          )}
          aria-label={title}
        >
          {hasRange ? (
            <div
              role="button"
              aria-label={`Clear ${title} filter`}
              tabIndex={0}
              className="shrink-0 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              onClick={handleClear}
            >
              <XCircle className="size-4" />
            </div>
          ) : (
            <Calendar className="size-4 shrink-0" />
          )}
          <span className="hidden sm:inline">{title}</span>
          {hasRange && labelText && (
            <Badge
              variant="secondary"
              size="sm"
              className="min-w-0 flex-1 rounded-sm font-normal truncate sm:flex-initial sm:max-w-none"
            >
              {labelText}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align={align}>
        <DateRangePicker
          initialDateFrom={value?.from}
          initialDateTo={value?.to}
          onUpdate={handleUpdate}
          onClose={() => setOpen(false)}
          align={align}
          locale="en-US"
          showCompare={false}
          contentOnly
        />
      </PopoverContent>
    </Popover>
  );
}
