'use client';

import { useLayoutEffect, useRef } from 'react';
import type { LicenseFilters } from '@/infrastructure/stores/license';

/**
 * Returns the default date range for the current month (first and last day).
 * Used when License Management or Dashboard mounts to set initial filters.
 */
export function getDefaultLicenseDateRange(): { startsAtFrom: string; startsAtTo: string } {
  const now = new Date();
  const startsAtFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const startsAtTo = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  return { startsAtFrom, startsAtTo };
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
 * One-time initialization: resets date range to current month (first to last day)
 * when License Management mounts, then fetches licenses. When date range is cleared,
 * fetch uses no date filter (all data).
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
    const { startsAtFrom, startsAtTo } = getDefaultLicenseDateRange();
    setFilters({ ...filters, startsAtFrom, startsAtTo });
    fetchLicenses({ page: 1, limit: 20, startsAtFrom, startsAtTo });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional one-time mount effect
  }, []);
}
