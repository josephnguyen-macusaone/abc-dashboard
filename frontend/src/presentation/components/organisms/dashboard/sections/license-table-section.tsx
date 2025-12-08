'use client';

import { useState, useMemo, useCallback } from 'react';
import { Typography } from '@/presentation/components/atoms';
import { LicensesDataTable } from '@/presentation/components/molecules/domain/license-management';
import { DateRangeFilterCard } from '@/presentation/components/molecules/domain/dashboard/date-range-filter-card';
import { fakerLicensesSmall } from '@/shared/mock/license-faker-data';
import { cn } from '@/shared/utils';

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
}

export function LicenseTableSection({
  className,
}: LicenseTableSectionProps) {
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  // Filter licenses by date range
  const filteredLicenses = useMemo(() => {
    if (!dateRange.from && !dateRange.to) {
      return fakerLicensesSmall;
    }

    return fakerLicensesSmall.filter(license => {
      if (!license.startDay) return false;

      const licenseDate = new Date(license.startDay);
      const fromDate = dateRange.from ? new Date(dateRange.from) : null;
      const toDate = dateRange.to ? new Date(dateRange.to) : null;

      // Set toDate to end of day for inclusive filtering
      if (toDate) {
        toDate.setHours(23, 59, 59, 999);
      }

      if (fromDate && licenseDate < fromDate) return false;
      if (toDate && licenseDate > toDate) return false;

      return true;
    });
  }, [dateRange]);

  // Handle date range changes
  const handleDateRangeChange = useCallback((values: { range: { from: Date; to: Date | undefined }; rangeCompare?: any }) => {
    // If the range has no "to" date, it means clear was pressed
    if (values.range.from && !values.range.to) {
      setDateRange({}); // Clear the date range
    } else {
      setDateRange({
        from: values.range.from,
        to: values.range.to,
      });
    }
  }, []);

  return (
    <div className={cn('bg-card border border-border rounded-xl shadow-sm space-y-3 px-6 pb-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between pt-4">
        <div className="">
          <Typography variant="title-l" className="text-foreground">
            License Management
          </Typography>
          <Typography variant="body-s" color="muted" className="text-muted-foreground mt-0.5">
            Manage license records and subscriptions
          </Typography>
        </div>
        {/* Date Range Filter */}
        <DateRangeFilterCard
          initialDateFrom={dateRange?.from}
          initialDateTo={dateRange?.to}
          onUpdate={handleDateRangeChange}
          align="end"
        />
      </div>

      {/* Licenses Data Grid */}
      <LicensesDataTable
        data={filteredLicenses}
      />
    </div>
  );
}

