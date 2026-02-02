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
  // Use Zustand store for license data
  const licensesFromStore = useLicenseStore(selectLicenses);
  const isLoadingFromStore = useLicenseStore(selectLicenseLoading);
  const paginationFromStore = useLicenseStore(selectLicensePagination);
  const fetchLicenses = useLicenseStore(state => state.fetchLicenses);

  const setTableSearch = useDataTableStore(state => state.setTableSearch);
  const clearTableFilters = useDataTableStore(state => state.clearTableFilters);

  // Default range: follow dates we have in data (min/max startsAt), else current month
  const defaultRangeFromData = useMemo<LicenseDateRange>(() => {
    const licensesToUse = licensesProp ?? licensesFromStore;
    if (!licensesToUse?.length) {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      from.setHours(0, 0, 0, 0);
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      to.setHours(23, 59, 59, 999);
      return { from, to };
    }
    let minDate: Date | null = null;
    let maxDate: Date | null = null;
    for (const license of licensesToUse) {
      const raw = (license as { startsAt?: string }).startsAt;
      if (!raw) continue;
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) continue;
      if (minDate == null || d < minDate) minDate = d;
      if (maxDate == null || d > maxDate) maxDate = d;
    }
    if (minDate == null || maxDate == null) {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      from.setHours(0, 0, 0, 0);
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      to.setHours(23, 59, 59, 999);
      return { from, to };
    }
    const from = new Date(minDate);
    from.setHours(0, 0, 0, 0);
    const to = new Date(maxDate);
    to.setHours(23, 59, 59, 999);
    return { from, to };
  }, [licensesProp, licensesFromStore]);

  const [dateRange, setDateRange] = useState<LicenseDateRange>(() => ({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
  }));

  // Sync date range to data range when licenses first load (so range "follows" the dates we have)
  const hasSyncedRangeRef = useRef(false);
  useEffect(() => {
    const licensesToUse = licensesProp ?? licensesFromStore;
    if (licensesToUse.length > 0 && defaultRangeFromData.from && defaultRangeFromData.to) {
      if (!hasSyncedRangeRef.current) {
        hasSyncedRangeRef.current = true;
        setDateRange(defaultRangeFromData);
      }
    } else if (licensesToUse.length === 0) {
      hasSyncedRangeRef.current = false;
    }
  }, [licensesProp, licensesFromStore, defaultRangeFromData]);

  // Memoize the current dateRange to prevent unnecessary re-renders
  const memoizedDateRange = useMemo(() => dateRange, [
    dateRange?.from?.toISOString(),
    dateRange?.to?.toISOString(),
  ]);

  // Use store data or prop data
  const licenses = licensesProp ?? licensesFromStore;
  const isLoadingLicenses = isLoadingLicensesProp ?? isLoadingFromStore;
  const pageCount = paginationFromStore.totalPages;
  const totalCount = licensesProp?.length ?? paginationFromStore.total;

  const handleDateRangeChange = useCallback(
    (values: { range: DateRange; rangeCompare?: DateRange }) => {
      if (!values.range.from) {
        // Clear button: no date filter, revert list to default (first page, no filters)
        setDateRange({});
        setTableSearch(LICENSES_TABLE_ID, '');
        clearTableFilters(LICENSES_TABLE_ID);
        fetchLicenses({
          page: 1,
          limit: 20,
          search: '',
          status: undefined,
          plan: undefined,
          term: undefined,
        });
      } else {
        setDateRange(values.range);
      }
    },
    [fetchLicenses, setTableSearch, clearTableFilters],
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
      });
    } catch (error) {
      logger.error('Failed to fetch licenses', { error });
    }
  }, [fetchLicenses]);

  // Initial load using Zustand store
  useEffect(() => {
    // If consumer passed licenses explicitly, skip fetching
    if (licensesProp) return;

    fetchLicenses({
      page: 1,
      limit: 20, // Standard page size
    });
  }, [licensesProp, fetchLicenses]);

  // Periodic refresh so UI shows updates after background sync (every 2 min)
  useEffect(() => {
    if (licensesProp) return;

    const REFRESH_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
    const intervalId = setInterval(() => {
      fetchLicenses({
        page: paginationFromStore.page,
        limit: paginationFromStore.limit,
      });
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [licensesProp, fetchLicenses, paginationFromStore.page, paginationFromStore.limit]);

  return (
    <div className={`space-y-6 ${className || ''}`}>
      <Suspense fallback={<LicenseMetricsSkeleton columns={4} />}>
        <LicenseMetricsSection
          licenses={licenses}
          dateRange={memoizedDateRange}
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
