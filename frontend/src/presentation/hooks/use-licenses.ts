/**
 * License Management Hooks
 *
 * Thin wrappers over the license store. All data and actions go through
 * useLicenseStore → application layer → repository. No direct API access.
 *
 * Prefer useLicenseStore directly when you need store selectors or actions.
 */

import { useEffect, useCallback } from 'react';
import type { LicenseRecord } from '@/types';
import {
  useLicenseStore,
  selectLicenses,
  selectLicenseLoading,
  selectLicensePagination,
  selectLicenseFilters,
  selectLicenseError,
  selectDashboardMetrics,
  selectDashboardMetricsLoading,
  selectDashboardMetricsError,
  selectSmsPayments,
  selectSmsTotals,
  selectSmsPaymentsLoading,
  selectSmsPaymentsError,
} from '@/infrastructure/stores/license';
import type { CreateLicenseRequest, UpdateLicenseRequest } from '@/infrastructure/stores/license';

// ========================================================================
// CORE LICENSE HOOKS
// ========================================================================

/**
 * Hook for fetching licenses with pagination and filtering.
 * Thin wrapper over useLicenseStore.
 */
export const useLicenses = (params: {
  page?: number;
  limit?: number;
  status?: string;
  dba?: string;
  license_type?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  autoFetch?: boolean;
} = {}) => {
  const licenses = useLicenseStore(selectLicenses);
  const loading = useLicenseStore(selectLicenseLoading);
  const error = useLicenseStore(selectLicenseError);
  const filters = useLicenseStore(selectLicenseFilters);
  const pagination = useLicenseStore(selectLicensePagination);
  const setFilters = useLicenseStore((s) => s.setFilters);
  const fetchLicenses = useLicenseStore((s) => s.fetchLicenses);
  const goToPage = useLicenseStore((s) => s.goToPage);
  const changePageSize = useLicenseStore((s) => s.changePageSize);

  const refetch = useCallback(() => {
    fetchLicenses({
      page: params.page ?? pagination.page,
      limit: params.limit ?? pagination.limit,
      status: params.status ?? filters.status,
      dba: params.dba ?? filters.dba,
      startsAtFrom: params.startDate ?? filters.startsAtFrom,
      startsAtTo: params.endDate ?? filters.startsAtTo,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
    });
  }, [fetchLicenses, params, pagination, filters]);

  const applyParams = useCallback(() => {
    const nextFilters = {
      ...filters,
      ...(params.status !== undefined && { status: params.status as typeof filters.status }),
      ...(params.dba !== undefined && { dba: params.dba }),
      ...(params.startDate !== undefined && { startsAtFrom: params.startDate }),
      ...(params.endDate !== undefined && { startsAtTo: params.endDate }),
    };
    setFilters(nextFilters);
    fetchLicenses({
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      sortBy: params.sortBy ?? 'created_at',
      sortOrder: params.sortOrder ?? 'desc',
      ...nextFilters,
    });
  }, [filters, params, setFilters, fetchLicenses]);

  useEffect(() => {
    if (params.autoFetch !== false) {
      applyParams();
    }
  }, [params.autoFetch]); // eslint-disable-line react-hooks/exhaustive-deps -- apply on mount / autoFetch toggle only

  const paginationWithFlags = {
    ...pagination,
    hasNext: pagination.page < pagination.totalPages,
    hasPrev: pagination.page > 1,
  };

  return {
    licenses,
    pagination: paginationWithFlags,
    loading,
    error,
    refetch,
    goToPage: (page: number) => goToPage(page),
    changeLimit: (limit: number) => changePageSize(limit),
    sort: (sortBy: string, sortOrder: 'asc' | 'desc') => {
      setFilters({ ...filters });
      fetchLicenses({ sortBy, sortOrder, page: 1 });
    },
    filter: (filterUpdates: Record<string, unknown>) => {
      setFilters({ ...filters, ...filterUpdates });
      fetchLicenses({ ...filterUpdates, page: 1 });
    },
  };
};

/**
 * Hook for individual license operations.
 * Thin wrapper over useLicenseStore.
 */
export const useLicense = (licenseId?: string) => {
  const currentLicense = useLicenseStore((s) => s.currentLicense);
  const loading = useLicenseStore(selectLicenseLoading);
  const error = useLicenseStore(selectLicenseError);
  const fetchLicense = useLicenseStore((s) => s.fetchLicense);
  const updateLicense = useLicenseStore((s) => s.updateLicense);
  const deleteLicense = useLicenseStore((s) => s.deleteLicense);

  useEffect(() => {
    if (licenseId) {
      fetchLicense(String(licenseId));
    }
  }, [licenseId, fetchLicense]);

  const license =
    licenseId && currentLicense && String(currentLicense.id) === String(licenseId)
      ? currentLicense
      : null;

  const update = useCallback(
    async (updates: Partial<LicenseRecord>) => {
      if (!licenseId) return;
      const { startsAt, ...rest } = updates as Partial<LicenseRecord> & { startDay?: string };
      const payload: UpdateLicenseRequest = {
        ...rest,
        ...(startsAt !== undefined && { startDay: startsAt }),
      };
      return updateLicense(licenseId, payload);
    },
    [licenseId, updateLicense]
  );

  return {
    license,
    loading,
    error,
    refetch: () => (licenseId ? fetchLicense(licenseId) : undefined),
    update,
    delete: () => (licenseId ? deleteLicense(licenseId) : undefined),
  };
};

/**
 * Hook for license creation.
 * Thin wrapper over useLicenseStore.
 */
export const useLicenseCreation = () => {
  const loading = useLicenseStore(selectLicenseLoading);
  const error = useLicenseStore(selectLicenseError);
  const createLicense = useLicenseStore((s) => s.createLicense);

  const create = useCallback(
    async (licenseData: Partial<LicenseRecord>) => {
      return createLicense(licenseData as CreateLicenseRequest);
    },
    [createLicense]
  );

  return {
    createLicense: create,
    loading,
    error,
  };
};

// ========================================================================
// ANALYTICS & DASHBOARD HOOKS
// ========================================================================

/**
 * Hook for dashboard metrics.
 * Thin wrapper over useLicenseStore.
 */
export const useDashboardMetrics = (params?: {
  startsAtFrom?: string;
  startsAtTo?: string;
  autoFetch?: boolean;
}) => {
  const metrics = useLicenseStore(selectDashboardMetrics);
  const loading = useLicenseStore(selectDashboardMetricsLoading);
  const error = useLicenseStore(selectDashboardMetricsError);
  const fetchDashboardMetrics = useLicenseStore((s) => s.fetchDashboardMetrics);

  const refetch = useCallback(() => {
    fetchDashboardMetrics({
      startsAtFrom: params?.startsAtFrom,
      startsAtTo: params?.startsAtTo,
    });
  }, [fetchDashboardMetrics, params?.startsAtFrom, params?.startsAtTo]);

  useEffect(() => {
    if (params?.autoFetch !== false) {
      refetch();
    }
  }, [params?.autoFetch]); // eslint-disable-line react-hooks/exhaustive-deps -- run on mount / autoFetch toggle

  return {
    metrics,
    loading,
    error,
    refetch,
  };
};

/**
 * Hook for license analytics.
 * @deprecated Analytics not yet on license store. Use useLicenseStore for other license data.
 */
export const useLicenseAnalytics = (params?: {
  month?: number;
  year?: number;
  startDate?: string;
  endDate?: string;
  status?: string;
  license_type?: string;
  autoFetch?: boolean;
}) => {
  return {
    analytics: null as unknown,
    loading: false,
    error: null as string | null,
    refetch: () => {},
  };
};

// ========================================================================
// LIFECYCLE MANAGEMENT HOOKS
// ========================================================================

/**
 * Hook for license lifecycle operations.
 * getLicensesRequiringAttention is wired to the store; renew/expire/reactivate
 * are not yet on the store and throw if called.
 */
export const useLicenseLifecycle = () => {
  const loading = useLicenseStore((s) => s.licensesRequiringAttentionLoading);
  const error = useLicenseStore((s) => s.licensesRequiringAttentionError);
  const fetchLicensesRequiringAttention = useLicenseStore((s) => s.fetchLicensesRequiringAttention);

  const renewLicense = useCallback(async () => {
    throw new Error('renewLicense: not implemented via store; use useLicenseStore when lifecycle actions are added.');
  }, []);
  const expireLicense = useCallback(async () => {
    throw new Error('expireLicense: not implemented via store; use useLicenseStore when lifecycle actions are added.');
  }, []);
  const reactivateLicense = useCallback(async () => {
    throw new Error('reactivateLicense: not implemented via store; use useLicenseStore when lifecycle actions are added.');
  }, []);

  return {
    renewLicense,
    expireLicense,
    reactivateLicense,
    getLicensesRequiringAttention: fetchLicensesRequiringAttention,
    loading,
    error,
  };
};

/**
 * Hook for license lifecycle status (single license).
 * @deprecated Lifecycle status not yet on license store. Use useLicenseStore for license data.
 */
export const useLicenseLifecycleStatus = (licenseId?: string) => {
  return {
    lifecycleStatus: null as unknown,
    loading: false,
    error: null as string | null,
    refetch: () => {},
  };
};

// ========================================================================
// BULK OPERATIONS HOOKS
// ========================================================================

/**
 * Hook for bulk license operations.
 * Thin wrapper over useLicenseStore (bulkUpdateByIdentifiers, bulkCreateLicenses).
 * bulkDeleteLicenses may throw if not implemented in the store.
 */
export const useBulkLicenseOperations = () => {
  const loading = useLicenseStore((s) => s.bulkUpdateByIdentifiersLoading);
  const error = useLicenseStore(selectLicenseError);
  const bulkUpdateByIdentifiers = useLicenseStore((s) => s.bulkUpdateByIdentifiers);
  const bulkCreateLicenses = useLicenseStore((s) => s.bulkCreateLicenses);
  const bulkDeleteLicenses = useLicenseStore((s) => s.bulkDeleteLicenses);

  const bulkUpdate = useCallback(
    async (updates: {
      identifiers: { appids?: string[]; emails?: string[]; countids?: number[] };
      updates: Record<string, unknown>;
    }) => {
      const result = await bulkUpdateByIdentifiers(updates.identifiers, updates.updates);
      return { success: true as const, data: result };
    },
    [bulkUpdateByIdentifiers]
  );

  const bulkDelete = useCallback(
    async (identifiers: { appids?: string[]; emails?: string[]; countids?: number[] }) => {
      const ids: (number | string)[] = [
        ...(identifiers.countids ?? []),
        ...(identifiers.appids ?? []),
        ...(identifiers.emails ?? []),
      ];
      await bulkDeleteLicenses(ids);
      return { success: true as const, data: { deleted: ids.length } };
    },
    [bulkDeleteLicenses]
  );

  const bulkCreate = useCallback(
    async (licenses: Array<Partial<LicenseRecord>>) => {
      const created = await bulkCreateLicenses(licenses);
      return { success: true as const, data: { created: created.length, licenses: created } };
    },
    [bulkCreateLicenses]
  );

  return {
    bulkUpdate,
    bulkDelete,
    bulkCreate,
    loading,
    error,
  };
};

// ========================================================================
// SMS PAYMENT MANAGEMENT HOOKS
// ========================================================================

/**
 * Hook for SMS payment management.
 * Thin wrapper over useLicenseStore.
 */
export const useSmsPayments = (params?: {
  appid?: string;
  emailLicense?: string;
  countid?: number;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  autoFetch?: boolean;
}) => {
  const payments = useLicenseStore(selectSmsPayments);
  const totals = useLicenseStore(selectSmsTotals);
  const pagination = useLicenseStore((s) => s.smsPagination);
  const loading = useLicenseStore(selectSmsPaymentsLoading);
  const error = useLicenseStore(selectSmsPaymentsError);
  const fetchSmsPayments = useLicenseStore((s) => s.fetchSmsPayments);
  const addSmsPayment = useLicenseStore((s) => s.addSmsPayment);

  const refetch = useCallback(() => {
    fetchSmsPayments({
      appid: params?.appid,
      emailLicense: params?.emailLicense,
      countid: params?.countid,
      startDate: params?.startDate,
      endDate: params?.endDate,
      page: params?.page ?? 1,
      limit: params?.limit ?? 20,
      sortBy: params?.sortBy,
      sortOrder: params?.sortOrder,
    });
  }, [fetchSmsPayments, params]);

  useEffect(() => {
    if (params?.autoFetch !== false) {
      refetch();
    }
  }, [params?.autoFetch]); // eslint-disable-line react-hooks/exhaustive-deps -- run on mount / autoFetch toggle

  return {
    payments,
    totals,
    pagination,
    loading,
    error,
    refetch,
    addPayment: addSmsPayment,
  };
};
