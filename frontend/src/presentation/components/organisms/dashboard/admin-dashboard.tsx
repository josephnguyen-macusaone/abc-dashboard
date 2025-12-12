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
  const [currentPage, setCurrentPage] = useState<number>(1);

  const handleDateRangeChange = useCallback(
    (values: { range: DateRange; rangeCompare?: DateRange }) => {
      setDateRange(values.range);
    },
    [],
  );


  // Handle pagination and filtering changes
  const handleQueryChange = useCallback(async (params: {
    page: number;
    limit: number;
    sortBy?: keyof LicenseRecord;
    sortOrder?: "asc" | "desc";
    status?: string;
    dba?: string;
    search?: string;
  }) => {
    setCurrentPage(params.page);
    setIsLoadingLicenses(true);
    setErrorMessage(null);

    try {
      const queryParams = {
        page: params.page,
        limit: params.limit,
        ...(params.sortBy && { sortBy: params.sortBy }),
        ...(params.sortOrder && { sortOrder: params.sortOrder }),
        ...(params.status && { status: params.status }),
        ...(params.dba && { dba: params.dba }),
        ...(params.search && { search: params.search }),
      };

      const response = await licenseService.list(queryParams);

      if (response?.data) {
        setLicenses(response.data);
        const totalPages = response.pagination?.totalPages ?? -1;
        const total = response.pagination?.total ?? response.data.length;
        setPageCount(totalPages);
        setTotalCount(total);
      } else {
        // For fallback mock data, apply client-side filtering
        let mockData = fakerLicenses;
        if (params.search) {
          mockData = mockData.filter(license =>
            license.dba.toLowerCase().includes(params.search!.toLowerCase())
          );
        }
        if (params.status) {
          mockData = mockData.filter(license => license.status === params.status);
        }
        if (params.dba) {
          mockData = mockData.filter(license =>
            license.dba.toLowerCase().includes(params.dba!.toLowerCase())
          );
        }
        const startIndex = (params.page - 1) * params.limit;
        const endIndex = startIndex + params.limit;
        setLicenses(mockData.slice(startIndex, endIndex));
        setPageCount(Math.ceil(mockData.length / params.limit));
        setTotalCount(mockData.length);
        setErrorMessage('Using mock license data (API unavailable)');
      }
    } catch (error) {
      // For error fallback, apply same client-side filtering as API
      let mockData = fakerLicenses;
      if (params.search) {
        mockData = mockData.filter(license =>
          license.dba.toLowerCase().includes(params.search!.toLowerCase())
        );
      }
      if (params.status) {
        mockData = mockData.filter(license => license.status === params.status);
      }
      if (params.dba) {
        mockData = mockData.filter(license =>
          license.dba.toLowerCase().includes(params.dba!.toLowerCase())
        );
      }
      const startIndex = (params.page - 1) * params.limit;
      const endIndex = startIndex + params.limit;
      setLicenses(mockData.slice(startIndex, endIndex));
      setPageCount(Math.ceil(mockData.length / params.limit));
      setTotalCount(mockData.length);
      setErrorMessage('Using mock license data (API unavailable)');
    } finally {
      setIsLoadingLicenses(false);
    }
  }, [dateRange]);

  // Initial load (client-side table/grid)
  useEffect(() => {
    // If consumer passed licenses explicitly, skip fetching
    if (licensesProp) return;

    let isActive = true;
    const load = async () => {
      setIsLoadingLicenses(true);
      setErrorMessage(null);
      try {
        const queryParams = {
          page: 1,
          limit: 20, // Standard page size
        };
        const response = await licenseService.list(queryParams);
        if (!isActive) return;
        if (response?.data) {
          setLicenses(response.data);
          const totalPages = response.pagination?.totalPages ?? -1;
          const total = response.pagination?.total ?? response.data.length;
          setPageCount(totalPages);
          setTotalCount(total);
        } else {
          // For mock data fallback, slice first 20 items
          setLicenses(fakerLicenses.slice(0, 20));
          setPageCount(Math.ceil(fakerLicenses.length / 20));
          setTotalCount(fakerLicenses.length);
          setErrorMessage('Using mock license data (API unavailable)');
        }
      } catch (error) {
        if (!isActive) return;
        // For error fallback, slice first 20 items
        setLicenses(fakerLicenses.slice(0, 20));
        setPageCount(Math.ceil(fakerLicenses.length / 20));
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
  }, [licensesProp, dateRange]);

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
        totalRows={totalCount}
        onQueryChange={licensesProp ? undefined : handleQueryChange}
      />
    </div>
  );
}
