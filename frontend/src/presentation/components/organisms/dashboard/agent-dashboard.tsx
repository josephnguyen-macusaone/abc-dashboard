'use client';

import { useEffect, useCallback, useRef, useMemo, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Package, Wallet } from 'lucide-react';
import {
  useLicenseStore,
  selectLicenses,
  selectLicenseLoading,
  selectLicensePagination,
  selectSmsPayments,
  selectSmsPagination,
  selectSmsTotalAmount,
  selectSmsPaymentsLoading,
} from '@/infrastructure/stores/license';
import { StatsCards } from '@/presentation/components/molecules/domain/user-management';
import { LicenseMetricsSkeleton, LicenseDataTableSkeleton } from '@/presentation/components/organisms';
import { SmsPaymentHistorySection } from '@/presentation/components/molecules/domain/dashboard/sms-payment-history-section';
import type { SmsPaymentHistoryQueryParams } from '@/presentation/components/molecules/domain/dashboard/sms-payment-history-section';
import type { SmsPaymentsQueryParams } from '@/infrastructure/api/licenses/types';
import { parseLocalDateString, toLocalDateString } from '@/shared/helpers/date-utils';
import type { DateRange } from '@/presentation/components/atoms/forms/date-range-picker';

const LicenseTableSection = dynamic(
  () =>
    import('@/presentation/components/molecules/domain/dashboard/license-table-section').then(
      (mod) => ({ default: mod.LicenseTableSection })
    ),
  {
    loading: () => <LicenseDataTableSkeleton />,
    ssr: false,
  }
);

const currencyFmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
});

const numberFmt = new Intl.NumberFormat('en-US');

/**
 * Resolve the best available SMS query identifier from a license record.
 * Priority: appid → countid → emailLicense
 */
function resolveIdentifier(license: {
  appid?: string;
  countid?: number;
  emailLicense?: string;
  key?: string;
}): SmsPaymentsQueryParams {
  if (license.appid) return { appid: license.appid };
  if (license.key) return { appid: license.key };
  if (license.countid != null) return { countid: license.countid };
  if (license.emailLicense) return { emailLicense: license.emailLicense };
  return {};
}

export function AgentDashboard() {
  const licenses = useLicenseStore(selectLicenses);
  const licensesLoading = useLicenseStore(selectLicenseLoading);
  const licensesPagination = useLicenseStore(selectLicensePagination);
  const smsPayments = useLicenseStore(selectSmsPayments);
  const smsPagination = useLicenseStore(selectSmsPagination);
  const smsTotalAmount = useLicenseStore(selectSmsTotalAmount);
  const smsPaymentsLoading = useLicenseStore(selectSmsPaymentsLoading);
  // Subscribe to individual date-filter strings so the component only re-renders when
  // these values actually change, not on every fetchLicenses call (which always creates
  // a new filters object reference).
  const filtersStartsAtFrom = useLicenseStore((s) => s.filters.startsAtFrom);
  const filtersStartsAtTo = useLicenseStore((s) => s.filters.startsAtTo);

  const fetchLicenses = useLicenseStore((s) => s.fetchLicenses);
  const fetchSmsPayments = useLicenseStore((s) => s.fetchSmsPayments);
  const setFilters = useLicenseStore((s) => s.setFilters);

  const primaryLicense = licenses[0] ?? null;
  const smsBalance = primaryLicense?.smsBalance ?? 0;

  // Derive date range from store filters (same pattern as AdminDashboard)
  const dateRange = useMemo<{ from?: Date; to?: Date }>(() => {
    const from = filtersStartsAtFrom ? parseLocalDateString(filtersStartsAtFrom) : undefined;
    const to = filtersStartsAtTo ? parseLocalDateString(filtersStartsAtTo) : undefined;
    if (!from && !to) return {};
    return {
      from: from && !Number.isNaN(from.getTime()) ? from : undefined,
      to: to && !Number.isNaN(to.getTime()) ? to : undefined,
    };
  }, [filtersStartsAtFrom, filtersStartsAtTo]);

  // Keep stable identifier across renders; re-resolve only when primary license changes
  const identifierRef = useRef<SmsPaymentsQueryParams>({});
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    // No default date range — agents see all assigned licenses until they pick a range.
    const currentFilters = useLicenseStore.getState().filters;
    setFilters({
      ...currentFilters,
      startsAtFrom: undefined,
      startsAtTo: undefined,
    });

    const run = async () => {
      try {
        await fetchLicenses({ page: 1, limit: 20 });
      } catch {
        return;
      }
      const firstLicense = useLicenseStore.getState().licenses[0];
      if (firstLicense) {
        identifierRef.current = resolveIdentifier(firstLicense);
        try {
          await fetchSmsPayments({ ...identifierRef.current, page: 1, limit: 20 });
        } catch {
          // SMS fetch failure is non-fatal; store already holds the error state
        }
      }
    };

    void run();
  }, [fetchLicenses, fetchSmsPayments, setFilters]);

  const handleDateRangeChange = useCallback(
    (values: { range?: { from?: Date; to?: Date }; rangeCompare?: DateRange } | null) => {
      const nextRange = values?.range;
      const hasRange = nextRange?.from || nextRange?.to;
      const startsAtFrom = nextRange?.from ? toLocalDateString(nextRange.from) : undefined;
      const startsAtTo = nextRange?.to ? toLocalDateString(nextRange.to) : undefined;

      // Read current filters from store at call-time to avoid stale-closure re-renders.
      const currentFilters = useLicenseStore.getState().filters;
      setFilters({
        ...currentFilters,
        startsAtFrom: hasRange ? startsAtFrom : undefined,
        startsAtTo: hasRange ? startsAtTo : undefined,
      });

      fetchLicenses({
        page: 1,
        limit: 20,
        startsAtFrom: hasRange ? startsAtFrom : undefined,
        startsAtTo: hasRange ? startsAtTo : undefined,
      }).catch(() => {});
    },
    [setFilters, fetchLicenses],
  );

  const handleQueryChange = useCallback(
    (params: SmsPaymentHistoryQueryParams) => {
      fetchSmsPayments({
        ...identifierRef.current,
        page: params.page ?? 1,
        limit: 20,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
        startDate: params.startDate,
        endDate: params.endDate,
      }).catch(() => {
        // Error state is already set in the store; suppress unhandled rejection
      });
    },
    [fetchSmsPayments]
  );

  const handleLicenseTableQueryChange = useCallback(
    (params: { page: number; limit: number; sortBy?: string; sortOrder?: 'asc' | 'desc' }) => {
      const storeFilters = useLicenseStore.getState().filters;
      fetchLicenses({
        page: params.page,
        limit: params.limit,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
        startsAtFrom: storeFilters.startsAtFrom,
        startsAtTo: storeFilters.startsAtTo,
      }).catch(() => {
        // Error state is already set in the store; suppress unhandled rejection
      });
    },
    [fetchLicenses]
  );

  const metricsLoading = licensesLoading && licenses.length === 0;

  if (metricsLoading) {
    return <LicenseMetricsSkeleton columns={2} cardCount={2} />;
  }

  return (
    <div className="space-y-6">
      <StatsCards
        columns={2}
        stats={[
          {
            id: 'sms-purchased',
            label: 'SMS Purchased',
            value: currencyFmt.format(smsTotalAmount),
            icon: Package,
          },
          {
            id: 'sms-balance',
            label: 'SMS Balance',
            value: numberFmt.format(smsBalance),
            icon: Wallet,
          },
        ]}
        isLoading={smsPaymentsLoading && smsPayments.length === 0}
      />

      <Suspense fallback={<LicenseDataTableSkeleton />}>
        <LicenseTableSection
          title="My Licenses"
          description="Licenses assigned to your account"
          licenses={licenses}
          isLoading={licensesLoading}
          pageCount={licensesPagination.totalPages}
          totalRows={licensesPagination.total}
          tableVariant="agent"
          dateRange={dateRange}
          onDateRangeChange={(range) => handleDateRangeChange(range ? { range } : null)}
          onQueryChange={handleLicenseTableQueryChange}
        />
      </Suspense>

      <SmsPaymentHistorySection
        payments={smsPayments}
        pagination={smsPagination}
        isLoading={smsPaymentsLoading}
        onQueryChange={handleQueryChange}
      />
    </div>
  );
}
