'use client';

import { useState, useEffect, useMemo } from 'react';
import { StatsCards } from '@/presentation/components/molecules/domain/user-management';
import { DateRangeFilterCard } from '@/presentation/components/molecules/domain/dashboard';
import { useToast } from '@/presentation/contexts/toast-context';
import type { DateRange } from '@/presentation/components/atoms/forms/date-range-picker';
import type { LicenseRecord } from '@/shared/types';
import {
  buildLicenseStatsCards,
  fetchDashboardMetrics,
  transformDashboardMetricsToCards,
  type LicenseDateRange
} from '@/application/services/license-dashboard-metrics';
import { logger } from '@/shared/utils';

interface LicenseMetricsSectionProps {
  licenses: LicenseRecord[];
  dateRange?: LicenseDateRange;
  initialDateFrom?: Date | string;
  initialDateTo?: Date | string;
  onDateRangeChange?: (values: { range: DateRange; rangeCompare?: DateRange }) => void;
  isLoading?: boolean;
  totalCount?: number;
  useApiMetrics?: boolean; // New prop to toggle between API and client-side calculation
}

export function LicenseMetricsSection({
  licenses,
  dateRange,
  initialDateFrom,
  initialDateTo,
  onDateRangeChange,
  isLoading = false,
  totalCount,
  useApiMetrics = true, // Default to using API metrics
}: LicenseMetricsSectionProps) {
  const { errorWithDescription } = useToast();
  const [apiMetrics, setApiMetrics] = useState<any>(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);

  // Fetch metrics from API when date range changes
  useEffect(() => {
    if (!useApiMetrics) return;

    const loadMetrics = async () => {
      try {
        setIsLoadingMetrics(true);
        const response = await fetchDashboardMetrics(dateRange);
        setApiMetrics(response.data);
      } catch (error) {
        logger.error('Failed to fetch dashboard metrics', { error });
        errorWithDescription(
          'Failed to load metrics',
          'Falling back to client-side calculation.',
          { duration: 5000 }
        );
        // Fallback to client-side calculation
        setApiMetrics(null);
      } finally {
        setIsLoadingMetrics(false);
      }
    };

    loadMetrics();
  }, [
    // Only depend on dateRange values, not the object reference
    dateRange?.from?.toISOString(),
    dateRange?.to?.toISOString(),
    useApiMetrics
  ]);

  // Calculate stats based on mode
  const stats = useMemo(() => {
    // Use API metrics if available
    if (useApiMetrics && apiMetrics) {
      return transformDashboardMetricsToCards(apiMetrics);
    }

    // Fallback to client-side calculation
    return buildLicenseStatsCards(licenses, dateRange, totalCount);
  }, [useApiMetrics, apiMetrics, licenses, dateRange, totalCount]);

  const effectiveLoading = isLoading || isLoadingMetrics;

  return (
    <div className="space-y-6">
      <DateRangeFilterCard
        initialDateFrom={initialDateFrom}
        initialDateTo={initialDateTo}
        onUpdate={onDateRangeChange}
        showCompare={false}
      />
      <StatsCards stats={stats} isLoading={effectiveLoading} columns={4} />
    </div>
  );
}
