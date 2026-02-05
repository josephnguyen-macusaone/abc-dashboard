import { httpClient } from '@/infrastructure/api/client';
import type { LicenseRecord } from '@/types';
import logger from '@/shared/helpers/logger';
import { LicenseApiService } from './external';
import { InternalLicenseApiService } from './internal';
import { SmsPaymentApiService } from './sms-payments';
import type {
  GetLicensesParams,
  InternalLicenseUpdatePayload,
  InternalLicenseListResponse,
  InternalLicenseRow,
  LicenseListMeta,
  LicenseSyncStatusResponse,
  BulkCreateResponse,
  BulkUpdateResponse,
  BulkDeleteResponse,
} from './types';
import { transformApiLicenseToRecord } from './transforms';

const log = logger.createChild({ component: 'LicenseApi-Unified' });

/**
 * Unified License API - Primary interface for all license operations.
 * Provides both external and internal API access with consistent error handling.
 * Uses internal API first with fallback to external API.
 */
export class UnifiedLicenseApi {
  // ========================================================================
  // LICENSE CRUD OPERATIONS
  // ========================================================================

  /**
   * Get licenses with pagination and filtering
   */
  static async getLicenses(params: GetLicensesParams = {}): Promise<{
    licenses: LicenseRecord[];
    pagination: LicenseListMeta;
  }> {
    try {
      // Use internal API for full functionality
      const response: InternalLicenseListResponse = await InternalLicenseApiService.getLicenses(params);

      const licenses = (response.data ?? []).map(transformApiLicenseToRecord);
      return {
        licenses,
        pagination: response.meta ?? {
          page: params.page || 1,
          limit: params.limit || 20,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        }
      };
    } catch (error) {
      // Fallback to external API if internal fails
      log.warn('Internal license API failed, falling back to external API', { error });
      return await LicenseApiService.getLicenses(params);
    }
  }

  /**
   * Get single license by ID
   */
  static async getLicense(id: string) {
    try {
      return await InternalLicenseApiService.getLicense(id);
    } catch (error) {
      // Fallback to external API
      log.warn('Internal license API failed, falling back to external API', { error });
      return await LicenseApiService.getLicense(id);
    }
  }

  /**
   * Create new license
   */
  static async createLicense(licenseData: Partial<LicenseRecord>) {
    try {
      return await InternalLicenseApiService.createLicense(licenseData);
    } catch (error) {
      // Fallback to external API
      log.warn('Internal license API failed, falling back to external API', { error });
      return await LicenseApiService.createLicense(licenseData);
    }
  }

  /**
   * Update license
   */
  static async updateLicense(id: string, updates: Partial<LicenseRecord>) {
    try {
      return await InternalLicenseApiService.updateLicense(id, updates);
    } catch (error) {
      // Fallback to external API
      log.warn('Internal license API failed, falling back to external API', { error });
      return await LicenseApiService.updateLicense(id, updates);
    }
  }

  /**
   * Delete license (soft delete)
   */
  static async deleteLicense(id: string) {
    try {
      return await InternalLicenseApiService.deleteLicense(id);
    } catch (error) {
      // Fallback to external API
      log.warn('Internal license API failed, falling back to external API', { error });
      return await LicenseApiService.deleteLicense(id);
    }
  }

  // ========================================================================
  // BULK OPERATIONS
  // ========================================================================

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
    return await InternalLicenseApiService.bulkUpdateLicenses(updates);
  }

  /**
   * Bulk update internal licenses (by IDs)
   */
  static async bulkUpdateInternalLicenses(updates: Array<Partial<LicenseRecord> & { id: number | string }>): Promise<LicenseRecord[]> {
    // Send the array directly to the internal bulk update endpoint
    const response = await httpClient.patch<InternalLicenseRow[] | { data: InternalLicenseRow[] }>('/licenses/bulk', updates);

    // Extract results from the response - backend returns array directly
    const results = Array.isArray(response) ? response : (response.data || []);
    return results as unknown as LicenseRecord[];
  }

  /**
   * Bulk create licenses
   */
  static async bulkCreateLicenses(licenses: Array<Partial<LicenseRecord>>): Promise<BulkCreateResponse> {
    return await InternalLicenseApiService.bulkCreateLicenses(licenses);
  }

  /**
   * Bulk delete licenses
   */
  static async bulkDeleteLicenses(identifiers: {
    appids?: string[];
    emails?: string[];
    countids?: number[];
  }): Promise<BulkDeleteResponse> {
    return await InternalLicenseApiService.bulkDeleteLicenses(identifiers);
  }

  // ========================================================================
  // ADVANCED OPERATIONS
  // ========================================================================

  /**
   * Get license by email
   */
  static async getLicenseByEmail(email: string) {
    return await InternalLicenseApiService.getLicenseByEmail(email);
  }

  /**
   * Update license by email
   */
  static async updateLicenseByEmail(email: string, updates: InternalLicenseUpdatePayload) {
    return await InternalLicenseApiService.updateLicenseByEmail(email, updates);
  }

  /**
   * Delete license by email
   */
  static async deleteLicenseByEmail(email: string) {
    return await InternalLicenseApiService.deleteLicenseByEmail(email);
  }

  /**
   * Get license by count ID
   */
  static async getLicenseByCountId(countId: number) {
    return await InternalLicenseApiService.getLicenseByCountId(countId);
  }

  /**
   * Update license by count ID
   */
  static async updateLicenseByCountId(countId: number, updates: InternalLicenseUpdatePayload) {
    return await InternalLicenseApiService.updateLicenseByCountId(countId, updates);
  }

  /**
   * Delete license by count ID
   */
  static async deleteLicenseByCountId(countId: number) {
    return await InternalLicenseApiService.deleteLicenseByCountId(countId);
  }

  /**
   * Reset license (set ID to null)
   */
  static async resetLicense(identifiers: {
    appid?: string;
    email?: string;
  }) {
    return await InternalLicenseApiService.resetLicense(identifiers);
  }

  /**
   * Add row license (create single license for grid)
   */
  static async addRowLicense(licenseData: Partial<LicenseRecord>) {
    return await InternalLicenseApiService.addRowLicense(licenseData);
  }

  // ========================================================================
  // DASHBOARD & ANALYTICS
  // ========================================================================

  /**
   * Get dashboard metrics
   */
  static async getDashboardMetrics(params?: {
    startsAtFrom?: string;
    startsAtTo?: string;
  }) {
    return await LicenseApiService.getDashboardMetrics(params);
  }

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
  } = {}) {
    return await InternalLicenseApiService.getLicenseAnalytics(params);
  }

  // ========================================================================
  // LIFECYCLE MANAGEMENT
  // ========================================================================

  /**
   * Get license lifecycle status
   */
  static async getLifecycleStatus(licenseId: string) {
    return await InternalLicenseApiService.getLifecycleStatus(licenseId);
  }

  /**
   * Renew license
   */
  static async renewLicense(licenseId: string, renewalOptions: {
    newExpirationDate?: string;
    extensionDays?: number;
    reason?: string;
  }) {
    return await InternalLicenseApiService.renewLicense(licenseId, renewalOptions);
  }

  /**
   * Get renewal preview
   */
  static async getRenewalPreview(licenseId: string, renewalOptions: {
    extensionDays?: number;
  }) {
    return await InternalLicenseApiService.getRenewalPreview(licenseId, renewalOptions);
  }

  /**
   * Extend license expiration
   */
  static async extendLicense(licenseId: string, extensionOptions: {
    extensionDays?: number;
    reason?: string;
  }) {
    return await InternalLicenseApiService.extendLicense(licenseId, extensionOptions);
  }

  /**
   * Expire license manually
   */
  static async expireLicense(licenseId: string, expirationOptions: {
    reason?: string;
  }) {
    return await InternalLicenseApiService.expireLicense(licenseId, expirationOptions);
  }

  /**
   * Get expiration preview
   */
  static async getExpirationPreview(licenseId: string) {
    return await InternalLicenseApiService.getExpirationPreview(licenseId);
  }

  /**
   * Reactivate suspended license
   */
  static async reactivateLicense(licenseId: string, reactivationOptions: {
    reason?: string;
  }) {
    return await InternalLicenseApiService.reactivateLicense(licenseId, reactivationOptions);
  }

  /**
   * Get licenses requiring attention
   */
  static async getLicensesRequiringAttention(options: {
    includeExpiringSoon?: boolean;
    includeExpired?: boolean;
    includeSuspended?: boolean;
    daysThreshold?: number;
  } = {}) {
    try {
      return await InternalLicenseApiService.getLicensesRequiringAttention(options);
    } catch (error) {
      // Note: This endpoint may have routing issues - return empty result
      log.warn('getLicensesRequiringAttention not available', { error });
      return {
        success: true,
        message: 'Feature temporarily unavailable',
        data: {
          expiringSoon: [],
          expired: [],
          suspended: [],
          total: 0
        }
      };
    }
  }

  /**
   * Bulk renew licenses
   */
  static async bulkRenewLicenses(renewalData: {
    licenseIds: string[];
    extensionDays?: number;
    reason?: string;
  }) {
    return await InternalLicenseApiService.bulkRenewLicenses(renewalData);
  }

  /**
   * Bulk expire licenses
   */
  static async bulkExpireLicenses(expirationData: {
    licenseIds: string[];
    reason?: string;
  }) {
    return await InternalLicenseApiService.bulkExpireLicenses(expirationData);
  }

  /**
   * Process lifecycle operations manually
   */
  static async processLifecycle(operation: 'expiring_reminders' | 'expiration_checks') {
    return await InternalLicenseApiService.processLifecycle(operation);
  }

  /**
   * Get license sync scheduler status (last run, success/failure)
   */
  static async getLicenseSyncStatus(): Promise<LicenseSyncStatusResponse> {
    return await InternalLicenseApiService.getLicenseSyncStatus();
  }

  // ========================================================================
  // SMS PAYMENT MANAGEMENT
  // ========================================================================

  /**
   * Get SMS payments
   */
  static async getSmsPayments(params: {
    appid?: string;
    emailLicense?: string;
    countid?: number;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}) {
    return await SmsPaymentApiService.getSmsPayments(params);
  }

  /**
   * Add SMS payment
   */
  static async addSmsPayment(paymentData: {
    appid?: string;
    emailLicense?: string;
    countid?: number;
    amount: number;
    paymentDate?: string;
    description?: string;
  }) {
    return await SmsPaymentApiService.addSmsPayment(paymentData);
  }
}
