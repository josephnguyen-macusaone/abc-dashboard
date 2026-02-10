import { httpClient } from '@/infrastructure/api/client';
import type {
  InternalLicenseListResponse,
  LicenseSyncStatusResponse,
  InternalLicenseRow,
  GetLicensesParams,
  InternalLicenseUpdatePayload,
  LicenseGetResponse,
  BulkUpdateResponse,
  BulkCreateResponse,
  BulkDeleteResponse,
  RenewalPreviewResponse,
  ExpirationPreviewResponse,
  BulkRenewResponse,
  BulkExpireResponse,
  LicensesRequiringAttentionResponse,
  LicenseAnalyticsResponse,
  DashboardMetricsAlertItem
} from './types';

/**
 * Internal License Management API Service.
 * Provides access to internal backend license CRUD operations.
 */
export class InternalLicenseApiService {
  /**
   * Get licenses with pagination and filtering
   */
  static async getLicenses(params: GetLicensesParams = {}): Promise<InternalLicenseListResponse> {
    const queryParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });

    const url = `/licenses${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return httpClient.get(url);
  }

  /**
   * Get single license by ID
   */
  static async getLicense(id: string): Promise<LicenseGetResponse> {
    return httpClient.get(`/licenses/${id}`);
  }

  /**
   * Create new license
   */
  static async createLicense(licenseData: InternalLicenseUpdatePayload): Promise<LicenseGetResponse> {
    return httpClient.post('/licenses', licenseData);
  }

  /**
   * Update license
   */
  static async updateLicense(id: string, updates: InternalLicenseUpdatePayload): Promise<LicenseGetResponse> {
    return httpClient.put(`/licenses/${id}`, updates);
  }

  /**
   * Delete license (soft delete)
   */
  static async deleteLicense(id: string): Promise<{
    success: boolean;
    message: string;
  }> {
    return httpClient.delete(`/licenses/${id}`);
  }

  /**
   * Bulk update licenses
   */
  static async bulkUpdateLicenses(updates: {
    identifiers: {
      appids?: string[];
      emails?: string[];
      countids?: number[];
    };
    updates: InternalLicenseUpdatePayload;
  }): Promise<BulkUpdateResponse> {
    return httpClient.patch('/licenses/bulk', updates);
  }

  /**
   * Bulk create licenses
   */
  static async bulkCreateLicenses(licenses: InternalLicenseUpdatePayload[]): Promise<BulkCreateResponse> {
    return httpClient.post('/licenses/bulk', licenses);
  }

  /**
   * Bulk delete licenses
   */
  static async bulkDeleteLicenses(identifiers: {
    appids?: string[];
    emails?: string[];
    countids?: number[];
  }): Promise<BulkDeleteResponse> {
    return httpClient.delete('/licenses/bulk', { data: identifiers });
  }

  /**
   * Get license by email
   */
  static async getLicenseByEmail(email: string): Promise<LicenseGetResponse> {
    return httpClient.get(`/licenses/email/${encodeURIComponent(email)}`);
  }

  /**
   * Update license by email
   */
  static async updateLicenseByEmail(email: string, updates: InternalLicenseUpdatePayload): Promise<LicenseGetResponse> {
    return httpClient.put(`/licenses/email/${encodeURIComponent(email)}`, updates);
  }

  /**
   * Delete license by email
   */
  static async deleteLicenseByEmail(email: string): Promise<{
    success: boolean;
    message: string;
  }> {
    return httpClient.delete(`/licenses/email/${encodeURIComponent(email)}`);
  }

  /**
   * Get license by count ID
   */
  static async getLicenseByCountId(countId: number): Promise<LicenseGetResponse> {
    return httpClient.get(`/licenses/countid/${countId}`);
  }

  /**
   * Update license by count ID
   */
  static async updateLicenseByCountId(countId: number, updates: InternalLicenseUpdatePayload): Promise<LicenseGetResponse> {
    return httpClient.put(`/licenses/countid/${countId}`, updates);
  }

  /**
   * Delete license by count ID
   */
  static async deleteLicenseByCountId(countId: number): Promise<{
    success: boolean;
    message: string;
  }> {
    return httpClient.delete(`/licenses/countid/${countId}`);
  }

  /**
   * Reset license (set ID to null)
   */
  static async resetLicense(identifiers: {
    appid?: string;
    email?: string;
  }): Promise<{
    success: boolean;
    message: string;
  }> {
    return httpClient.post('/licenses/reset', identifiers);
  }

  /**
   * Add row license (create single license for grid)
   */
  static async addRowLicense(licenseData: InternalLicenseUpdatePayload): Promise<LicenseGetResponse> {
    return httpClient.post('/licenses/row', licenseData);
  }

  // ========================================================================
  // LICENSE LIFECYCLE MANAGEMENT API
  // ========================================================================

  /**
   * Get dashboard metrics. Pass search/filters so metrics reflect the same subset as the list (e.g. search by agent name).
   */
  static async getDashboardMetrics(params?: {
    startsAtFrom?: string;
    startsAtTo?: string;
    search?: string;
    searchField?: string;
    status?: string | string[];
    plan?: string | string[];
    term?: string | string[];
    dba?: string;
    zip?: string;
  }): Promise<{
    success: boolean;
    message: string;
    data: {
      metrics: {
        overview: {
          total: number;
          active: number;
          expired: number;
          expiringSoon: number;
        };
        utilization: {
          totalSeats: number;
          usedSeats: number;
          availableSeats: number;
          utilizationRate: number;
        };
        alerts: {
          expiringSoon: DashboardMetricsAlertItem[];
          lowSeats: DashboardMetricsAlertItem[];
        };
      };
    };
  }> {
    const queryParams = new URLSearchParams();

    if (params?.startsAtFrom) {
      queryParams.append('startsAtFrom', params.startsAtFrom);
    }
    if (params?.startsAtTo) {
      queryParams.append('startsAtTo', params.startsAtTo);
    }
    if (params?.search) {
      queryParams.append('search', params.search);
    }
    if (params?.searchField) {
      queryParams.append('searchField', params.searchField);
    }
    if (params?.status !== undefined && params?.status !== null) {
      queryParams.append(
        'status',
        Array.isArray(params.status) ? params.status.join(',') : String(params.status)
      );
    }
    if (params?.plan !== undefined && params?.plan !== null) {
      queryParams.append(
        'plan',
        Array.isArray(params.plan) ? params.plan.join(',') : String(params.plan)
      );
    }
    if (params?.term !== undefined && params?.term !== null) {
      queryParams.append(
        'term',
        Array.isArray(params.term) ? params.term.join(',') : String(params.term)
      );
    }
    if (params?.dba) {
      queryParams.append('dba', params.dba);
    }
    if (params?.zip) {
      queryParams.append('zip', params.zip);
    }

    const url = `/licenses/dashboard/metrics${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return httpClient.get(url);
  }

  /**
   * Get license lifecycle status
   */
  static async getLifecycleStatus(licenseId: string): Promise<{
    success: boolean;
    message: string;
    data: {
      licenseId: string;
      status: string;
      expiresAt: string;
      isExpired: boolean;
      isExpiringSoon: boolean;
      daysUntilExpiry: number;
      gracePeriodDays: number;
      autoSuspendEnabled: boolean;
      renewalRemindersSent: string[];
      lastRenewalReminder: string | null;
    };
  }> {
    return httpClient.get(`/licenses/${licenseId}/lifecycle-status`);
  }

  /**
   * Renew license
   */
  static async renewLicense(licenseId: string, renewalOptions: {
    newExpirationDate?: string;
    extensionDays?: number;
    reason?: string;
  }): Promise<LicenseGetResponse> {
    return httpClient.post(`/licenses/${licenseId}/renew`, renewalOptions);
  }

  /**
   * Get renewal preview
   */
  static async getRenewalPreview(licenseId: string, renewalOptions: {
    extensionDays?: number;
  }): Promise<RenewalPreviewResponse> {
    const queryParams = new URLSearchParams();
    if (renewalOptions.extensionDays) {
      queryParams.append('extensionDays', String(renewalOptions.extensionDays));
    }

    const url = `/licenses/${licenseId}/renew-preview${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return httpClient.get(url);
  }

  /**
   * Extend license expiration
   */
  static async extendLicense(licenseId: string, extensionOptions: {
    extensionDays?: number;
    reason?: string;
  }): Promise<LicenseGetResponse> {
    return httpClient.post(`/licenses/${licenseId}/extend`, extensionOptions);
  }

  /**
   * Expire license manually
   */
  static async expireLicense(licenseId: string, expirationOptions: {
    reason?: string;
  }): Promise<LicenseGetResponse> {
    return httpClient.post(`/licenses/${licenseId}/expire`, expirationOptions);
  }

  /**
   * Get expiration preview
   */
  static async getExpirationPreview(licenseId: string): Promise<ExpirationPreviewResponse> {
    return httpClient.get(`/licenses/${licenseId}/expire-preview`);
  }

  /**
   * Reactivate suspended license
   */
  static async reactivateLicense(licenseId: string, reactivationOptions: {
    reason?: string;
  }): Promise<LicenseGetResponse> {
    return httpClient.post(`/licenses/${licenseId}/reactivate`, reactivationOptions);
  }

  /**
   * Get licenses requiring attention
   */
  static async getLicensesRequiringAttention(options: {
    includeExpiringSoon?: boolean;
    includeExpired?: boolean;
    includeSuspended?: boolean;
    daysThreshold?: number;
  } = {}): Promise<{
    success: boolean;
    message: string;
    data: LicensesRequiringAttentionResponse;
  }> {
    const queryParams = new URLSearchParams();

    if (options.includeExpiringSoon !== undefined) {
      queryParams.append('includeExpiringSoon', String(options.includeExpiringSoon));
    }
    if (options.includeExpired !== undefined) {
      queryParams.append('includeExpired', String(options.includeExpired));
    }
    if (options.includeSuspended !== undefined) {
      queryParams.append('includeSuspended', String(options.includeSuspended));
    }
    if (options.daysThreshold !== undefined) {
      queryParams.append('daysThreshold', String(options.daysThreshold));
    }

    const url = `/licenses/attention${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return httpClient.get(url);
  }

  /**
   * Bulk renew licenses
   */
  static async bulkRenewLicenses(renewalData: {
    licenseIds: string[];
    extensionDays?: number;
    reason?: string;
  }): Promise<BulkRenewResponse> {
    return httpClient.post('/licenses/lifecycle/bulk-renew', renewalData);
  }

  /**
   * Bulk expire licenses
   */
  static async bulkExpireLicenses(expirationData: {
    licenseIds: string[];
    reason?: string;
  }): Promise<BulkExpireResponse> {
    return httpClient.post('/licenses/lifecycle/bulk-expire', expirationData);
  }

  /**
   * Process lifecycle operations manually
   */
  /**
   * Get license sync scheduler status (last run, success/failure)
   */
  static async getLicenseSyncStatus(): Promise<LicenseSyncStatusResponse> {
    const response = await httpClient.get<{ success: boolean; message?: string; data: LicenseSyncStatusResponse }>('/licenses/sync/status');
    const body = response as { data?: LicenseSyncStatusResponse };
    return body?.data ?? (response as unknown as LicenseSyncStatusResponse);
  }

  /**
   * Process lifecycle operations manually
   */
  static async processLifecycle(operation: 'expiring_reminders' | 'expiration_checks'): Promise<{
    success: boolean;
    message: string;
    data: {
      operation: string;
      processed: number;
      timestamp: string;
    };
  }> {
    return httpClient.post('/licenses/lifecycle/process', { operation });
  }

  // ========================================================================
  // ANALYTICS & REPORTING API
  // ========================================================================

  /**
   * Get license analytics with date filtering
   */
  static async getLicenseAnalytics(params: {
    month?: number;
    year?: number;
    startDate?: string;
    endDate?: string;
    status?: string;
    license_type?: string;
  } = {}): Promise<LicenseAnalyticsResponse> {
    const queryParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });

    const url = `/licenses/license-analytic${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return httpClient.get(url);
  }
}
