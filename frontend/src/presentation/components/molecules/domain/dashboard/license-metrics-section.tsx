'use client';

import { useState, useEffect, useMemo } from 'react';
import { StatsCards } from '@/presentation/components/molecules/domain/user-management';
import { LicenseMetricsSkeleton } from '@/presentation/components/organisms';
import { useToast } from '@/presentation/contexts/toast-context';
import { useLicenseStore, selectLicenseFilters, selectDashboardMetrics, selectDashboardMetricsLoading } from '@/infrastructure/stores/license';
import type { DateRange } from '@/presentation/components/atoms/forms/date-range-picker';
import type { LicenseRecord } from '@/types';
import type { StatsCardConfig } from '@/presentation/components/molecules/domain/user-management';
import {
  createGetLicenseStatsUseCase,
  transformDashboardMetricsToCards,
  type LicenseDateRange,
  type LicenseDashboardMetric,
} from '@/application/use-cases';
import type { LicenseMetricsFilters } from '@/application/use-cases/license/get-license-stats-usecase';
import { container } from '@/shared/di/container';
import { logger } from '@/shared/helpers';
import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  Building,
  DollarSign,
  Phone,
  TrendingUp,
  User,
  Users,
} from 'lucide-react';

/**
 * Presentation adapter: Transform business domain metrics to UI components
 */
function transformMetricsToStatsCards(metrics: LicenseDashboardMetric[]): StatsCardConfig[] {
  const iconMap: Record<string, LucideIcon> = {
    'total-active-licenses': Users,
    'new-licenses-month': TrendingUp,
    'licenses-income-month': DollarSign,
    'sms-income-month': Phone,
    'total-inhouse-licenses': Building,
    'total-agent-licenses': User,
    'high-risk-licenses': AlertTriangle,
    'estimate-next-month': TrendingUp,
  };

  return metrics.map(metric => ({
    id: metric.id,
    label: metric.label,
    value: metric.value,
    icon: iconMap[metric.id] || TrendingUp,
    ...(metric.trend && { trend: metric.trend }),
  }));
}

interface LicenseMetricsSectionProps {
  licenses: LicenseRecord[];
  dateRange?: LicenseDateRange;
  isLoading?: boolean;
  totalCount?: number;
  useApiMetrics?: boolean; // New prop to toggle between API and client-side calculation
}

export function LicenseMetricsSection({
  licenses,
  dateRange,
  isLoading = false,
  useApiMetrics = true, // Default to using API metrics
}: LicenseMetricsSectionProps) {
  const { errorWithDescription } = useToast();
  const [metrics, setMetrics] = useState<LicenseDashboardMetric[]>([]);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const filters = useLicenseStore(selectLicenseFilters);
  const storeMetrics = useLicenseStore(selectDashboardMetrics);
  const storeMetricsLoading = useLicenseStore(selectDashboardMetricsLoading);

  const filtersForApi: LicenseMetricsFilters | undefined = useMemo(() => {
    const hasFilter = filters && Object.keys(filters).length > 0;
    return hasFilter ? { ...filters } : undefined;
  }, [filters]);

  // Use store metrics when available (from parallel dashboard fetch) to avoid duplicate API call
  useEffect(() => {
    const filtersMatch =
      filtersForApi?.startsAtFrom === filters?.startsAtFrom &&
      filtersForApi?.startsAtTo === filters?.startsAtTo;

    if (useApiMetrics && storeMetrics && !storeMetricsLoading && filtersMatch) {
      try {
        const transformed = transformDashboardMetricsToCards(
          storeMetrics as import('@/infrastructure/api/licenses/types').DashboardMetrics
        );
        setMetrics(transformed);
      } catch {
        setMetrics([]);
      }
      setIsLoadingMetrics(false);
      return;
    }

    // When store is loading metrics (parallel fetch), show loading and skip our fetch to avoid duplicate
    if (useApiMetrics && storeMetricsLoading && filtersMatch) {
      setIsLoadingMetrics(true);
      return;
    }

    const loadMetrics = async () => {
      try {
        setIsLoadingMetrics(true);
        const useCase = createGetLicenseStatsUseCase(container.licenseRepository);
        const result = await useCase.execute({
          licenses: useApiMetrics ? undefined : licenses,
          dateRange,
          filters: filtersForApi,
          useApiMetrics,
        });
        setMetrics(result);
      } catch (error) {
        logger.error('Failed to fetch dashboard metrics', { error });
        if (useApiMetrics) {
          errorWithDescription(
            'Failed to load metrics',
            'Falling back to client-side calculation.',
            { duration: 5000 }
          );
          try {
            const useCase = createGetLicenseStatsUseCase(container.licenseRepository);
            const result = await useCase.execute({
              licenses,
              dateRange,
              filters: filtersForApi,
              useApiMetrics: false,
            });
            setMetrics(result);
          } catch (fallbackError) {
            logger.error('Client-side calculation also failed', { error: fallbackError });
            setMetrics([]);
          }
        } else {
          setMetrics([]);
        }
      } finally {
        setIsLoadingMetrics(false);
      }
    };

    loadMetrics();
  }, [
    dateRange,
    errorWithDescription,
    filtersForApi,
    filters?.startsAtFrom,
    filters?.startsAtTo,
    licenses,
    storeMetrics,
    storeMetricsLoading,
    useApiMetrics,
  ]);

  // Transform business metrics to UI components
  const stats = useMemo(() => {
    return transformMetricsToStatsCards(metrics);
  }, [metrics]);

  const effectiveLoading = isLoading || isLoadingMetrics;

  // Show skeleton when loading initially (before any data is loaded)
  if (effectiveLoading && licenses.length === 0) {
    return <LicenseMetricsSkeleton columns={4} />;
  }

  return (
    <div className="space-y-6">
      <StatsCards stats={stats} isLoading={effectiveLoading} columns={4} />
    </div>
  );
}
