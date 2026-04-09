'use client';

import { useEffect, useCallback, useRef, useMemo, useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Package, Wallet } from 'lucide-react';
import {
  useLicenseStore,
  selectLicenses,
  selectLicenseLoading,
  selectLicensePagination,
  selectSmsPaymentsLoading,
  selectSmsPaymentsError,
} from '@/infrastructure/stores/license';
import { StatsCards } from '@/presentation/components/molecules/domain/user-management';
import { LicenseMetricsSkeleton, LicenseDataTableSkeleton } from '@/presentation/components/organisms';
import { SmsPaymentHistorySection } from '@/presentation/components/molecules/domain/dashboard/sms-payment-history-section';
import type { SmsPaymentHistoryQueryParams } from '@/presentation/components/molecules/domain/dashboard/sms-payment-history-section';
import type { SmsPaymentsQueryParams, SmsPaymentRecord } from '@/infrastructure/api/licenses/types';
import type { SmsPaymentsMeta } from '@/domain/repositories/i-license-repository';
import { parseLocalDateString, toLocalDateString } from '@/shared/helpers/date-utils';
import type { DateRange } from '@/presentation/components/atoms/forms/date-range-picker';
import type { LicenseRecord } from '@/types';
import { container } from '@/shared/di/container';

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

function isLikelyUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id.trim(),
  );
}

/** External license keys look like EXT-{shortAppId}-…; SMS APIs expect the short segment only. */
const EXT_LICENSE_KEY_APPID_RE = /^EXT-([^-]+)-/i;

/**
 * Resolve SMS query params for GET sms-payments (appid / countid / emailLicense).
 * When mapi expects both appid and emailLicense, include Email_license from the row whenever present.
 * Priority: appid → short id parsed from EXT-… key → non-EXT key as appid → countid → emailLicense only → non-UUID id as appid.
 */
function resolveIdentifier(license: LicenseRecord): SmsPaymentsQueryParams {
  const email = license.emailLicense?.trim();

  const withEmail = (base: SmsPaymentsQueryParams): SmsPaymentsQueryParams =>
    email ? { ...base, emailLicense: email } : base;

  const appid = license.appid?.trim();
  if (appid) return withEmail({ appid });
  const key = license.key?.trim();
  if (key) {
    const fromExt = key.match(EXT_LICENSE_KEY_APPID_RE);
    if (fromExt?.[1]) return withEmail({ appid: fromExt[1] });
    if (!/^EXT-/i.test(key)) return withEmail({ appid: key });
  }
  if (license.countid != null) {
    return email ? { countid: license.countid, emailLicense: email } : { countid: license.countid };
  }
  if (email) return { emailLicense: email };
  const idStr = String(license.id ?? '').trim();
  if (idStr && !isLikelyUuid(idStr)) return withEmail({ appid: idStr });
  return {};
}

function smsScopeHasIdentifier(params: SmsPaymentsQueryParams): boolean {
  return Boolean(
    params.appid?.trim() ||
      params.emailLicense?.trim() ||
      (params.countid !== undefined && params.countid !== null),
  );
}

/** Fetch all SMS payments for a single license identifier (all pages, up to 500 rows). */
async function fetchAllSmsPaymentsForLicense(
  params: SmsPaymentsQueryParams,
  dateParams: { startDate?: string; endDate?: string },
): Promise<SmsPaymentRecord[]> {
  const PAGE_SIZE = 100;
  const first = await container.licenseManagementService.getSmsPayments({
    ...params,
    ...dateParams,
    page: 1,
    limit: PAGE_SIZE,
  });
  const results: SmsPaymentRecord[] = [...(first.data ?? [])];
  const totalPages = first.meta?.totalPages ?? 1;
  if (totalPages > 1) {
    const rest = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, i) =>
        container.licenseManagementService.getSmsPayments({
          ...params,
          ...dateParams,
          page: i + 2,
          limit: PAGE_SIZE,
        }),
      ),
    );
    for (const r of rest) results.push(...(r.data ?? []));
  }
  return results;
}

/** Parse a payment date string to a timestamp for sorting. */
function paymentDateMs(dateStr: string): number {
  if (!dateStr) return 0;
  if (dateStr.includes('/')) {
    const [datePart, timePart] = dateStr.split(' ');
    const [m, d, y] = datePart.split('/');
    const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}${timePart ? `T${timePart}:00` : ''}`;
    return new Date(iso).getTime() || 0;
  }
  return new Date(dateStr).getTime() || 0;
}

export function AgentDashboard() {
  const licenses = useLicenseStore(selectLicenses);
  const licensesLoading = useLicenseStore(selectLicenseLoading);
  const licensesPagination = useLicenseStore(selectLicensePagination);
  const smsPaymentsLoading = useLicenseStore(selectSmsPaymentsLoading);
  const smsPaymentsError = useLicenseStore(selectSmsPaymentsError);
  const filtersStartsAtFrom = useLicenseStore((s) => s.filters.startsAtFrom);
  const filtersStartsAtTo = useLicenseStore((s) => s.filters.startsAtTo);

  const fetchLicenses = useLicenseStore((s) => s.fetchLicenses);
  const setFilters = useLicenseStore((s) => s.setFilters);

  // Merged SMS state — fetched in parallel for all licenses
  const [mergedPayments, setMergedPayments] = useState<SmsPaymentRecord[]>([]);
  const [mergedTotalAmount, setMergedTotalAmount] = useState(0);
  const [mergedLoading, setMergedLoading] = useState(false);
  const [mergedError, setMergedError] = useState<string | null>(null);
  // Client-side pagination over the merged list
  const [smsPage, setSmsPage] = useState(1);
  const [smsLimit, setSmsLimit] = useState(20);
  // Date filter for SMS history (separate from license table date range)
  const [smsDateParams, setSmsDateParams] = useState<{ startDate?: string; endDate?: string }>({});

  // Sum smsBalance across ALL loaded licenses
  const smsBalance = useMemo(
    () => licenses.reduce((sum, l) => sum + (l.smsBalance ?? 0), 0),
    [licenses],
  );

  // Stable key that changes only when the set of license identifiers changes
  const licensesScopeKey = useMemo(
    () =>
      licenses
        .map((l) => [l.id ?? '', l.appid ?? '', l.key ?? '', l.countid ?? '', l.emailLicense ?? ''].join(':'))
        .join('|'),
    [licenses],
  );

  const dateRange = useMemo<{ from?: Date; to?: Date }>(() => {
    const from = filtersStartsAtFrom ? parseLocalDateString(filtersStartsAtFrom) : undefined;
    const to = filtersStartsAtTo ? parseLocalDateString(filtersStartsAtTo) : undefined;
    if (!from && !to) return {};
    return {
      from: from && !Number.isNaN(from.getTime()) ? from : undefined,
      to: to && !Number.isNaN(to.getTime()) ? to : undefined,
    };
  }, [filtersStartsAtFrom, filtersStartsAtTo]);

  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    const currentFilters = useLicenseStore.getState().filters;
    setFilters({ ...currentFilters, startsAtFrom: undefined, startsAtTo: undefined });
    void fetchLicenses({ page: 1, limit: 20 }).catch(() => {});
  }, [fetchLicenses, setFilters]);

  /** Fetch SMS payments for all licenses in parallel, merge and sort newest-first. */
  const fetchMergedSmsPayments = useCallback(
    async (dateParams: { startDate?: string; endDate?: string }) => {
      const currentLicenses = useLicenseStore.getState().licenses;
      const identifiers = currentLicenses
        .map((l) => resolveIdentifier(l))
        .filter(smsScopeHasIdentifier);

      if (identifiers.length === 0) {
        setMergedPayments([]);
        setMergedTotalAmount(0);
        return;
      }

      setMergedLoading(true);
      setMergedError(null);
      try {
        const perLicense = await Promise.all(
          identifiers.map((id) => fetchAllSmsPaymentsForLicense(id, dateParams).catch(() => [] as SmsPaymentRecord[])),
        );
        // Merge, deduplicate by id, sort newest-first
        const seen = new Set<number>();
        const all: SmsPaymentRecord[] = [];
        for (const rows of perLicense) {
          for (const row of rows) {
            if (!seen.has(row.id)) {
              seen.add(row.id);
              all.push(row);
            }
          }
        }
        all.sort((a, b) => paymentDateMs(b.date) - paymentDateMs(a.date));
        setMergedPayments(all);
        setMergedTotalAmount(all.reduce((s, p) => s + (p.amount ?? 0), 0));
        setSmsPage(1);
      } catch (err) {
        setMergedError(err instanceof Error ? err.message : 'Failed to load SMS payment history');
      } finally {
        setMergedLoading(false);
      }
    },
    [],
  );

  // Re-fetch when licenses change
  useEffect(() => {
    if (!licensesScopeKey) return;
    void fetchMergedSmsPayments(smsDateParams);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [licensesScopeKey]);

  // Client-side paginated slice of merged payments
  const pagedPayments = useMemo(() => {
    const start = (smsPage - 1) * smsLimit;
    return mergedPayments.slice(start, start + smsLimit);
  }, [mergedPayments, smsPage, smsLimit]);

  const smsPagination = useMemo((): SmsPaymentsMeta => {
    const total = mergedPayments.length;
    const totalPages = Math.max(1, Math.ceil(total / smsLimit));
    return {
      page: smsPage,
      limit: smsLimit,
      total,
      totalPages,
      hasNext: smsPage < totalPages,
      hasPrev: smsPage > 1,
    };
  }, [mergedPayments.length, smsPage, smsLimit]);

  const smsFetchError = mergedError ?? (smsPaymentsError?.trim() || null);

  const smsEmptyStateDetail = useMemo(() => {
    if (smsFetchError) return null;
    const allLicenses = useLicenseStore.getState().licenses;
    if (allLicenses.length > 0 && allLicenses.every((l) => !smsScopeHasIdentifier(resolveIdentifier(l)))) {
      return 'SMS payment history needs an App ID, Count ID, or email on your license. If this message persists, contact support.';
    }
    return null;
  }, [smsFetchError]);

  const handleDateRangeChange = useCallback(
    (values: { range?: { from?: Date; to?: Date }; rangeCompare?: DateRange } | null) => {
      const nextRange = values?.range;
      const hasRange = nextRange?.from || nextRange?.to;
      const startsAtFrom = nextRange?.from ? toLocalDateString(nextRange.from) : undefined;
      const startsAtTo = nextRange?.to ? toLocalDateString(nextRange.to) : undefined;
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

  const handleSmsQueryChange = useCallback(
    (params: SmsPaymentHistoryQueryParams) => {
      const newPage = params.page ?? 1;
      const newLimit = params.limit ?? smsLimit;
      const newDateParams = {
        startDate: params.startDate,
        endDate: params.endDate,
      };
      // If date changed, re-fetch from API; otherwise just update pagination
      const dateChanged =
        newDateParams.startDate !== smsDateParams.startDate ||
        newDateParams.endDate !== smsDateParams.endDate;
      if (dateChanged) {
        setSmsDateParams(newDateParams);
        setSmsLimit(newLimit);
        void fetchMergedSmsPayments(newDateParams);
      } else {
        setSmsPage(newPage);
        setSmsLimit(newLimit);
      }
    },
    [smsLimit, smsDateParams, fetchMergedSmsPayments],
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
      }).catch(() => {});
    },
    [fetchLicenses],
  );

  const metricsLoading = licensesLoading && licenses.length === 0;

  if (metricsLoading) {
    return <LicenseMetricsSkeleton columns={2} cardCount={2} />;
  }

  const isLoadingPayments = mergedLoading || smsPaymentsLoading;

  return (
    <div className="space-y-6">
      <StatsCards
        columns={2}
        stats={[
          {
            id: 'sms-purchased',
            label: 'SMS Purchased',
            value: currencyFmt.format(mergedTotalAmount),
            icon: Package,
          },
          {
            id: 'sms-balance',
            label: 'SMS Balance',
            value: numberFmt.format(smsBalance),
            icon: Wallet,
          },
        ]}
        isLoading={isLoadingPayments && mergedPayments.length === 0}
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
        payments={pagedPayments}
        pagination={smsPagination}
        isLoading={isLoadingPayments}
        fetchError={smsFetchError}
        emptyStateDetail={smsEmptyStateDetail}
        onQueryChange={handleSmsQueryChange}
      />
    </div>
  );
}
