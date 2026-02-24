'use client';

import { useEffect, useRef } from 'react';
import type { LicenseFilters } from '@/infrastructure/stores/license';

/** Skip fetch if data was fetched within this window (e.g. Dashboard → Licenses navigation) */
const FRESH_THRESHOLD_MS = 30_000;

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

function filtersMatch(
  a: { startsAtFrom?: string; startsAtTo?: string; page?: number; limit?: number } | null,
  b: { startsAtFrom?: string; startsAtTo?: string; page?: number; limit?: number }
): boolean {
  if (!a) return false;
  return (
    (a.startsAtFrom ?? '') === (b.startsAtFrom ?? '') &&
    (a.startsAtTo ?? '') === (b.startsAtTo ?? '') &&
    (a.page ?? 1) === (b.page ?? 1) &&
    (a.limit ?? 20) === (b.limit ?? 20)
  );
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
  lastFetchedAt: number | null;
  lastFetchFilters: { startsAtFrom?: string; startsAtTo?: string; page?: number; limit?: number } | null;
}

/**
 * One-time initialization: sets default date range (current month) when none exists,
 * then fetches licenses. Skips fetch when navigating Dashboard → Licenses if data
 * was fetched within FRESH_THRESHOLD_MS and filters match.
 */
export function useInitialLicenseFilters({
  filters,
  setFilters,
  fetchLicenses,
  lastFetchedAt,
  lastFetchFilters,
}: UseInitialLicenseFiltersOptions): void {
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    const from = filters.startsAtFrom;
    const to = filters.startsAtTo;

    const fetchParams = {
      page: 1,
      limit: 20,
      startsAtFrom: from ?? undefined,
      startsAtTo: to ?? undefined,
    };

    if (
      lastFetchedAt &&
      Date.now() - lastFetchedAt < FRESH_THRESHOLD_MS &&
      filtersMatch(lastFetchFilters, fetchParams)
    ) {
      hasInitializedRef.current = true;
      return;
    }

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
