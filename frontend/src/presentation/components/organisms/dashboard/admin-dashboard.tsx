'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import type { LicenseRecord } from '@/shared/types';
import type { DateRange } from '@/presentation/components/atoms/forms/date-range-picker';
import type { LicenseDateRange } from '@/application/services/license-dashboard-metrics';
import { LicenseMetricsSection } from '@/presentation/components/molecules/domain/dashboard/license-metrics-section';
import { LicenseTableSection } from '@/presentation/components/molecules/domain/dashboard/license-table-section';
import { useLicenseStore, selectLicenses, selectLicenseLoading, selectLicensePagination } from '@/infrastructure/stores/license-store';
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
    const to = new Date();
    to.setHours(23, 59, 59, 999);
    const from = new Date();
    from.setDate(from.getDate() - 29);
    from.setHours(0, 0, 0, 0);
    return { from, to };
  }, []);

  const [dateRange, setDateRange] = useState<LicenseDateRange>(defaultRange);

  // Use store data or prop data
  const licenses = licensesProp ?? licensesFromStore;
  const isLoadingLicenses = isLoadingLicensesProp ?? isLoadingFromStore;
  const pageCount = paginationFromStore.totalPages;
  const totalCount = licensesProp?.length ?? paginationFromStore.total;

  const handleDateRangeChange = useCallback(
    (values: { range: DateRange; rangeCompare?: DateRange }) => {
      setDateRange(values.range);
    },
    [],
  );

  // Handle pagination and filtering changes using Zustand store
  const handleQueryChange = useCallback(async (params: {
    page: number;
    limit: number;
    sortBy?: keyof LicenseRecord;
    sortOrder?: "asc" | "desc";
    status?: string;
    dba?: string;
    search?: string;
  }) => {
    try {
      await fetchLicenses({
        page: params.page,
        limit: params.limit,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
        status: params.status as any,
        search: params.search || params.dba,
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
    <div className={`space-y-8 ${className || ''}`}>
      <LicenseMetricsSection
        licenses={licenses}
        dateRange={dateRange}
        initialDateFrom={defaultRange.from}
        initialDateTo={defaultRange.to}
        onDateRangeChange={handleDateRangeChange}
        isLoading={isLoadingLicenses}
        totalCount={totalCount}
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
