/**
 * License Management Hooks
 * Comprehensive hooks for license CRUD operations, analytics, and lifecycle management
 */

import { useState, useEffect, useCallback } from 'react';
import { licenseApi } from '@/infrastructure/api/licenses';
import { useToast } from '@/presentation/contexts/toast-context';
import logger from '@/shared/helpers/logger';

// Mock error handler
const useErrorHandler = () => ({
  handleError: (error: unknown) => logger.error('Error', { error }),
});
import type { LicenseRecord } from '@/types';
import type { DashboardMetrics } from '@/infrastructure/api/types';

// ========================================================================
// CORE LICENSE HOOKS
// ========================================================================

/**
 * Hook for fetching licenses with pagination and filtering
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
  const [licenses, setLicenses] = useState<LicenseRecord[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { handleError } = useErrorHandler();
  const { showToast } = useToast();

  const fetchLicenses = useCallback(async (overrideParams?: Partial<typeof params>) => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = {
        page: overrideParams?.page || params.page || 1,
        limit: overrideParams?.limit || params.limit || 20,
        status: overrideParams?.status || params.status,
        dba: overrideParams?.dba || params.dba,
        license_type: overrideParams?.license_type || params.license_type,
        startDate: overrideParams?.startDate || params.startDate,
        endDate: overrideParams?.endDate || params.endDate,
        sortBy: overrideParams?.sortBy || params.sortBy || 'created_at',
        sortOrder: overrideParams?.sortOrder || params.sortOrder || 'desc',
      };

      const response = await licenseApi.getLicenses(queryParams);

      setLicenses(response.licenses);
      setPagination(response.pagination);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch licenses';
      setError(errorMessage);
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, [params, handleError]);

  const refetch = useCallback(() => fetchLicenses(), [fetchLicenses]);

  const goToPage = useCallback((page: number) => {
    fetchLicenses({ page });
  }, [fetchLicenses]);

  const changeLimit = useCallback((limit: number) => {
    fetchLicenses({ limit, page: 1 });
  }, [fetchLicenses]);

  const sort = useCallback((sortBy: string, sortOrder: 'asc' | 'desc') => {
    fetchLicenses({ sortBy, sortOrder, page: 1 });
  }, [fetchLicenses]);

  const filter = useCallback((filters: Record<string, any>) => {
    fetchLicenses({ ...filters, page: 1 });
  }, [fetchLicenses]);

  useEffect(() => {
    if (params.autoFetch !== false) {
      fetchLicenses();
    }
  }, [params.autoFetch, fetchLicenses]);

  return {
    licenses,
    pagination,
    loading,
    error,
    refetch,
    goToPage,
    changeLimit,
    sort,
    filter,
  };
};

/**
 * Hook for individual license operations
 */
export const useLicense = (licenseId?: string) => {
  const [license, setLicense] = useState<LicenseRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { handleError } = useErrorHandler();
  const { showToast } = useToast();

  const fetchLicense = useCallback(async (id?: string) => {
    const targetId = id || licenseId;
    if (!targetId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await licenseApi.getLicense(targetId);

      // Handle both internal API (LicenseRecord) and external API (wrapped response) formats
      if (typeof response === 'object' && 'success' in response) {
        // External API format
        if (response.success) {
          setLicense(response.data.license);
        } else {
          throw new Error(response.message || 'Failed to fetch license');
        }
      } else {
        // Internal API format - direct LicenseRecord
        setLicense(response as any);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch license';
      setError(errorMessage);
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, [licenseId, handleError]);

  const updateLicense = useCallback(async (updates: Partial<LicenseRecord>) => {
    if (!licenseId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await licenseApi.updateLicense(licenseId, updates);

      // Handle both internal API (LicenseRecord) and external API (wrapped response) formats
      if (typeof response === 'object' && 'success' in response) {
        // External API format
        if (response.success) {
          setLicense(response.data.license);
          showToast('License updated successfully', 'success');
        } else {
          throw new Error(response.message || 'Failed to update license');
        }
      } else {
        // Internal API format - direct LicenseRecord
        setLicense(response as any);
        showToast('License updated successfully', 'success');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update license';
      setError(errorMessage);
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, [licenseId, handleError, showToast]);

  const deleteLicense = useCallback(async () => {
    if (!licenseId) return;

    setLoading(true);
    setError(null);

    try {
      await licenseApi.deleteLicense(licenseId);

      // If we get here, deletion was successful
      setLicense(null);
      showToast('License deleted successfully', 'success');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to delete license';
      setError(errorMessage);
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, [licenseId, handleError, showToast]);

  useEffect(() => {
    if (licenseId) {
      fetchLicense();
    }
  }, [licenseId, fetchLicense]);

  return {
    license,
    loading,
    error,
    refetch: () => fetchLicense(),
    update: updateLicense,
    delete: deleteLicense,
  };
};

/**
 * Hook for license creation
 */
export const useLicenseCreation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { handleError } = useErrorHandler();
  const { showToast } = useToast();

  const createLicense = useCallback(async (licenseData: Partial<LicenseRecord>) => {
    setLoading(true);
    setError(null);

    try {
      const response = await licenseApi.createLicense(licenseData);

      // Handle both internal API (LicenseRecord) and external API (wrapped response) formats
      if (typeof response === 'object' && 'success' in response) {
        // External API format
        if (response.success) {
          showToast('License created successfully', 'success');
          return response.data.license;
        } else {
          throw new Error(response.message || 'Failed to create license');
        }
      } else {
        // Internal API format - direct LicenseRecord
        showToast('License created successfully', 'success');
        return response as any;
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to create license';
      setError(errorMessage);
      handleError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [handleError, showToast]);

  return {
    createLicense,
    loading,
    error,
  };
};

// ========================================================================
// ANALYTICS & DASHBOARD HOOKS
// ========================================================================

/**
 * Hook for dashboard metrics
 */
export const useDashboardMetrics = (params?: {
  startsAtFrom?: string;
  startsAtTo?: string;
  autoFetch?: boolean;
}) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { handleError } = useErrorHandler();

  const fetchMetrics = useCallback(async (overrideParams?: typeof params) => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = {
        startsAtFrom: overrideParams?.startsAtFrom || params?.startsAtFrom,
        startsAtTo: overrideParams?.startsAtTo || params?.startsAtTo,
      };

      const response = await licenseApi.getDashboardMetrics(queryParams);

      if (response.success) {
        setMetrics(response.data);
      } else {
        throw new Error(response.message || 'Failed to fetch dashboard metrics');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch dashboard metrics';
      setError(errorMessage);
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, [params, handleError]);

  const refetch = useCallback(() => fetchMetrics(), [fetchMetrics]);

  useEffect(() => {
    if (params?.autoFetch !== false) {
      fetchMetrics();
    }
  }, [params?.autoFetch, fetchMetrics]);

  return {
    metrics,
    loading,
    error,
    refetch,
  };
};

/**
 * Hook for license analytics
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
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { handleError } = useErrorHandler();

  const fetchAnalytics = useCallback(async (overrideParams?: typeof params) => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = {
        month: overrideParams?.month || params?.month,
        year: overrideParams?.year || params?.year,
        startDate: overrideParams?.startDate || params?.startDate,
        endDate: overrideParams?.endDate || params?.endDate,
        status: overrideParams?.status || params?.status,
        license_type: overrideParams?.license_type || params?.license_type,
      };

      const response = await licenseApi.getLicenseAnalytics(queryParams);

      if (response.success) {
        setAnalytics(response.data);
      } else {
        throw new Error(response.message || 'Failed to fetch license analytics');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch license analytics';
      setError(errorMessage);
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, [params, handleError]);

  const refetch = useCallback(() => fetchAnalytics(), [fetchAnalytics]);

  useEffect(() => {
    if (params?.autoFetch !== false) {
      fetchAnalytics();
    }
  }, [params?.autoFetch, fetchAnalytics]);

  return {
    analytics,
    loading,
    error,
    refetch,
  };
};

// ========================================================================
// LIFECYCLE MANAGEMENT HOOKS
// ========================================================================

/**
 * Hook for license lifecycle operations
 */
export const useLicenseLifecycle = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { handleError } = useErrorHandler();
  const { showToast } = useToast();

  const renewLicense = useCallback(async (
    licenseId: string,
    options: {
      newExpirationDate?: string;
      extensionDays?: number;
      reason?: string;
    }
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await licenseApi.renewLicense(licenseId, options);

      if (response.success) {
        showToast('License renewed successfully', 'success');
        return response.data.license;
      } else {
        throw new Error(response.message || 'Failed to renew license');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to renew license';
      setError(errorMessage);
      handleError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [handleError, showToast]);

  const expireLicense = useCallback(async (
    licenseId: string,
    reason?: string
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await licenseApi.expireLicense(licenseId, { reason });

      if (response.success) {
        showToast('License expired successfully', 'success');
        return response.data.license;
      } else {
        throw new Error(response.message || 'Failed to expire license');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to expire license';
      setError(errorMessage);
      handleError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [handleError, showToast]);

  const reactivateLicense = useCallback(async (
    licenseId: string,
    reason?: string
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await licenseApi.reactivateLicense(licenseId, { reason });

      if (response.success) {
        showToast('License reactivated successfully', 'success');
        return response.data.license;
      } else {
        throw new Error(response.message || 'Failed to reactivate license');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to reactivate license';
      setError(errorMessage);
      handleError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [handleError, showToast]);

  const getLicensesRequiringAttention = useCallback(async (options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const response = await licenseApi.getLicensesRequiringAttention(options);
      return response.data;
    } catch (err: unknown) {
      // This endpoint may not be fully available
      logger.warn('Licenses requiring attention feature may not be available', { error: err });
      setError('Feature temporarily unavailable');
      return {
        expiringSoon: [],
        expired: [],
        suspended: [],
        total: 0
      };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    renewLicense,
    expireLicense,
    reactivateLicense,
    getLicensesRequiringAttention,
    loading,
    error,
  };
};

/**
 * Hook for license lifecycle status
 */
export const useLicenseLifecycleStatus = (licenseId?: string) => {
  const [lifecycleStatus, setLifecycleStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { handleError } = useErrorHandler();

  const fetchLifecycleStatus = useCallback(async (id?: string) => {
    const targetId = id || licenseId;
    if (!targetId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await licenseApi.getLifecycleStatus(targetId);

      if (response.success) {
        setLifecycleStatus(response.data);
      } else {
        throw new Error(response.message || 'Failed to fetch lifecycle status');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch lifecycle status';
      setError(errorMessage);
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, [licenseId, handleError]);

  useEffect(() => {
    if (licenseId) {
      fetchLifecycleStatus();
    }
  }, [licenseId, fetchLifecycleStatus]);

  return {
    lifecycleStatus,
    loading,
    error,
    refetch: () => fetchLifecycleStatus(),
  };
};

// ========================================================================
// BULK OPERATIONS HOOKS
// ========================================================================

/**
 * Hook for bulk license operations
 */
export const useBulkLicenseOperations = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { handleError } = useErrorHandler();
  const { showToast } = useToast();

  const bulkUpdate = useCallback(async (updates: {
    identifiers: {
      appids?: string[];
      emails?: string[];
      countids?: number[];
    };
    updates: Record<string, any>;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const response = await licenseApi.bulkUpdateLicenses(updates);

      if (response.success) {
        showToast(`Successfully updated ${response.data.updated} licenses`, 'success');
        return response.data;
      } else {
        throw new Error(response.message || 'Bulk update failed');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Bulk update failed';
      setError(errorMessage);
      handleError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [handleError, showToast]);

  const bulkDelete = useCallback(async (identifiers: {
    appids?: string[];
    emails?: string[];
    countids?: number[];
  }) => {
    setLoading(true);
    setError(null);

    try {
      const response = await licenseApi.bulkDeleteLicenses(identifiers);

      if (response.success) {
        showToast(`Successfully deleted ${response.data.deleted} licenses`, 'success');
        return response.data;
      } else {
        throw new Error(response.message || 'Bulk delete failed');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Bulk delete failed';
      setError(errorMessage);
      handleError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [handleError, showToast]);

  const bulkCreate = useCallback(async (licenses: Array<Partial<LicenseRecord>>) => {
    setLoading(true);
    setError(null);

    try {
      const response = await licenseApi.bulkCreateLicenses(licenses);

      if (response.success) {
        showToast(`Successfully created ${response.data.created} licenses`, 'success');
        return response.data;
      } else {
        throw new Error(response.message || 'Bulk create failed');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Bulk create failed';
      setError(errorMessage);
      handleError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [handleError, showToast]);

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
 * Hook for SMS payment management
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
  const [payments, setPayments] = useState<any[]>([]);
  const [totals, setTotals] = useState<any>(null);
  const [pagination, setPagination] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { handleError } = useErrorHandler();
  const { showToast } = useToast();

  const fetchPayments = useCallback(async (overrideParams?: typeof params) => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = {
        appid: overrideParams?.appid || params?.appid,
        emailLicense: overrideParams?.emailLicense || params?.emailLicense,
        countid: overrideParams?.countid || params?.countid,
        startDate: overrideParams?.startDate || params?.startDate,
        endDate: overrideParams?.endDate || params?.endDate,
        page: overrideParams?.page || params?.page || 1,
        limit: overrideParams?.limit || params?.limit || 20,
        sortBy: overrideParams?.sortBy || params?.sortBy,
        sortOrder: overrideParams?.sortOrder || params?.sortOrder,
      };

      const response = await licenseApi.getSmsPayments(queryParams);

      if (response.success) {
        setPayments(response.data.payments);
        setTotals(response.data.totals);
        setPagination(response.data.pagination);
      } else {
        throw new Error(response.message || 'Failed to fetch SMS payments');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch SMS payments';
      setError(errorMessage);
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, [params, handleError]);

  const addPayment = useCallback(async (paymentData: {
    appid?: string;
    emailLicense?: string;
    countid?: number;
    amount: number;
    paymentDate?: string;
    description?: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const response = await licenseApi.addSmsPayment(paymentData);

      if (response.success) {
        showToast('SMS payment added successfully', 'success');
        // Refetch payments to show the new payment
        fetchPayments();
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to add SMS payment');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to add SMS payment';
      setError(errorMessage);
      handleError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [handleError, showToast, fetchPayments]);

  useEffect(() => {
    if (params?.autoFetch !== false) {
      fetchPayments();
    }
  }, [params?.autoFetch, fetchPayments]);

  return {
    payments,
    totals,
    pagination,
    loading,
    error,
    refetch: fetchPayments,
    addPayment,
  };
};