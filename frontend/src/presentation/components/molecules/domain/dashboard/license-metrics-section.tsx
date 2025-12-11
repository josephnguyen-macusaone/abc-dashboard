'use client';

import { useMemo } from 'react';
import { StatsCards } from '@/presentation/components/molecules/domain/user-management';
import { DateRangeFilterCard } from '@/presentation/components/molecules/domain/dashboard';
import type { DateRange } from '@/presentation/components/atoms/forms/date-range-picker';
import type { LicenseRecord } from '@/shared/types';
import { buildLicenseStatsCards, type LicenseDateRange } from '@/application/services/license-dashboard-metrics';

interface LicenseMetricsSectionProps {
  licenses: LicenseRecord[];
  dateRange?: LicenseDateRange;
  initialDateFrom?: Date | string;
  initialDateTo?: Date | string;
  onDateRangeChange?: (values: { range: DateRange; rangeCompare?: DateRange }) => void;
  isLoading?: boolean;
  totalCount?: number;
}

export function LicenseMetricsSection({
  licenses,
  dateRange,
  initialDateFrom,
  initialDateTo,
  onDateRangeChange,
  isLoading = false,
  totalCount,
}: LicenseMetricsSectionProps) {
  const stats = useMemo(
    () => buildLicenseStatsCards(licenses, dateRange, totalCount),
    [licenses, dateRange, totalCount],
  );

  return (
    <div className="space-y-6">
      <DateRangeFilterCard
        initialDateFrom={initialDateFrom}
        initialDateTo={initialDateTo}
        onUpdate={onDateRangeChange}
        showCompare={false}
      />
      <StatsCards stats={stats} isLoading={isLoading} columns={4} />
    </div>
  );
}
