'use client';

import { useLayoutEffect, useRef } from 'react';
import type { LicenseFilters } from '@/infrastructure/stores/license';
import { toLocalDateString } from '@/shared/helpers/date-utils';

/**
 * Returns the default date range for the current month (first and last day) in local calendar date.
 * Used by the admin dashboard and tests; License Management does not apply this on mount.
 */
export function getDefaultLicenseDateRange(): { startsAtFrom: string; startsAtTo: string } {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { startsAtFrom: toLocalDateString(first), startsAtTo: toLocalDateString(last) };
}

/**
 * First day of the current calendar month through today (local). Used for agent dashboard default.
 */
export function getMonthToDateLicenseDateRange(): { startsAtFrom: string; startsAtTo: string } {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  return { startsAtFrom: toLocalDateString(first), startsAtTo: toLocalDateString(now) };
}

interface UseInitialLicenseFiltersOptions {
  filters: LicenseFilters;
  setFilters: (filters: LicenseFilters) => void;
  setLoading: (loading: boolean) => void;
  fetchLicenses: (params: {
    page?: number;
    limit?: number;
    startsAtFrom?: string;
    startsAtTo?: string;
  }) => Promise<void>;
}

/**
 * One-time initialization when License Management mounts: clears any `starts_at` window
 * and loads page 1. A default "current month" filter was hiding long-running licenses
 * (e.g. a line manager's own account) when `starts_at` fell outside that month; users
 * can narrow by date with the toolbar filter when needed.
 */
export function useInitialLicenseFilters({
  filters,
  setFilters,
  setLoading,
  fetchLicenses,
}: UseInitialLicenseFiltersOptions): void {
  const hasInitializedRef = useRef(false);

  // useLayoutEffect runs before paint so loading state is set before user sees the page
  useLayoutEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    setLoading(true);
    setFilters({ ...filters, startsAtFrom: undefined, startsAtTo: undefined });
    fetchLicenses({
      page: 1,
      limit: 20,
      startsAtFrom: undefined,
      startsAtTo: undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional one-time mount effect
  }, []);
}
