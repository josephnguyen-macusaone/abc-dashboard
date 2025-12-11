'use client';

import { useMemo } from 'react';
import { Typography } from '@/presentation/components/atoms';
import { LicensesDataTable } from '@/presentation/components/molecules/domain/license-management';
import { cn } from '@/shared/utils';
import type { LicenseRecord } from '@/shared/types';
import type { DateRange } from '@/presentation/components/atoms/forms/date-range-picker';
import { filterLicensesByDateRange, type LicenseDateRange } from '@/application/services/license-dashboard-metrics';

export interface LicenseTableSectionProps {
  /**
   * Optional title for the section
   */
  title?: string;
  /**
   * Optional description
   */
  description?: string;
  /**
   * Maximum height for internal table scrolling (e.g., '400px', '60vh')
   */
  maxTableHeight?: string;
  /**
   * Additional class names
   */
  className?: string;
  /**
   * License data to render
   */
  licenses: LicenseRecord[];
  /**
   * Shared date range filter (optional)
   */
  dateRange?: LicenseDateRange;
  /**
   * Callback when date range changes
   */
  onDateRangeChange?: (values: { range: DateRange; rangeCompare?: DateRange }) => void;
  /**
   * Loading state
   */
  isLoading?: boolean;
}

export function LicenseTableSection({
  className,
  title = 'License Management',
  description = 'Manage license records and subscriptions',
  licenses,
  dateRange,
  isLoading = false,
}: LicenseTableSectionProps) {
  const filteredLicenses = useMemo(
    () => filterLicensesByDateRange(licenses, dateRange),
    [licenses, dateRange],
  );

  return (
    <div className={cn('bg-card border border-border rounded-xl shadow-sm space-y-3 px-6 pb-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between pt-4">
        <div className="">
          <Typography variant="title-l" className="text-foreground">
            {title}
          </Typography>
          <Typography variant="body-s" color="muted" className="text-muted-foreground mt-0.5">
            {description}
          </Typography>
        </div>
      </div>

      {/* Licenses Data Grid */}
      <LicensesDataTable
        data={filteredLicenses}
        isLoading={isLoading}
      />
    </div>
  );
}
