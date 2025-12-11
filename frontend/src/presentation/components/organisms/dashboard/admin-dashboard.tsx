'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { fakerLicenses } from '@/shared/mock/license-faker-data';
import type { LicenseRecord } from '@/shared/types';
import type { DateRange } from '@/presentation/components/atoms/forms/date-range-picker';
import type { LicenseDateRange } from '@/application/services/license-dashboard-metrics';
import { LicenseMetricsSection } from '@/presentation/components/molecules/domain/dashboard/license-metrics-section';
import { LicenseTableSection } from '@/presentation/components/molecules/domain/dashboard/license-table-section';
import { licenseService } from '@/application/services/license-management-service';

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
  const defaultRange = useMemo<LicenseDateRange>(() => {
    const to = new Date();
    to.setHours(23, 59, 59, 999);
    const from = new Date();
    from.setDate(from.getDate() - 29);
    from.setHours(0, 0, 0, 0);
    return { from, to };
  }, []);

  const [dateRange, setDateRange] = useState<LicenseDateRange>(defaultRange);
  const [licenses, setLicenses] = useState<LicenseRecord[]>(licensesProp ?? []);
  const [isLoadingLicenses, setIsLoadingLicenses] = useState<boolean>(isLoadingLicensesProp ?? false);
  const [pageCount, setPageCount] = useState<number>(-1);
  const [totalCount, setTotalCount] = useState<number>(licensesProp?.length ?? fakerLicenses.length);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDateRangeChange = useCallback(
    (values: { range: DateRange; rangeCompare?: DateRange }) => {
      setDateRange(values.range);
    },
    [],
  );

  // Initial load (client-side table/grid)
  useEffect(() => {
    // If consumer passed licenses explicitly, skip fetching
    if (licensesProp) return;

    let isActive = true;
    const load = async () => {
      setIsLoadingLicenses(true);
      setErrorMessage(null);
      try {
        const response = await licenseService.list({ page: 1, limit: 100 });
        if (!isActive) return;
        if (response?.data) {
          setLicenses(response.data);
          const totalPages = response.meta?.pagination?.totalPages ?? -1;
          const total = response.meta?.pagination?.total ?? response.data.length;
          setPageCount(totalPages);
          setTotalCount(total);
        } else {
          setLicenses(fakerLicenses);
          setPageCount(-1);
          setTotalCount(fakerLicenses.length);
          setErrorMessage('Using mock license data (API unavailable)');
        }
      } catch (error) {
        if (!isActive) return;
        setLicenses(fakerLicenses);
        setPageCount(-1);
        setTotalCount(fakerLicenses.length);
        setErrorMessage('Using mock license data (API unavailable)');
      } finally {
        if (isActive) {
          setIsLoadingLicenses(false);
        }
      }
    };

    void load();

    return () => {
      isActive = false;
    };
  }, [licensesProp]);

  return (
    <div className={`space-y-8 ${className || ''}`}>
      {errorMessage ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {errorMessage}
        </div>
      ) : null}
      <LicenseMetricsSection
        licenses={licensesProp ?? licenses}
        dateRange={dateRange}
        initialDateFrom={defaultRange.from}
        initialDateTo={defaultRange.to}
        onDateRangeChange={handleDateRangeChange}
        isLoading={isLoadingLicensesProp ?? isLoadingLicenses}
        totalCount={totalCount}
      />
      <LicenseTableSection
        licenses={licensesProp ?? licenses}
        dateRange={dateRange}
        isLoading={isLoadingLicensesProp ?? isLoadingLicenses}
        pageCount={pageCount}
      />
    </div>
  );
}
