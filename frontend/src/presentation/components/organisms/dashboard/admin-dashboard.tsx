'use client';

import { useState, useCallback, useMemo, useEffect, useRef, Suspense } from 'react';
import dynamic from 'next/dynamic';
import type { LicenseRecord } from '@/types';
import type { DateRange } from '@/presentation/components/atoms/forms/date-range-picker';
import type { LicenseDateRange } from '@/application/use-cases';
import { useLicenseStore, selectLicenses, selectLicenseLoading, selectLicensePagination } from '@/infrastructure/stores/license';
import { useDataTableStore } from '@/infrastructure/stores/user';
import { logger } from '@/shared/helpers';

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
  const setFilters = useLicenseStore(state => state.setFilters);

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

  // Default range for the date picker when no filter is set (first day of month to last day)
  const defaultRangeFromData = useMemo<LicenseDateRange>(() => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    from.setHours(0, 0, 0, 0);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    to.setHours(23, 59, 59, 999);
    return { from, to };
  }, []);

  // Use store data or prop data
  const licenses = licensesProp ?? licensesFromStore;
  const isLoadingLicenses = isLoadingLicensesProp ?? isLoadingFromStore;
  const pageCount = paginationFromStore.totalPages;
  const totalCount = licensesProp?.length ?? paginationFromStore.total;

  const handleDateRangeChange = useCallback(
    (values: { range: DateRange; rangeCompare?: DateRange }) => {
      const nextRange = values.range;
      const hasRange = nextRange?.from || nextRange?.to;
      const startsAtFrom = nextRange?.from?.toISOString?.().split('T')[0];
      const startsAtTo = nextRange?.to?.toISOString?.().split('T')[0];

      setFilters({
        ...filters,
        startsAtFrom: hasRange ? startsAtFrom : undefined,
        startsAtTo: hasRange ? startsAtTo : undefined,
      });

      if (!hasRange) {
        setTableSearch(LICENSES_TABLE_ID, '');
        clearTableFilters(LICENSES_TABLE_ID);
      }

      // Refetch list so data table shows same date-filtered licenses as metrics
      fetchLicenses({
        page: 1,
        limit: 20,
        startsAtFrom: hasRange ? startsAtFrom : undefined,
        startsAtTo: hasRange ? startsAtTo : undefined,
      });
    },
    [filters, setFilters, fetchLicenses, setTableSearch, clearTableFilters],
  );

  // Handle pagination and filtering changes using Zustand store
  const handleQueryChange = useCallback(async (params: {
    page: number;
    limit: number;
    sortBy?: keyof LicenseRecord;
    sortOrder?: "asc" | "desc";
    status?: string | string[];
    plan?: string | string[];
    term?: string | string[];
    search?: string;
  }) => {
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

      await fetchLicenses({
        page: params.page,
        limit: params.limit,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
        status: statusParam as any,
        plan: planParam as any,
        term: termParam as any,
        search: params.search,
        startsAtFrom: filters.startsAtFrom,
        startsAtTo: filters.startsAtTo,
      });
    } catch (error) {
      logger.error('Failed to fetch licenses', { error });
    }
  }, [fetchLicenses, filters.startsAtFrom, filters.startsAtTo]);

  // Initial load: use current month as default date range when none is set so picker and data match
  const hasInitializedDateRef = useRef(false);
  useEffect(() => {
    if (licensesProp) return;

    const from = filters.startsAtFrom;
    const to = filters.startsAtTo;

    if (from && to) {
      hasInitializedDateRef.current = true;
      fetchLicenses({ page: 1, limit: 20, startsAtFrom: from, startsAtTo: to });
      return;
    }

    if (hasInitializedDateRef.current) {
      // User cleared the range; fetch with no date
      fetchLicenses({ page: 1, limit: 20 });
      return;
    }

    // First load with no date filter: set store and fetch to current month (same as picker default)
    hasInitializedDateRef.current = true;
    const now = new Date();
    const startsAtFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const startsAtTo = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    setFilters({ ...filters, startsAtFrom, startsAtTo });
    fetchLicenses({ page: 1, limit: 20, startsAtFrom, startsAtTo });
  }, [licensesProp, fetchLicenses, filters.startsAtFrom, filters.startsAtTo]);

  // Periodic refresh; pass current filters so date range filter is preserved
  useEffect(() => {
    if (licensesProp) return;

    const REFRESH_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
    const intervalId = setInterval(() => {
      fetchLicenses({
        page: paginationFromStore.page,
        limit: paginationFromStore.limit,
        startsAtFrom: filters.startsAtFrom,
        startsAtTo: filters.startsAtTo,
      });
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [licensesProp, fetchLicenses, paginationFromStore.page, paginationFromStore.limit, filters.startsAtFrom, filters.startsAtTo]);

  return (
    <div className={`space-y-6 ${className || ''}`}>
      <Suspense fallback={<LicenseMetricsSkeleton columns={4} />}>
        <LicenseMetricsSection
          licenses={licenses}
          dateRange={dateRange}
          initialDateFrom={defaultRangeFromData.from}
          initialDateTo={defaultRangeFromData.to}
          onDateRangeChange={handleDateRangeChange}
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
        />
      </Suspense>
    </div>
  );
}
