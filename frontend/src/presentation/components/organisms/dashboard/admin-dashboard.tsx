'use client';

import { useCallback, useMemo, useEffect, useLayoutEffect, useRef, Suspense } from 'react';
import dynamic from 'next/dynamic';
import type { LicenseRecord } from '@/types';
import type { DateRange } from '@/presentation/components/atoms/forms/date-range-picker';
import type { LicenseDateRange } from '@/application/use-cases';
import { useLicenseStore, selectLicenses, selectLicenseLoading, selectLicensePagination } from '@/infrastructure/stores/license';
import { useDataTableStore } from '@/infrastructure/stores/user';
import { logger } from '@/shared/helpers';
import { getDefaultLicenseDateRange } from '@/presentation/hooks/use-initial-license-filters';

const LICENSES_TABLE_ID = 'licenses-data-table';
import { LicenseMetricsSkeleton, LicenseDataTableSkeleton } from '@/presentation/components/organisms';

// Dynamically import heavy dashboard components for better code splitting
const LicenseMetricsSection = dynamic(
  () => import('@/presentation/components/molecules/domain/dashboard/license-metrics-section').then(mod => ({ default: mod.LicenseMetricsSection })),
  {
    loading: () => <LicenseMetricsSkeleton columns={4} />,
    ssr: true, // Enable SSR for metrics but lazy load client-side
  }
);

const LicenseTableSection = dynamic(
  () => import('@/presentation/components/molecules/domain/dashboard/license-table-section').then(mod => ({ default: mod.LicenseTableSection })),
  {
    loading: () => <LicenseDataTableSkeleton />,
    ssr: false, // Disable SSR for heavy data table
  }
);

interface AdminDashboardProps {
  className?: string;
  licenses?: LicenseRecord[];
  isLoadingLicenses?: boolean;
}

export function AdminDashboard({
  className,
  licenses: licensesProp,
  isLoadingLicenses: isLoadingLicensesProp,
}: AdminDashboardProps) {
  // Use Zustand store for license data (single source of truth for list + metrics date filter)
  const licensesFromStore = useLicenseStore(selectLicenses);
  const isLoadingFromStore = useLicenseStore(selectLicenseLoading);
  const paginationFromStore = useLicenseStore(selectLicensePagination);
  const filters = useLicenseStore(state => state.filters);
  const fetchLicenses = useLicenseStore(state => state.fetchLicenses);
  const fetchDashboardMetrics = useLicenseStore(state => state.fetchDashboardMetrics);
  const fetchLicensesRequiringAttention = useLicenseStore(state => state.fetchLicensesRequiringAttention);
  const setFilters = useLicenseStore(state => state.setFilters);
  const setLoading = useLicenseStore(state => state.setLoading);

  const setTableSearch = useDataTableStore(state => state.setTableSearch);
  const clearTableFilters = useDataTableStore(state => state.clearTableFilters);

  // Derive date range from store filters so metrics and data table use the same filter
  const dateRange = useMemo<LicenseDateRange>(() => {
    const from = filters.startsAtFrom ? new Date(filters.startsAtFrom) : undefined;
    const to = filters.startsAtTo ? new Date(filters.startsAtTo) : undefined;
    if (!from && !to) return {};
    return {
      from: from && !Number.isNaN(from.getTime()) ? from : undefined,
      to: to && !Number.isNaN(to.getTime()) ? to : undefined,
    };
  }, [filters.startsAtFrom, filters.startsAtTo]);

  // Use store data or prop data
  const licenses = licensesProp ?? licensesFromStore;
  const isLoadingLicenses = isLoadingLicensesProp ?? isLoadingFromStore;
  const pageCount = paginationFromStore.totalPages;
  const totalCount = licensesProp?.length ?? paginationFromStore.total;

  const handleDateRangeChange = useCallback(
    (values: { range?: { from?: Date; to?: Date }; rangeCompare?: DateRange } | null) => {
      const nextRange = values?.range;
      const hasRange = nextRange?.from || nextRange?.to;
      const startsAtFrom = nextRange?.from?.toISOString?.().split('T')[0];
      const startsAtTo = nextRange?.to?.toISOString?.().split('T')[0];

      setFilters({
        ...filters,
        startsAtFrom: hasRange ? startsAtFrom : undefined,
        startsAtTo: hasRange ? startsAtTo : undefined,
      });

      // Do NOT clear search/filters when only clearing date range - preserve user's search (e.g. "milano")
      // so they don't have to re-type after broadening the date filter.

      // Refetch list and metrics so both stay in sync with date filter
      const storeFilters = useLicenseStore.getState().filters;
      const metricsParams = {
        search: storeFilters.search,
        searchField: storeFilters.searchField,
        startsAtFrom: hasRange ? startsAtFrom : undefined,
        startsAtTo: hasRange ? startsAtTo : undefined,
        status: storeFilters.status,
        plan: storeFilters.plan,
        term: storeFilters.term,
      };
      void Promise.all([
        fetchLicenses({
          page: 1,
          limit: 20,
          startsAtFrom: hasRange ? startsAtFrom : undefined,
          startsAtTo: hasRange ? startsAtTo : undefined,
        }),
        fetchDashboardMetrics(metricsParams),
      ]);
    },
    [filters, setFilters, fetchLicenses, fetchDashboardMetrics],
  );

  // Handle pagination and filtering changes using Zustand store (read date range from store at call time to avoid stale closure)
  const handleQueryChange = useCallback(async (params: {
    page: number;
    limit: number;
    sortBy?: keyof LicenseRecord;
    sortOrder?: "asc" | "desc";
    search?: string;
    searchField?: 'dba' | 'agentsName' | 'zip';
    status?: string | string[];
    plan?: string | string[];
    term?: string | string[];
  }) => {
    const storeFilters = useLicenseStore.getState().filters;
    try {
      // Convert array filters to comma-separated strings for API
      const statusParam = Array.isArray(params.status)
        ? params.status.join(',')
        : params.status;
      const planParam = Array.isArray(params.plan)
        ? params.plan.join(',')
        : params.plan;
      const termParam = Array.isArray(params.term)
        ? params.term.join(',')
        : params.term;

      // Always use date range from store; only cleared when user clicks X on date filter
      const metricsParams = {
        search: params.search,
        searchField: params.searchField,
        startsAtFrom: storeFilters.startsAtFrom,
        startsAtTo: storeFilters.startsAtTo,
        status: statusParam,
        plan: planParam,
        term: termParam,
      };

      await Promise.all([
        fetchLicenses({
          page: params.page,
          limit: params.limit,
          sortBy: params.sortBy,
          sortOrder: params.sortOrder,
          search: params.search,
          searchField: params.searchField,
          status: statusParam as import('@/types').LicenseStatus | import('@/types').LicenseStatus[],
          plan: planParam,
          term: termParam as import('@/types').LicenseTerm | import('@/types').LicenseTerm[],
          startsAtFrom: storeFilters.startsAtFrom,
          startsAtTo: storeFilters.startsAtTo,
        }),
        fetchDashboardMetrics(metricsParams),
      ]);
    } catch (error) {
      logger.error('Failed to fetch licenses', { error });
    }
  }, [fetchLicenses, fetchDashboardMetrics]);

  // Initial load: set loading before paint so skeleton shows immediately, then fetch.
  // Once initialized, never overwrite user's choice (e.g. if they clear date range, don't set current month again).
  const hasInitializedDateRef = useRef(false);
  useLayoutEffect(() => {
    if (licensesProp) return;

    setLoading(true);

    const from = filters.startsAtFrom;
    const to = filters.startsAtTo;

    const runParallelFetch = (params: { startsAtFrom?: string; startsAtTo?: string }) => {
      void Promise.all([
        fetchLicenses({ page: 1, limit: 20, ...params }),
        fetchDashboardMetrics(params),
        fetchLicensesRequiringAttention(),
      ]);
    };

    if (hasInitializedDateRef.current) {
      // Already initialized; just refetch with current filters (user may have cleared date)
      runParallelFetch({ startsAtFrom: from, startsAtTo: to });
      return;
    }

    if (from && to) {
      hasInitializedDateRef.current = true;
      runParallelFetch({ startsAtFrom: from, startsAtTo: to });
      return;
    }

    // First mount only: no date set yet, set default to current month (first and last day)
    hasInitializedDateRef.current = true;
    const { startsAtFrom, startsAtTo } = getDefaultLicenseDateRange();
    const currentFilters = useLicenseStore.getState().filters;
    setFilters({ ...currentFilters, startsAtFrom, startsAtTo });
    runParallelFetch({ startsAtFrom, startsAtTo });
  }, [licensesProp, fetchLicenses, fetchDashboardMetrics, fetchLicensesRequiringAttention, setFilters, setLoading, filters.startsAtFrom, filters.startsAtTo]);

  // Periodic refresh; only when tab visible to avoid stuck loading when tab inactive
  useEffect(() => {
    if (licensesProp) return;

    const REFRESH_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
    const runWhenVisible = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchLicenses({
          page: paginationFromStore.page,
          limit: paginationFromStore.limit,
          startsAtFrom: filters.startsAtFrom,
          startsAtTo: filters.startsAtTo,
        });
      }
    };

    const intervalId = setInterval(runWhenVisible, REFRESH_INTERVAL_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchLicenses({
          page: paginationFromStore.page,
          limit: paginationFromStore.limit,
          startsAtFrom: filters.startsAtFrom,
          startsAtTo: filters.startsAtTo,
        });
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [licensesProp, fetchLicenses, paginationFromStore.page, paginationFromStore.limit, filters.startsAtFrom, filters.startsAtTo]);

  // Clear search when leaving this page so it doesn't persist when switching pages
  useEffect(() => {
    return () => {
      setTableSearch(LICENSES_TABLE_ID, '');
      clearTableFilters(LICENSES_TABLE_ID);
      const currentFilters = useLicenseStore.getState().filters;
      setFilters({ ...currentFilters, search: undefined, searchField: undefined });
    };
  }, [setFilters, setTableSearch, clearTableFilters]);

  return (
    <div className={`space-y-6 ${className || ''}`}>
      <Suspense fallback={<LicenseMetricsSkeleton columns={4} />}>
        <LicenseMetricsSection
          licenses={licenses}
          dateRange={dateRange}
          isLoading={isLoadingLicenses}
          totalCount={totalCount}
          useApiMetrics={true}
        />
      </Suspense>
      <Suspense fallback={<LicenseDataTableSkeleton />}>
        <LicenseTableSection
          licenses={licenses}
          isLoading={isLoadingLicenses}
          pageCount={pageCount}
          totalRows={totalCount}
          onQueryChange={licensesProp ? undefined : handleQueryChange}
          dateRange={dateRange}
          onDateRangeChange={range => handleDateRangeChange(range ? { range } : null)}
        />
      </Suspense>
    </div>
  );
}
