'use client';

import {
    DateRangePicker,
    type DateRange,
} from '@/presentation/components/atoms/forms/date-range-picker';

export interface DateRangeFilterCardProps {
    /** Initial value for start date */
    initialDateFrom?: Date | string;
    /** Initial value for end date */
    initialDateTo?: Date | string;
    /** Callback when date range is updated */
    onUpdate?: (values: { range: DateRange; rangeCompare?: DateRange }) => void;
    /** Alignment of popover */
    align?: 'start' | 'center' | 'end';
    /** Option for locale */
    locale?: string;
    /** Option for showing compare feature */
    showCompare?: boolean;
    /** Additional class name */
    className?: string;
}

export function DateRangeFilterCard({
    initialDateFrom,
    initialDateTo,
    onUpdate,
    align = 'start',
    locale = 'en-US',
    showCompare = false,
    className,
}: DateRangeFilterCardProps) {
    return (
        <DateRangePicker
            initialDateFrom={initialDateFrom}
            initialDateTo={initialDateTo}
            onUpdate={onUpdate}
            align={align}
            locale={locale}
            showCompare={showCompare}
            className={className}
        />
    );
}
