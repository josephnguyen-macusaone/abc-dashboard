'use client';

import { useState, useCallback, useMemo } from 'react';
import { fakerLicenses } from '@/shared/mock/license-faker-data';
import type { LicenseRecord } from '@/shared/types';
import type { DateRange } from '@/presentation/components/atoms/forms/date-range-picker';
import type { LicenseDateRange } from '@/application/services/license-dashboard-metrics';
import { LicenseMetricsSection } from '@/presentation/components/molecules/domain/dashboard/license-metrics-section';
import { LicenseTableSection } from '@/presentation/components/molecules/domain/dashboard/license-table-section';

interface AdminDashboardProps {
  className?: string;
  licenses?: LicenseRecord[];
  isLoadingLicenses?: boolean;
}

export function AdminDashboard({
  className,
  licenses = fakerLicenses,
  isLoadingLicenses = false,
}: AdminDashboardProps) {
  const defaultRange = useMemo<LicenseDateRange>(() => {
    const to = new Date();
    to.setHours(23, 59, 59, 999);
    const from = new Date();
    from.setDate(from.getDate() - 29);
    from.setHours(0, 0, 0, 0);
    return { from, to };
  }, []);

  const [dateRange, setDateRange] = useState<LicenseDateRange>(defaultRange);

  const handleDateRangeChange = useCallback(
    (values: { range: DateRange; rangeCompare?: DateRange }) => {
      setDateRange(values.range);
    },
    [],
  );

  return (
    <div className={`space-y-8 ${className || ''}`}>
      <LicenseMetricsSection
        licenses={licenses}
        dateRange={dateRange}
        initialDateFrom={defaultRange.from}
        initialDateTo={defaultRange.to}
        onDateRangeChange={handleDateRangeChange}
        isLoading={isLoadingLicenses}
      />
      <LicenseTableSection
        licenses={licenses}
        dateRange={dateRange}
        isLoading={isLoadingLicenses}
      />
    </div>
  );
}
