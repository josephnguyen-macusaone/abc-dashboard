'use client';

import { useCallback, useMemo, useEffect, useLayoutEffect, useRef, Suspense } from 'react';
import dynamic from 'next/dynamic';
import type { LicenseRecord } from '@/types';
import type { LicenseMetricsAudience } from '@/application/use-cases';
import type { DateRange } from '@/presentation/components/atoms/forms/date-range-picker';
import type { LicenseDateRange } from '@/application/use-cases';
import { useLicenseStore, selectLicenses, selectLicenseLoading, selectLicensePagination } from '@/infrastructure/stores/license';
import { useDataTableStore } from '@/infrastructure/stores/user';
import { logger } from '@/shared/helpers';
import { parseLocalDateString, toLocalDateString } from '@/shared/helpers/date-utils';
import {
  getDefaultLicenseDateRange,
  getMonthToDateLicenseDateRange,
} from '@/presentation/hooks/use-initial-license-filters';

const LICENSES_TABLE_ID = 'licenses-data-table';
import { LicenseMetricsSkeleton, LicenseDataTableSkeleton } from '@/presentation/components/organisms';

function metricsSkeletonForAudience(audience: LicenseMetricsAudience) {
  if (audience === 'agent') return { columns: 5 as const, cardCount: 5 };
  if (audience === 'tech' || audience === 'accountant') return { columns: 3 as const, cardCount: 6 };
  return { columns: 4 as const, cardCount: 8 };
}

function licenseTableVariantFromAudience(
  audience: LicenseMetricsAudience,
): 'default' | 'agent' | 'tech' | 'accountant' {
  if (audience === 'agent') return 'agent';
  if (audience === 'tech') return 'tech';
  if (audience === 'accountant') return 'accountant';
  return 'default';
}

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
  tableTitle?: string;
  tableDescription?: string;
  /** `admin` default; `agent`, `tech`, and `accountant` use tailored metrics and table defaults. */
  metricsAudience?: LicenseMetricsAudience;
  /**
   * Initial license date filter on first dashboard mount.
   * - `fullMonth` — first day of month through last day (staff default).
   * - `monthToDate` — first day of month through today.
   * - `none` — no default date; show all records and let the user pick a range.
   */
  licenseDatePreset?: 'fullMonth' | 'monthToDate' | 'none';
  /**
   * When true, hide the date range picker from the license table toolbar.
   */
  hideDateRange?: boolean;
}

export function AdminDashboard({
  className,
  licenses: licensesProp,
  isLoadingLicenses: isLoadingLicensesProp,
  tableTitle,
  tableDescription,
  metricsAudience = 'admin',
  licenseDatePreset = 'fullMonth',
  hideDateRange = false,
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

  // Derive date range from store filters (parse as local date so display matches stored calendar date)
  const dateRange = useMemo<LicenseDateRange>(() => {
    const from = filters.startsAtFrom ? parseLocalDateString(filters.startsAtFrom) : undefined;
    const to = filters.startsAtTo ? parseLocalDateString(filters.startsAtTo) : undefined;
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
      const startsAtFrom = nextRange?.from ? toLocalDateString(nextRange.from) : undefined;
      const startsAtTo = nextRange?.to ? toLocalDateString(nextRange.to) : undefined;

      setFilters({
        ...filters,
        startsAtFrom: hasRange ? startsAtFrom : undefined,
        startsAtTo: hasRange ? startsAtTo : undefined,
      });

      // Do NOT clear search/filters when only clearing date range - preserve user's search (e.g. "milano")
      // so they don't have to re-type after broadening the date filter.

      const storeFilters = useLicenseStore.getState().filters;
      const statusParam = Array.isArray(storeFilters.status) ? storeFilters.status.join(',') : storeFilters.status;
      const planParam = Array.isArray(storeFilters.plan) ? storeFilters.plan.join(',') : storeFilters.plan;
      const termParam = Array.isArray(storeFilters.term) ? storeFilters.term.join(',') : storeFilters.term;
      const metricsParams = {
        search: storeFilters.search,
        searchField: storeFilters.searchField,
        startsAtFrom: hasRange ? startsAtFrom : undefined,
        startsAtTo: hasRange ? startsAtTo : undefined,
        status: statusParam,
        plan: planParam,
        term: termParam,
      };

      // Agents: date range only drives metric cards — the table always shows all assigned licenses.
      if (metricsAudience === 'agent') {
        void fetchDashboardMetrics(metricsParams);
        return;
      }

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
    [filters, metricsAudience, setFilters, fetchLicenses, fetchDashboardMetrics],
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

      // Agents: table is never filtered by date (date range only drives metric cards).
      const tableStartsAtFrom = metricsAudience === 'agent' ? undefined : storeFilters.startsAtFrom;
      const tableStartsAtTo   = metricsAudience === 'agent' ? undefined : storeFilters.startsAtTo;

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
          startsAtFrom: tableStartsAtFrom,
          startsAtTo: tableStartsAtTo,
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
  const hasFetchedAttentionRef = useRef(false);
  useLayoutEffect(() => {
    if (licensesProp) return;

    setLoading(true);

    const from = filters.startsAtFrom;
    const to = filters.startsAtTo;

    const runParallelFetch = (params: {
      startsAtFrom?: string;
      startsAtTo?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }) => {
      const { startsAtFrom, startsAtTo, sortBy, sortOrder } = params;
      const storeFilters = useLicenseStore.getState().filters;
      const statusParam = Array.isArray(storeFilters.status) ? storeFilters.status.join(',') : storeFilters.status;
      const planParam = Array.isArray(storeFilters.plan) ? storeFilters.plan.join(',') : storeFilters.plan;
      const termParam = Array.isArray(storeFilters.term) ? storeFilters.term.join(',') : storeFilters.term;
      const metricsParams = {
        search: storeFilters.search,
        searchField: storeFilters.searchField,
        startsAtFrom,
        startsAtTo,
        status: statusParam,
        plan: planParam,
        term: termParam,
      };
      void Promise.all([
        fetchLicenses({ page: 1, limit: 20, startsAtFrom, startsAtTo, sortBy, sortOrder }),
        fetchDashboardMetrics(metricsParams),
      ]);
    };

    // No default date: show all records. Table is never filtered by date on this preset.
    // The date picker only drives fetchDashboardMetrics (handled in handleDateRangeChange).
    if (licenseDatePreset === 'none') {
      if (!hasInitializedDateRef.current) {
        hasInitializedDateRef.current = true;
        const staleFilters = useLicenseStore.getState().filters;
        if (staleFilters.startsAtFrom || staleFilters.startsAtTo) {
          setFilters({ ...staleFilters, startsAtFrom: undefined, startsAtTo: undefined });
        }
        runParallelFetch({ sortBy: 'status', sortOrder: 'asc' });
      }
      return;
    }

    // Month-to-date: default first of month → today; then follow store dates when user changes picker.
    if (licenseDatePreset === 'monthToDate') {
      if (hasInitializedDateRef.current) {
        runParallelFetch({ startsAtFrom: from, startsAtTo: to });
        return;
      }
      hasInitializedDateRef.current = true;
      const { startsAtFrom, startsAtTo } = getMonthToDateLicenseDateRange();
      const currentFilters = useLicenseStore.getState().filters;
      setFilters({ ...currentFilters, startsAtFrom, startsAtTo });
      runParallelFetch({ startsAtFrom, startsAtTo });
      return;
    }

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

    // First mount only: no date set yet, set default to current month (first and last day).
    hasInitializedDateRef.current = true;
    const { startsAtFrom, startsAtTo } = getDefaultLicenseDateRange();
    const currentFilters = useLicenseStore.getState().filters;
    setFilters({ ...currentFilters, startsAtFrom, startsAtTo });
    runParallelFetch({ startsAtFrom, startsAtTo });
  }, [
    licensesProp,
    fetchLicenses,
    fetchDashboardMetrics,
    setFilters,
    setLoading,
    filters.startsAtFrom,
    filters.startsAtTo,
    licenseDatePreset,
  ]);

  // Defer "requiring attention" fetch until after first paint so primary dashboard data
  // (metrics + table) renders first and feels faster.
  useEffect(() => {
    if (licensesProp || hasFetchedAttentionRef.current) return;
    hasFetchedAttentionRef.current = true;
    const timerId = setTimeout(() => {
      void fetchLicensesRequiringAttention();
    }, 0);
    return () => clearTimeout(timerId);
  }, [licensesProp, fetchLicensesRequiringAttention]);

  // Periodic refresh; only when tab visible to avoid stuck loading when tab inactive
  useEffect(() => {
    if (licensesProp) return;

    const REFRESH_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
    // Agents: never filter the table by date on refresh.
    const refreshStartsAtFrom = metricsAudience === 'agent' ? undefined : filters.startsAtFrom;
    const refreshStartsAtTo   = metricsAudience === 'agent' ? undefined : filters.startsAtTo;

    const runWhenVisible = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchLicenses({
          page: paginationFromStore.page,
          limit: paginationFromStore.limit,
          startsAtFrom: refreshStartsAtFrom,
          startsAtTo: refreshStartsAtTo,
        });
      }
    };

    const intervalId = setInterval(runWhenVisible, REFRESH_INTERVAL_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchLicenses({
          page: paginationFromStore.page,
          limit: paginationFromStore.limit,
          startsAtFrom: refreshStartsAtFrom,
          startsAtTo: refreshStartsAtTo,
        });
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [licensesProp, metricsAudience, fetchLicenses, paginationFromStore.page, paginationFromStore.limit, filters.startsAtFrom, filters.startsAtTo]);

  // Clear search when leaving this page so it doesn't persist when switching pages
  useEffect(() => {
    return () => {
      setTableSearch(LICENSES_TABLE_ID, '');
      clearTableFilters(LICENSES_TABLE_ID);
      const currentFilters = useLicenseStore.getState().filters;
      setFilters({ ...currentFilters, search: undefined, searchField: undefined });
    };
  }, [setFilters, setTableSearch, clearTableFilters]);

  const metricsSkeleton = metricsSkeletonForAudience(metricsAudience);

  return (
    <div className={`space-y-6 ${className || ''}`}>
      <Suspense
        fallback={
          <LicenseMetricsSkeleton
            columns={metricsSkeleton.columns}
            cardCount={metricsSkeleton.cardCount}
          />
        }
      >
        <LicenseMetricsSection
          licenses={licenses}
          dateRange={dateRange}
          isLoading={isLoadingLicenses}
          totalCount={totalCount}
          useApiMetrics={true}
          audience={metricsAudience}
        />
      </Suspense>
      <Suspense fallback={<LicenseDataTableSkeleton />}>
        <LicenseTableSection
          title={tableTitle}
          description={tableDescription}
          licenses={licenses}
          isLoading={isLoadingLicenses}
          pageCount={pageCount}
          totalRows={totalCount}
          onQueryChange={licensesProp ? undefined : handleQueryChange}
          dateRange={hideDateRange ? undefined : dateRange}
          onDateRangeChange={hideDateRange ? undefined : (range => handleDateRangeChange(range ? { range } : null))}
          hideDateRange={hideDateRange}
          tableVariant={licenseTableVariantFromAudience(metricsAudience)}
        />
      </Suspense>
    </div>
  );
}
