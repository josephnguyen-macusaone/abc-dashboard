'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import type { LicenseRecord } from '@/shared/types';
import type { DateRange } from '@/presentation/components/atoms/forms/date-range-picker';
import type { LicenseDateRange } from '@/application/services/license-dashboard-metrics';
import { LicenseMetricsSection } from '@/presentation/components/molecules/domain/dashboard/license-metrics-section';
import { LicenseTableSection } from '@/presentation/components/molecules/domain/dashboard/license-table-section';
import { useLicenseStore, selectLicenses, selectLicenseLoading, selectLicensePagination } from '@/infrastructure/stores/license';
import { logger } from '@/shared/utils';

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
    search?: string;
  }) => {
    try {
      await fetchLicenses({
        page: params.page,
        limit: params.limit,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
        status: params.status as any,
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
      <LicenseTableSection
        licenses={licenses}
        isLoading={isLoadingLicenses}
        pageCount={pageCount}
        totalRows={totalCount}
        onQueryChange={licensesProp ? undefined : handleQueryChange}
      />
    </div>
  );
}
