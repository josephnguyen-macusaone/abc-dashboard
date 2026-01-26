'use client';

import { useState, useCallback, useMemo, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import type { LicenseRecord } from '@/types';
import type { DateRange } from '@/presentation/components/atoms/forms/date-range-picker';
import type { LicenseDateRange } from '@/application/use-cases';
import { useLicenseStore, selectLicenses, selectLicenseLoading, selectLicensePagination } from '@/infrastructure/stores/license';
import { logger } from '@/shared/helpers';
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

  const defaultRange = useMemo<LicenseDateRange>(() => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    from.setHours(0, 0, 0, 0);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    to.setHours(23, 59, 59, 999);
    return { from, to };
  }, []);

  const [dateRange, setDateRange] = useState<LicenseDateRange>(defaultRange);

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
      // If the range is cleared (from is undefined), reset to current month
      if (!values.range.from) {
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        currentMonthStart.setHours(0, 0, 0, 0);
        const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        currentMonthEnd.setHours(23, 59, 59, 999);

        setDateRange({ from: currentMonthStart, to: currentMonthEnd });
      } else {
        setDateRange(values.range);
      }
    },
    [],
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

  return (
    <div className={`space-y-6 ${className || ''}`}>
      <Suspense fallback={<LicenseMetricsSkeleton columns={4} />}>
        <LicenseMetricsSection
          licenses={licenses}
          dateRange={memoizedDateRange}
          initialDateFrom={defaultRange.from}
          initialDateTo={defaultRange.to}
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
