'use client';

import React, { type FC, useState, useEffect, useRef } from 'react';
import { ChevronUp, ChevronDown, Check, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/presentation/components/atoms/primitives/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/presentation/components/atoms/primitives/popover';
import { Calendar } from '@/presentation/components/atoms/primitives/calendar';
import { DateInput } from '@/presentation/components/atoms/forms/date-input';
import { Label } from '@/presentation/components/atoms/forms/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/presentation/components/atoms/forms/select';
import { Switch } from '@/presentation/components/atoms/forms/switch';
import { TooltipWrapper } from '@/presentation/components/molecules/ui/tooltip-wrapper';
import { cn } from '@/shared/helpers';

export interface DateRange {
  from: Date;
  to: Date | undefined;
}

export interface DateRangePickerProps {
  /** Click handler for applying the updates from DateRangePicker. */
  onUpdate?: (values: { range: DateRange; rangeCompare?: DateRange }) => void;
  /** Initial value for start date */
  initialDateFrom?: Date | string;
  /** Initial value for end date */
  initialDateTo?: Date | string;
  /** Initial value for start date for compare */
  initialCompareFrom?: Date | string;
  /** Initial value for end date for compare */
  initialCompareTo?: Date | string;
  /** Alignment of popover */
  align?: 'start' | 'center' | 'end';
  /** Option for locale */
  locale?: string;
  /** Option for showing compare feature */
  showCompare?: boolean;
  /** Additional class name */
  className?: string;
}

const formatDate = (date: Date, locale: string = 'en-us'): string => {
  return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}/${date.getFullYear()}`;
};

const getDateAdjustedForTimezone = (dateInput: Date | string): Date => {
  if (typeof dateInput === 'string') {
    // Split the date string to get year, month, and day parts
    const parts = dateInput.split('-').map((part) => parseInt(part, 10));
    // Create a new Date object using the local timezone
    // Note: Month is 0-indexed, so subtract 1 from the month part
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    return date;
  } else {
    // If dateInput is already a Date object, return it directly
    return dateInput;
  }
};

const resetToCurrentMonth = (): DateRange => {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1); // First day of current month
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999); // Current date, end of day
  return { from, to };
};

interface Preset {
  name: string;
  label: string;
}

// Define presets
const PRESETS: Preset[] = [
  { name: 'today', label: 'Today' },
  { name: 'yesterday', label: 'Yesterday' },
  { name: 'last7', label: 'Last 7 days' },
  { name: 'last14', label: 'Last 14 days' },
  { name: 'last30', label: 'Last 30 days' },
  { name: 'thisWeek', label: 'This Week' },
  { name: 'lastWeek', label: 'Last Week' },
  { name: 'thisMonth', label: 'This Month' },
  { name: 'lastMonth', label: 'Last Month' },
];

/** The DateRangePicker component allows a user to select a range of dates */
export const DateRangePicker: FC<DateRangePickerProps> = ({
  initialDateFrom,
  initialDateTo,
  initialCompareFrom,
  initialCompareTo,
  onUpdate,
  align = 'end',
  locale = 'en-US',
  showCompare = true,
  className,
}) => {
  // Use useMemo to ensure stable default date
  const defaultDateFrom = React.useMemo(() => {
    return initialDateFrom || new Date(new Date().setHours(0, 0, 0, 0));
  }, [initialDateFrom]);
  const [isOpen, setIsOpen] = useState(false);

  const [range, setRange] = useState<DateRange>({
    from: getDateAdjustedForTimezone(defaultDateFrom),
    to: initialDateTo
      ? getDateAdjustedForTimezone(initialDateTo)
      : getDateAdjustedForTimezone(defaultDateFrom),
  });
  const [rangeCompare, setRangeCompare] = useState<DateRange | undefined>(
    initialCompareFrom
      ? {
        from: new Date(new Date(initialCompareFrom).setHours(0, 0, 0, 0)),
        to: initialCompareTo
          ? new Date(new Date(initialCompareTo).setHours(0, 0, 0, 0))
          : new Date(new Date(initialCompareFrom).setHours(0, 0, 0, 0)),
      }
      : undefined
  );

  // Refs to store the values of range and rangeCompare when the date picker is opened
  const openedRangeRef = useRef<DateRange | undefined>(undefined);
  const openedRangeCompareRef = useRef<DateRange | undefined>(undefined);

  const [selectedPreset, setSelectedPreset] = useState<string | undefined>(
    undefined
  );

  const [isSmallScreen, setIsSmallScreen] = useState(false);

  useEffect(() => {
    const handleResize = (): void => {
      setIsSmallScreen(window.innerWidth < 960);
    };

    // Set initial value
    handleResize();

    window.addEventListener('resize', handleResize);

    // Clean up event listener on unmount
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const getPresetRange = (presetName: string): DateRange => {
    const preset = PRESETS.find(({ name }) => name === presetName);
    if (!preset) throw new Error(`Unknown date range preset: ${presetName}`);
    const from = new Date();
    const to = new Date();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const first = from.getDate() - from.getDay();

    switch (preset.name) {
      case 'today':
        from.setHours(0, 0, 0, 0);
        to.setHours(23, 59, 59, 999);
        break;
      case 'yesterday':
        from.setDate(from.getDate() - 1);
        from.setHours(0, 0, 0, 0);
        to.setDate(to.getDate() - 1);
        to.setHours(23, 59, 59, 999);
        break;
      case 'last7':
        from.setDate(from.getDate() - 6);
        from.setHours(0, 0, 0, 0);
        to.setHours(23, 59, 59, 999);
        break;
      case 'last14':
        from.setDate(from.getDate() - 13);
        from.setHours(0, 0, 0, 0);
        to.setHours(23, 59, 59, 999);
        break;
      case 'last30':
        from.setDate(from.getDate() - 29);
        from.setHours(0, 0, 0, 0);
        to.setHours(23, 59, 59, 999);
        break;
      case 'thisWeek':
        from.setDate(first);
        from.setHours(0, 0, 0, 0);
        to.setHours(23, 59, 59, 999);
        break;
      case 'lastWeek':
        from.setDate(from.getDate() - 7 - from.getDay());
        to.setDate(to.getDate() - to.getDay() - 1);
        from.setHours(0, 0, 0, 0);
        to.setHours(23, 59, 59, 999);
        break;
      case 'thisMonth':
        from.setDate(1);
        from.setHours(0, 0, 0, 0);
        to.setHours(23, 59, 59, 999);
        break;
      case 'lastMonth':
        from.setMonth(from.getMonth() - 1);
        from.setDate(1);
        from.setHours(0, 0, 0, 0);
        to.setDate(0);
        to.setHours(23, 59, 59, 999);
        break;
    }

    return { from, to };
  };

  const setPreset = (preset: string): void => {
    const range = getPresetRange(preset);
    setRange(range);
    if (rangeCompare) {
      const rangeCompare = {
        from: new Date(
          range.from.getFullYear() - 1,
          range.from.getMonth(),
          range.from.getDate()
        ),
        to: range.to
          ? new Date(
            range.to.getFullYear() - 1,
            range.to.getMonth(),
            range.to.getDate()
          )
          : undefined,
      };
      setRangeCompare(rangeCompare);
    }
  };

  const checkPreset = (): void => {
    for (const preset of PRESETS) {
      const presetRange = getPresetRange(preset.name);

      const normalizedRangeFrom = new Date(range.from);
      normalizedRangeFrom.setHours(0, 0, 0, 0);
      const normalizedPresetFrom = new Date(
        presetRange.from.setHours(0, 0, 0, 0)
      );

      const normalizedRangeTo = new Date(range.to ?? 0);
      normalizedRangeTo.setHours(0, 0, 0, 0);
      const normalizedPresetTo = new Date(
        presetRange.to?.setHours(0, 0, 0, 0) ?? 0
      );

      if (
        normalizedRangeFrom.getTime() === normalizedPresetFrom.getTime() &&
        normalizedRangeTo.getTime() === normalizedPresetTo.getTime()
      ) {
        setSelectedPreset(preset.name);
        return;
      }
    }

    setSelectedPreset(undefined);
  };

  const resetValues = (): void => {
    setRange({
      from:
        typeof defaultDateFrom === 'string'
          ? getDateAdjustedForTimezone(defaultDateFrom)
          : defaultDateFrom,
      to: initialDateTo
        ? typeof initialDateTo === 'string'
          ? getDateAdjustedForTimezone(initialDateTo)
          : initialDateTo
        : typeof defaultDateFrom === 'string'
          ? getDateAdjustedForTimezone(defaultDateFrom)
          : defaultDateFrom,
    });
    setRangeCompare(
      initialCompareFrom
        ? {
          from:
            typeof initialCompareFrom === 'string'
              ? getDateAdjustedForTimezone(initialCompareFrom)
              : initialCompareFrom,
          to: initialCompareTo
            ? typeof initialCompareTo === 'string'
              ? getDateAdjustedForTimezone(initialCompareTo)
              : initialCompareTo
            : typeof initialCompareFrom === 'string'
              ? getDateAdjustedForTimezone(initialCompareFrom)
              : initialCompareFrom,
        }
        : undefined
    );
  };

  useEffect(() => {
    checkPreset();
  }, [range]);

  const PresetButton = ({
    preset,
    label,
    isSelected,
  }: {
    preset: string;
    label: string;
    isSelected: boolean;
  }): React.ReactElement => (
    <Button
      className={cn('w-full justify-start', isSelected && 'pointer-events-none')}
      variant="ghost"
      size="sm"
      onClick={() => {
        setPreset(preset);
      }}
    >
      <span className={cn('pr-2 opacity-0', isSelected && 'opacity-70')}>
        <Check className="h-4 w-4" />
      </span>
      {label}
    </Button>
  );

  // Helper function to check if two date ranges are equal
  const areRangesEqual = (a?: DateRange, b?: DateRange): boolean => {
    if (!a || !b) return a === b; // If either is undefined, return true if both are undefined
    return (
      a.from.getTime() === b.from.getTime() &&
      (!a.to || !b.to || a.to.getTime() === b.to.getTime())
    );
  };

  useEffect(() => {
    if (isOpen) {
      openedRangeRef.current = range;
      openedRangeCompareRef.current = rangeCompare;
    }
  }, [isOpen]);

  return (
    <Popover
      modal={true}
      open={isOpen}
      onOpenChange={(open: boolean) => {
        if (!open) {
          resetValues();
        }
        setIsOpen(open);
      }}
    >
      <PopoverTrigger asChild>
        <div className="inline-flex">
          <TooltipWrapper
            content={
              <span className="text-xs">
                {`${formatDate(range.from, locale)}${range.to != null ? ' – ' + formatDate(range.to, locale) : ''}`}
                {rangeCompare != null && (
                  <>
                    <br />
                    <span className="text-muted-foreground">
                      Compare: {formatDate(rangeCompare.from, locale)}
                      {rangeCompare.to != null ? ` – ${formatDate(rangeCompare.to, locale)}` : ''}
                    </span>
                  </>
                )}
              </span>
            }
            side="bottom"
            sideOffset={6}
          >
            <Button
              size="default"
              variant="outline"
              className={cn(
                'justify-center sm:justify-start h-8 w-8 sm:h-9 sm:w-auto sm:min-w-[200px] p-0 sm:px-3 sm:py-2',
                className
              )}
            >
              <CalendarIcon className="h-3.5 w-3.5 sm:h-3 sm:w-3 shrink-0 opacity-60" />
              <div className="hidden sm:block text-left flex-1 min-w-0">
                <div className="py-0.5">
                  <div className="text-xs sm:text-body-xs">{`${formatDate(range.from, locale)}${range.to != null ? ' - ' + formatDate(range.to, locale) : ''
                    }`}</div>
                </div>
                {rangeCompare != null && (
                  <div className="opacity-60 text-body-xs text-xs -mt-0.5">
                    vs. {formatDate(rangeCompare.from, locale)}
                    {rangeCompare.to != null
                      ? ` - ${formatDate(rangeCompare.to, locale)}`
                      : ''}
                  </div>
                )}
              </div>
              <div className="hidden sm:flex ml-auto pl-2 opacity-60 -mr-2 shrink-0">
                {isOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </div>
            </Button>
          </TooltipWrapper>
        </div>
      </PopoverTrigger>
      <PopoverContent align={align} className="w-auto p-0 mt-2">
        <div className="flex py-4">
          <div className="flex">
            <div className="flex flex-col">
              <div className="flex flex-col lg:flex-row gap-2 px-3 justify-end items-center lg:items-start pb-4 lg:pb-0">
                {showCompare && (
                  <div className="flex items-center space-x-2 pr-4 py-1">
                    <Switch
                      defaultChecked={Boolean(rangeCompare)}
                      onCheckedChange={(checked: boolean) => {
                        if (checked) {
                          if (!range.to) {
                            setRange({
                              from: range.from,
                              to: range.from,
                            });
                          }
                          setRangeCompare({
                            from: new Date(
                              range.from.getFullYear(),
                              range.from.getMonth(),
                              range.from.getDate() - 365
                            ),
                            to: range.to
                              ? new Date(
                                range.to.getFullYear() - 1,
                                range.to.getMonth(),
                                range.to.getDate()
                              )
                              : new Date(
                                range.from.getFullYear() - 1,
                                range.from.getMonth(),
                                range.from.getDate()
                              ),
                          });
                        } else {
                          setRangeCompare(undefined);
                        }
                      }}
                      id="compare-mode"
                    />
                    <Label htmlFor="compare-mode">Compare</Label>
                  </div>
                )}
                <div className="flex flex-col">
                  <div className="flex gap-2 items-center">
                    <DateInput
                      value={range.from}
                      onChange={(date) => {
                        const toDate =
                          range.to == null || date > range.to
                            ? date
                            : range.to;
                        setRange((prevRange) => ({
                          ...prevRange,
                          from: date,
                          to: toDate,
                        }));
                      }}
                    />
                    <div className="py-1 text-body-s text-muted-foreground">-</div>
                    <DateInput
                      value={range.to}
                      onChange={(date) => {
                        const fromDate =
                          date < range.from ? date : range.from;
                        setRange((prevRange) => ({
                          ...prevRange,
                          from: fromDate,
                          to: date,
                        }));
                      }}
                    />
                  </div>
                  {rangeCompare != null && (
                    <div className="flex gap-2 items-center">
                      <DateInput
                        value={rangeCompare?.from}
                        onChange={(date) => {
                          if (rangeCompare) {
                            const compareToDate =
                              rangeCompare.to == null ||
                                date > rangeCompare.to
                                ? date
                                : rangeCompare.to;
                            setRangeCompare((prevRangeCompare) => ({
                              ...prevRangeCompare,
                              from: date,
                              to: compareToDate,
                            }));
                          } else {
                            setRangeCompare({
                              from: date,
                              to: new Date(),
                            });
                          }
                        }}
                      />
                      <div className="py-1 text-body-s text-muted-foreground">-</div>
                      <DateInput
                        value={rangeCompare?.to}
                        onChange={(date) => {
                          if (rangeCompare && rangeCompare.from) {
                            const compareFromDate =
                              date < rangeCompare.from
                                ? date
                                : rangeCompare.from;
                            setRangeCompare({
                              ...rangeCompare,
                              from: compareFromDate,
                              to: date,
                            });
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
              {isSmallScreen && (
                <Select
                  defaultValue={selectedPreset}
                  onValueChange={(value) => {
                    setPreset(value);
                  }}
                >
                  <SelectTrigger className="w-[180px] mx-auto mb-2">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PRESETS.map((preset) => (
                      <SelectItem key={preset.name} value={preset.name}>
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <div className={isSmallScreen ? "px-6" : "md:px-6"}>
                <Calendar
                  mode="range"
                  onSelect={(
                    value: { from?: Date; to?: Date } | undefined
                  ) => {
                    if (value?.from != null) {
                      setRange({ from: value.from, to: value?.to });
                    }
                  }}
                  selected={range}
                  numberOfMonths={isSmallScreen ? 1 : 2}
                  defaultMonth={
                    new Date(
                      new Date().setMonth(
                        new Date().getMonth() - (isSmallScreen ? 0 : 1)
                      )
                    )
                  }
                />
              </div>
            </div>
          </div>
          {!isSmallScreen && (
            <div className="flex flex-col items-end gap-1 pr-2 pl-6">
              <div className="flex w-full flex-col items-end gap-1 pr-2 pl-6">
                {PRESETS.map((preset) => (
                  <PresetButton
                    key={preset.name}
                    preset={preset.name}
                    label={preset.label}
                    isSelected={selectedPreset === preset.name}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-between gap-2 py-3 px-4 border-t">
          <Button
            onClick={() => {
              setIsOpen(false);
              setSelectedPreset('');
              setRange(resetToCurrentMonth()); // keep picker display valid when reopened
              setRangeCompare(undefined);
              // Notify parent of cleared range so list/metrics revert to default (typed as DateRange for callback)
              onUpdate?.({
                range: { from: undefined!, to: undefined } as unknown as DateRange,
                rangeCompare: undefined,
              });
            }}
            variant="outline"
            size="sm"
          >
            Clear
          </Button>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                setIsOpen(false);
                resetValues();
              }}
              variant="ghost"
              size="sm"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setIsOpen(false);
                if (
                  !areRangesEqual(range, openedRangeRef.current) ||
                  !areRangesEqual(rangeCompare, openedRangeCompareRef.current)
                ) {
                  onUpdate?.({ range, rangeCompare });
                }
              }}
              size="sm"
            >
              Update
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

DateRangePicker.displayName = 'DateRangePicker';
