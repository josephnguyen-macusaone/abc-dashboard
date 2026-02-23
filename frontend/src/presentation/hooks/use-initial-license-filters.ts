'use client';

import { useEffect, useRef } from 'react';
import type { LicenseFilters } from '@/infrastructure/stores/license';

/**
 * Returns the default date range for the current month (YYYY-MM-DD).
 * Used when no date filter is set on initial load.
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
  fetchLicenses: (params: {
    page?: number;
    limit?: number;
    startsAtFrom?: string;
    startsAtTo?: string;
  }) => Promise<void>;
}

/**
 * One-time initialization: sets default date range (current month) when none exists,
 * then fetches licenses. Per React guidelines, this encapsulates mount-only side effect.
 */
export function useInitialLicenseFilters({
  filters,
  setFilters,
  fetchLicenses,
}: UseInitialLicenseFiltersOptions): void {
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    const from = filters.startsAtFrom;
    const to = filters.startsAtTo;

    if (from && to) {
      hasInitializedRef.current = true;
      fetchLicenses({ page: 1, limit: 20, startsAtFrom: from, startsAtTo: to });
      return;
    }

    if (hasInitializedRef.current) {
      fetchLicenses({ page: 1, limit: 20 });
      return;
    }

    hasInitializedRef.current = true;
    const { startsAtFrom, startsAtTo } = getDefaultLicenseDateRange();
    setFilters({ ...filters, startsAtFrom, startsAtTo });
    fetchLicenses({ page: 1, limit: 20, startsAtFrom, startsAtTo });
  }, []);
}
