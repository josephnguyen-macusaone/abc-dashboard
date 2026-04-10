'use client';

import { useState, useEffect, useMemo } from 'react';
import { StatsCards } from '@/presentation/components/molecules/domain/user-management';
import { LicenseMetricsSkeleton } from '@/presentation/components/organisms';
import { useToast } from '@/presentation/contexts/toast-context';
import { useLicenseStore, selectLicenseFilters, selectDashboardMetrics, selectDashboardMetricsLoading } from '@/infrastructure/stores/license';
import type { LicenseRecord } from '@/types';
import type { StatsCardConfig } from '@/presentation/components/molecules/domain/user-management';
import {
  buildAgentPortfolioMetricsFromLicenses,
  createGetLicenseStatsUseCase,
  sliceStaffDashboardMetricsForAudience,
  transformDashboardMetricsToCards,
  type LicenseDateRange,
  type LicenseDashboardMetric,
  type LicenseMetricsAudience,
} from '@/application/use-cases';
import type { DashboardMetrics } from '@/infrastructure/api/licenses/types';
import type { LicenseMetricsFilters } from '@/application/use-cases/license/get-license-stats-usecase';
import { container } from '@/shared/di/container';
import { logger } from '@/shared/helpers';
import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  Building,
  DollarSign,
  Layers,
  Package,
  Phone,
  Send,
  TrendingUp,
  User,
  Users,
  Wallet,
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
    'agent-sms-purchased': Package,
    'agent-sms-sent': Send,
    'agent-sms-balance': Wallet,
    'agent-agents-cost': DollarSign,
    'agent-plan-mix': Layers,
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
  /** Agent dashboard: scoped copy, fewer cards, tighter grid. */
  audience?: LicenseMetricsAudience;
}

export function LicenseMetricsSection({
  licenses,
  dateRange,
  isLoading = false,
  useApiMetrics = true, // Default to using API metrics
  audience = 'admin',
}: LicenseMetricsSectionProps) {
  const isAgent = audience === 'agent';
  const isStaffSlice = audience === 'tech' || audience === 'accountant';
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
  // Must match all filter fields that affect metrics (date, search, status, plan, term)
  useEffect(() => {
    // Agents read agentSmsStats from storeMetrics — still need storeMetricsLoading to resolve
    // so we track the loading state but skip the standalone metrics API fetch.
    if (isAgent) {
      setIsLoadingMetrics(storeMetricsLoading);
      return;
    }

    const filtersMatch =
      filtersForApi?.startsAtFrom === filters?.startsAtFrom &&
      filtersForApi?.startsAtTo === filters?.startsAtTo &&
      filtersForApi?.search === filters?.search &&
      filtersForApi?.searchField === filters?.searchField &&
      JSON.stringify(filtersForApi?.status ?? null) === JSON.stringify(filters?.status ?? null) &&
      JSON.stringify(filtersForApi?.plan ?? null) === JSON.stringify(filters?.plan ?? null) &&
      JSON.stringify(filtersForApi?.term ?? null) === JSON.stringify(filters?.term ?? null);

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
    filters,
    filtersForApi,
    isAgent,
    licenses,
    storeMetrics,
    storeMetricsLoading,
    useApiMetrics,
  ]);

  // Transform business metrics to UI components
  const stats = useMemo(() => {
    if (isAgent) {
      // Build base metrics from client-side license list (provides Plan Mix)
      const baseMetrics = buildAgentPortfolioMetricsFromLicenses(licenses);
      // Override the 4 SMS/cost cards with date-scoped API aggregate when available
      const apiStats = (storeMetrics as DashboardMetrics | null)?.agentSmsStats;
      if (apiStats) {
        const numberFormatter = new Intl.NumberFormat('en-US');
        const currencyFormatter = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        });
        const overrideIds = new Set([
          'agent-sms-purchased',
          'agent-sms-sent',
          'agent-sms-balance',
          'agent-agents-cost',
        ]);
        const apiOverrides: LicenseDashboardMetric[] = [
          { id: 'agent-sms-purchased', label: 'SMS Purchased', value: numberFormatter.format(apiStats.smsPurchased) },
          { id: 'agent-sms-sent',      label: 'SMS Sent',      value: numberFormatter.format(apiStats.smsSent) },
          { id: 'agent-sms-balance',   label: 'SMS Balance',   value: numberFormatter.format(apiStats.smsBalance) },
          { id: 'agent-agents-cost',   label: 'Agent Cost',   value: currencyFormatter.format(apiStats.agentsCost) },
        ];
        const planMix = baseMetrics.filter(m => !overrideIds.has(m.id));
        return transformMetricsToStatsCards([...apiOverrides, ...planMix]);
      }
      return transformMetricsToStatsCards(baseMetrics);
    }
    if (isStaffSlice) {
      const sliced = sliceStaffDashboardMetricsForAudience(metrics, audience);
      return transformMetricsToStatsCards(sliced);
    }
    return transformMetricsToStatsCards(metrics);
  }, [audience, isAgent, isStaffSlice, licenses, metrics, storeMetrics]);

  const effectiveLoading = isLoading || isLoadingMetrics;
  const gridColumns = isAgent ? 5 : isStaffSlice ? 3 : 4;
  const skeletonCardCount = isAgent ? 5 : isStaffSlice ? 6 : 8;

  // Show skeleton when loading initially (before any data is loaded)
  if (effectiveLoading && licenses.length === 0) {
    return (
      <LicenseMetricsSkeleton columns={gridColumns} cardCount={skeletonCardCount} />
    );
  }

  return (
    <div className="space-y-6">
      <StatsCards stats={stats} isLoading={effectiveLoading} columns={gridColumns} />
    </div>
  );
}
