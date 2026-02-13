import { httpClient } from '@/infrastructure/api/client';
import type { DashboardMetricsResponse } from '@/infrastructure/api/types';
import type { LicenseRecord } from '@/types';
import type { LicenseBulkResponse } from '@/application/services/license-services';
import logger from '@/shared/helpers/logger';
import type {
  ApiLicenseRaw,
  ApiLicensePayload,
  GetLicensesParams,
  LicensesListApiResponse,
  BulkUpdateApiResponse,
} from '@/infrastructure/api/licenses-types';
import { extractApiLicenseFromResponse, extractBulkUpdateResults } from '@/infrastructure/api/licenses-types';

const log = logger.createChild({ component: 'LicenseApi' });

/** Response from GET /licenses/sync/status (scheduler status and last run) */
export interface LicenseSyncStatusResponse {
  enabled?: boolean;
  running?: boolean;
  syncInProgress?: boolean;
  timezone?: string;
  schedule?: string;
  lastSyncResult?: {
    timestamp?: string;
    duration?: number;
    success?: boolean;
    totalFetched?: number;
    created?: number;
    updated?: number;
    failed?: number;
    error?: string;
  };
  statistics?: {
    totalRuns?: number;
    successfulRuns?: number;
    failedRuns?: number;
    avgDuration?: number;
    successRate?: string;
  };
}

/**
 * Transform backend license data to frontend LicenseRecord.
 * Handles both external (ActivateDate, monthlyFee, license_type, status as number)
 * and internal (startDay, lastPayment, plan, status as string) API shapes.
 */
function transformApiLicenseToRecord(apiLicense: ApiLicenseRaw): LicenseRecord {
  // Status: active | cancel only
  let status: LicenseRecord['status'] = 'active';
  if (apiLicense.status !== undefined && apiLicense.status !== null) {
    const s = apiLicense.status;
    if (typeof s === 'string' && ['active', 'cancel'].includes(s)) {
      status = s as LicenseRecord['status'];
    } else {
      const statusValue = typeof s === 'string' ? parseInt(s, 10) : s;
      switch (statusValue) {
        case 1:
          status = 'active';
          break;
        case 0:
          status = 'cancel';
          break;
        default:
          status = 'active';
      }
    }
  }

  // Convert date formats from MM/DD/YYYY to YYYY-MM-DD
  const convertDate = (dateStr: string | null): string => {
    if (!dateStr) return '';
    // Handle MM/DD/YYYY format
    if (dateStr.includes('/')) {
      const [month, day, year] = dateStr.split('/');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return dateStr;
  };

  // Convert datetime formats from MM/DD/YYYY HH:MM to YYYY-MM-DDTHH:MM
  const convertDateTime = (dateTimeStr: string | null): string => {
    if (!dateTimeStr) return '';
    // Handle "MM/DD/YYYY HH:MM" format
    if (dateTimeStr.includes('/')) {
      const [datePart, timePart] = dateTimeStr.split(' ');
      const [month, day, year] = datePart.split('/');
      const dateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      return `${dateStr}T${timePart}:00`;
    }
    return dateTimeStr;
  };

  // startsAt: external uses ActivateDate; internal uses startDay
  const startsAtRaw = apiLicense.ActivateDate ?? apiLicense.startDay ?? apiLicense.startsAt ?? '';
  const startsAt = startsAtRaw.includes('/') ? convertDate(startsAtRaw) : (startsAtRaw || '');

  // plan: derive from Package or package_data (basic, print_check, staff_performance, sms_package_6000) - empty when nothing
  const pkg = (apiLicense.Package ?? (apiLicense as Record<string, unknown>).package_data) as Record<string, unknown> | undefined;
  const planModules: string[] = [];
  if (pkg?.basic) planModules.push('Basic');
  if (pkg?.print_check) planModules.push('Print Check');
  if (pkg?.staff_performance) planModules.push('Staff Performance');
  if (pkg?.sms_package_6000) planModules.push('Unlimited SMS');
  const plan = planModules.length > 0 ? planModules.join(', ') : (apiLicense.plan ?? apiLicense.license_type ?? '');

  // Prefer UUID as id when present (internal API); otherwise use appid/key so grid can resolve
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const idFromApi = apiLicense.id != null ? String(apiLicense.id) : '';
  const id = uuidRegex.test(idFromApi) ? idFromApi : (apiLicense.appid ?? apiLicense.id ?? `temp-${Date.now()}`);

  return {
    id: id as LicenseRecord['id'],
    key: (apiLicense.appid ?? apiLicense.key ?? (typeof id === 'string' && !uuidRegex.test(id) ? id : '')) as string,
    product: (apiLicense.product ?? 'ABC Business Suite') as string,
    dba: apiLicense.dba ?? '',
    zip: apiLicense.zip ?? '',
    startsAt,
    status,
    plan,
    Package: pkg && typeof pkg === 'object' ? pkg : undefined,
    term: (apiLicense.term ?? 'monthly') as LicenseRecord['term'],
    cancelDate: apiLicense.cancelDate ?? '',
    lastPayment: Number(apiLicense.monthlyFee ?? apiLicense.lastPayment ?? 0),
    lastActive: apiLicense.lastActive?.includes?.('/') ? convertDateTime(apiLicense.lastActive) : (apiLicense.lastActive ?? ''),
    smsPurchased: Number(apiLicense.smsPurchased ?? 0),
    smsSent: Number(apiLicense.smsSent ?? 0),
    smsBalance: Number(apiLicense.smsBalance ?? 0),
    seatsTotal: Number(apiLicense.seatsTotal ?? 1),
    seatsUsed: Number(apiLicense.seatsUsed ?? 0),
    agents: Number(apiLicense.agents ?? 0),
    agentsName: typeof apiLicense.agentsName === 'string' ? apiLicense.agentsName : '',
    agentsCost: Number(apiLicense.agentsCost ?? 0),
    notes: apiLicense.Note ?? apiLicense.notes ?? '',
  };
}

/**
 * Transform frontend LicenseRecord to backend API format
 * Filters out undefined, null, and empty values to ensure clean API payloads
 */
function transformRecordToApiLicense(license: Partial<LicenseRecord>): ApiLicensePayload {
  const apiLicense: ApiLicensePayload = {};

  const shouldInclude = (value: unknown): boolean =>
    value !== undefined && value !== null && value !== '';

  if (shouldInclude(license.key) || shouldInclude(license.id)) {
    apiLicense.appid = String(license.key ?? license.id ?? '');
  }

  if (shouldInclude(license.id)) {
    apiLicense.appid = String(license.id);
  }

  // Map frontend fields to external API fields
  if (shouldInclude(license.dba)) {
    apiLicense.dba = license.dba;
  }

  if (shouldInclude(license.zip)) {
    apiLicense.zip = license.zip;
  }

  if (shouldInclude(license.id)) {
    apiLicense.appid = String(license.id);
  }

  // For external API, we need Email_license and pass as required fields
  // Generate dummy values if not provided (this is for compatibility)
  apiLicense.emailLicense = `license-${apiLicense.appid || Date.now()}@example.com`;
  apiLicense.pass = `pass-${apiLicense.appid || Date.now()}`;

  if (shouldInclude(license.status)) {
    // Convert string status to integer for external API
    switch (license.status) {
      case 'active':
        apiLicense.status = 1;
        break;
      case 'cancel': // Changed from 'inactive' to 'cancel' (valid LicenseStatus)
        apiLicense.status = 0;
        break;
      default:
        apiLicense.status = 1; // Default to active
    }
  }

  if (license.lastPayment !== undefined && license.lastPayment !== null) {
    apiLicense.monthlyFee = license.lastPayment; // External API uses monthlyFee
  }

  if (shouldInclude(license.startsAt)) {
    apiLicense.ActivateDate = license.startsAt; // External API uses ActivateDate for start date
  }

  if (shouldInclude(license.notes)) {
    apiLicense.Note = license.notes; // External API uses Note
  }

  // Package from plan (comma-separated) or license.Package
  const planStr = license.plan;
  const pkg = license.Package as Record<string, unknown> | undefined;
  if (pkg && typeof pkg === 'object') {
    apiLicense.Package = pkg;
  } else if (typeof planStr === 'string' && planStr.trim()) {
    const labels = planStr.split(',').map((s) => s.trim()).filter(Boolean);
    apiLicense.Package = {
      basic: labels.includes('Basic'),
      print_check: labels.includes('Print Check'),
      staff_performance: labels.includes('Staff Performance'),
      sms_package_6000: labels.includes('Unlimited SMS'),
    };
  }

  return apiLicense;
}

/**
 * License Management API service
 */
export class LicenseApiService {
  /**
   * Get dashboard metrics with optional date range and filter (search, status, plan, term).
   * When filters are provided, metrics reflect the filtered subset; when empty, metrics show totals.
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
  }): Promise<DashboardMetricsResponse> {
    try {
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
        const statusVal = Array.isArray(params.status) ? params.status.join(',') : String(params.status);
        if (statusVal) queryParams.append('status', statusVal);
      }
      if (params?.plan !== undefined && params?.plan !== null) {
        const planVal = Array.isArray(params.plan) ? params.plan.join(',') : String(params.plan);
        if (planVal) queryParams.append('plan', planVal);
      }
      if (params?.term !== undefined && params?.term !== null) {
        const termVal = Array.isArray(params.term) ? params.term.join(',') : String(params.term);
        if (termVal) queryParams.append('term', termVal);
      }
      if (params?.dba) {
        queryParams.append('dba', params.dba);
      }
      if (params?.zip) {
        queryParams.append('zip', params.zip);
      }

      const url = `/licenses/dashboard/metrics${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await httpClient.get<DashboardMetricsResponse>(url);

      if (!response.success || !response.data) {
        throw new Error('Dashboard metrics response missing data');
      }

      return response;
    } catch (error) {
      throw error;
    }
  }
  /**
   * Get licenses with pagination and filtering
   */
  static async getLicenses(params: GetLicensesParams = {}): Promise<{
    licenses: LicenseRecord[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    try {
      const queryParams = new URLSearchParams();

      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            queryParams.append(key, value.join(','));
          } else {
            queryParams.append(key, String(value));
          }
        }
      });

      const url = `/licenses${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await httpClient.get<LicensesListApiResponse>(url);

      if (!response.success || !response.data) {
        throw new Error('Get licenses response missing data');
      }

      const licenses = response.data.map(transformApiLicenseToRecord);

      const apiMeta = response.meta || {
        page: params.page || 1,
        limit: params.limit || 20,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false
      };

      return {
        licenses,
        pagination: {
          page: apiMeta.page,
          limit: apiMeta.limit,
          total: apiMeta.total,
          totalPages: apiMeta.totalPages,
          hasNext: apiMeta.hasNext,
          hasPrev: apiMeta.hasPrev
        }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get single license by ID
   */
  static async getLicense(id: number | string): Promise<LicenseRecord> {
    try {
      const response = await httpClient.get<{ data?: { license?: ApiLicenseRaw } | ApiLicenseRaw }>(`/external-licenses/${String(id)}`);
      const apiLicense = extractApiLicenseFromResponse(response);
      if (!apiLicense) throw new Error('Get license response missing data');
      return transformApiLicenseToRecord(apiLicense);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create a new license
   */
  static async createLicense(licenseData: Partial<LicenseRecord>): Promise<LicenseRecord> {
    try {
      const apiData = transformRecordToApiLicense(licenseData);

      // Validate required fields for external API
      if (!apiData.appid || apiData.appid.trim() === '') {
        throw new Error('License ID/App ID is required and cannot be empty');
      }
      if (!apiData.emailLicense || apiData.emailLicense.trim() === '') {
        throw new Error('Email license is required and cannot be empty');
      }
      if (!apiData.pass || apiData.pass.trim() === '') {
        throw new Error('Password is required and cannot be empty');
      }

      const response = await httpClient.post<{ data?: { license?: ApiLicenseRaw } | ApiLicenseRaw }>('/external-licenses', apiData);
      const apiLicense = extractApiLicenseFromResponse(response);
      if (!apiLicense) throw new Error('Create license response missing data');
      return transformApiLicenseToRecord(apiLicense);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update license by ID
   */
  static async updateLicense(id: number | string, updates: Partial<LicenseRecord>): Promise<LicenseRecord> {
    try {
      const apiData = transformRecordToApiLicense(updates);
      // Backend expects ID in both URL and request body
      apiData.id = String(id);
      const response = await httpClient.put<{ data?: { license?: ApiLicenseRaw } | ApiLicenseRaw }>(`/external-licenses/${String(id)}`, apiData);
      const apiLicense = extractApiLicenseFromResponse(response);
      if (!apiLicense) throw new Error('Update license response missing data');
      return transformApiLicenseToRecord(apiLicense);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete license by ID
   */
  static async deleteLicense(id: number | string): Promise<{ message: string }> {
    try {
      // Backend expects string ID (UUID)
      const response = await httpClient.delete<{ data?: { message?: string } }>(`/external-licenses/${String(id)}`);
      return { message: response?.data?.message ?? 'License deleted successfully' };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Bulk create licenses
   */
  static async bulkCreateLicenses(licenses: Array<Partial<LicenseRecord>>): Promise<LicenseRecord[]> {
    try {
      const validLicenses = licenses.filter(license => {
        if (!license.id || String(license.id).trim() === '') {
          return false;
        }
        return true;
      });

      if (validLicenses.length === 0) {
        throw new Error('No valid licenses to create');
      }

      const apiLicenses = validLicenses.map(license => transformRecordToApiLicense(license));

      // External API expects individual license creation, not bulk
      const results = [];
      for (const apiLicense of apiLicenses) {
        try {
          const response = await httpClient.post<{ data?: ApiLicenseRaw }>('/external-licenses', apiLicense);
          if (response?.data) results.push(response.data);
        } catch (error) {
          // Log error but continue with other licenses
          log.error('Failed to create license', { apiLicense, error });
        }
      }
      const response = { data: { licenses: results } };

      const createdLicenses = response.data?.licenses || [];
      return createdLicenses.map(transformApiLicenseToRecord);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Bulk update licenses
   */
  static async bulkUpdateLicenses(updates: Array<Partial<LicenseRecord> & { id: number | string }>): Promise<LicenseRecord[]> {
    try {
      // Transform each update to API format
      const apiUpdates = updates.map((update) => {
        const apiData = transformRecordToApiLicense(update);

        const result = {
          id: String(update.id),
          updates: apiData
        };

        return result;
      });

      // Filter out updates that only have an id (no actual changes)
      const validUpdates = apiUpdates.filter(update => Object.keys(update.updates).length > 0);

      if (validUpdates.length === 0) {
        return [];
      }

      // External API expects individual license updates, not bulk
      const results = [];
      for (const update of validUpdates) {
        try {
          const response = await httpClient.put<{ data?: ApiLicenseRaw }>(`/external-licenses/${update.id}`, update.updates);
          if (response?.data) results.push(response.data);
        } catch (error) {
          // Log error but continue with other updates
          log.error('Failed to update license', { id: update.id, error });
        }
      }
      const response = { data: results };
      const apiLicenses = Array.isArray(response.data) ? response.data : [];

      return apiLicenses.map(transformApiLicenseToRecord);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Bulk update internal licenses
   */
  static async bulkUpdateInternalLicenses(updates: Array<Partial<LicenseRecord> & { id: number | string }>): Promise<LicenseRecord[]> {
    try {
      const response = await httpClient.patch<BulkUpdateApiResponse>('/licenses/bulk', updates);

      const results = extractBulkUpdateResults(response as unknown);
      if (results.length > 0) {
        log.debug('Bulk update API returning transformed results', { count: results.length });
        return results.map(transformApiLicenseToRecord);
      }
      log.warn('Unexpected bulk update response format', { data: (response as { data?: unknown }).data });
      return [];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Bulk delete licenses
   */
  static async bulkDeleteLicenses(ids: (number | string)[]): Promise<{ deleted: number; notFound: number[] }> {
    try {
      // Backend expects string IDs (UUIDs)
      const stringIds = ids.map(id => String(id));
      // External API expects individual license deletion, not bulk
      let deletedCount = 0;
      const notFound: number[] = [];

      for (let index = 0; index < stringIds.length; index++) {
        const id = stringIds[index];
        try {
          await httpClient.delete<any>(`/external-licenses/${id}`);
          deletedCount++;
        } catch (error) {
          if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
            notFound.push(index); // Push the index of the failed deletion
          } else {
            log.error('Failed to delete license', { id, error });
          }
        }
      }

      return { deleted: deletedCount, notFound };
    } catch (error) {
      throw error;
    }
  }
}

// ========================================================================
// INTERNAL LICENSE MANAGEMENT API (Backend CRUD Operations)
// ========================================================================

/**
 * Internal License Management API Service
 * Provides access to backend license CRUD operations
 */
export class InternalLicenseApiService {
  /**
   * Get licenses with pagination and filtering
   */
  static async getLicenses(params: {
    page?: number;
    limit?: number;
    status?: string;
    dba?: string;
    license_type?: string;
    startDate?: string;
    endDate?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<{
    success: boolean;
    message: string;
    data: ApiLicenseRaw[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
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
  static async getLicense(id: string): Promise<{
    success: boolean;
    message: string;
    data: { license: ApiLicenseRaw };
  }> {
    return httpClient.get(`/licenses/${id}`);
  }

  /**
   * Create new license
   */
  static async createLicense(licenseData: {
    key?: string;
    product?: string;
    plan?: string;
    status?: string;
    term?: string;
    seatsTotal?: number;
    startsAt?: string;
    expiresAt?: string;
    dba?: string;
    zip?: string;
    emailLicense?: string;
    pass?: string;
  }): Promise<{
    success: boolean;
    message: string;
    data: { license: ApiLicenseRaw };
  }> {
    return httpClient.post('/licenses', licenseData);
  }

  /**
   * Update license
   */
  static async updateLicense(id: string, updates: Partial<{
    status?: string;
    seatsTotal?: number;
    notes?: string;
    dba?: string;
    zip?: string;
  }>): Promise<{
    success: boolean;
    message: string;
    data: { license: ApiLicenseRaw };
  }> {
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
    updates: Record<string, unknown>;
  }): Promise<{
    success: boolean;
    message: string;
    data: {
      updated: number;
      failed: number;
      results: ApiLicenseRaw[];
    };
  }> {
    return httpClient.patch('/licenses/bulk', updates);
  }

  /**
   * Bulk create licenses
   */
  static async bulkCreateLicenses(licenses: Array<{
    key?: string;
    product?: string;
    plan?: string;
    status?: string;
    term?: string;
    seatsTotal?: number;
    startsAt?: string;
    expiresAt?: string;
    dba?: string;
    zip?: string;
    emailLicense?: string;
    pass?: string;
  }>): Promise<{
    success: boolean;
    message: string;
    data: {
      created: number;
      failed: number;
      results: ApiLicenseRaw[];
    };
  }> {
    return httpClient.post('/licenses/bulk', licenses);
  }

  /**
   * Bulk delete licenses
   */
  static async bulkDeleteLicenses(identifiers: {
    appids?: string[];
    emails?: string[];
    countids?: number[];
  }): Promise<{
    success: boolean;
    message: string;
    data: {
      deleted: number;
      failed: number;
      results: ApiLicenseRaw[];
    };
  }> {
    return httpClient.delete('/licenses/bulk', { data: identifiers });
  }

  /**
   * Get license by email
   */
  static async getLicenseByEmail(email: string): Promise<{
    success: boolean;
    message: string;
    data: { license: ApiLicenseRaw };
  }> {
    return httpClient.get(`/licenses/email/${encodeURIComponent(email)}`);
  }

  /**
   * Update license by email
   */
  static async updateLicenseByEmail(email: string, updates: Record<string, unknown>): Promise<{
    success: boolean;
    message: string;
    data: { license: ApiLicenseRaw };
  }> {
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
  static async getLicenseByCountId(countId: number): Promise<{
    success: boolean;
    message: string;
    data: { license: ApiLicenseRaw };
  }> {
    return httpClient.get(`/licenses/countid/${countId}`);
  }

  /**
   * Update license by count ID
   */
  static async updateLicenseByCountId(countId: number, updates: Record<string, unknown>): Promise<{
    success: boolean;
    message: string;
    data: { license: ApiLicenseRaw };
  }> {
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
  static async addRowLicense(licenseData: {
    key?: string;
    product?: string;
    plan?: string;
    status?: string;
    term?: string;
    seatsTotal?: number;
    startsAt?: string;
    expiresAt?: string;
    dba?: string;
    zip?: string;
    emailLicense?: string;
    pass?: string;
  }): Promise<{
    success: boolean;
    message: string;
    data: { license: ApiLicenseRaw };
  }> {
    return httpClient.post('/licenses/row', licenseData);
  }

  // ========================================================================
  // LICENSE LIFECYCLE MANAGEMENT API
  // ========================================================================

  /**
   * Get dashboard metrics
   */
  static async getDashboardMetrics(params?: {
    startsAtFrom?: string;
    startsAtTo?: string;
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
          expiringSoon: unknown[];
          lowSeats: unknown[];
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
  }): Promise<{
    success: boolean;
    message: string;
    data: { license: ApiLicenseRaw };
  }> {
    return httpClient.post(`/licenses/${licenseId}/renew`, renewalOptions);
  }

  /**
   * Get renewal preview
   */
  static async getRenewalPreview(licenseId: string, renewalOptions: {
    extensionDays?: number;
  }): Promise<{
    success: boolean;
    message: string;
    data: {
      currentExpiration: string;
      proposedExpiration: string;
      extensionDays: number;
      costImpact: number;
      conflicts: unknown[];
    };
  }> {
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
  }): Promise<{
    success: boolean;
    message: string;
    data: { license: ApiLicenseRaw };
  }> {
    return httpClient.post(`/licenses/${licenseId}/extend`, extensionOptions);
  }

  /**
   * Expire license manually
   */
  static async expireLicense(licenseId: string, expirationOptions: {
    reason?: string;
  }): Promise<{
    success: boolean;
    message: string;
    data: { license: ApiLicenseRaw };
  }> {
    return httpClient.post(`/licenses/${licenseId}/expire`, expirationOptions);
  }

  /**
   * Get expiration preview
   */
  static async getExpirationPreview(licenseId: string): Promise<{
    success: boolean;
    message: string;
    data: {
      currentStatus: string;
      proposedStatus: string;
      gracePeriodDays: number;
      autoSuspendEnabled: boolean;
      conflicts: unknown[];
    };
  }> {
    return httpClient.get(`/licenses/${licenseId}/expire-preview`);
  }

  /**
   * Reactivate suspended license
   */
  static async reactivateLicense(licenseId: string, reactivationOptions: {
    reason?: string;
  }): Promise<{
    success: boolean;
    message: string;
    data: { license: ApiLicenseRaw };
  }> {
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
    data: {
      expiringSoon: unknown[];
      expired: unknown[];
      suspended: unknown[];
      total: number;
    };
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
  }): Promise<{
    success: boolean;
    message: string;
    data: {
      renewed: number;
      failed: number;
      results: unknown[];
    };
  }> {
    return httpClient.post('/licenses/lifecycle/bulk-renew', renewalData);
  }

  /**
   * Bulk expire licenses
   */
  static async bulkExpireLicenses(expirationData: {
    licenseIds: string[];
    reason?: string;
  }): Promise<{
    success: boolean;
    message: string;
    data: {
      expired: number;
      failed: number;
      results: unknown[];
    };
  }> {
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
  } = {}): Promise<{
    success: boolean;
    message: string;
    data: {
      totalLicenses: number;
      activeLicenses: number;
      expiredLicenses: number;
      suspendedLicenses: number;
      utilizationRate: number;
      monthlyBreakdown: unknown[];
      statusDistribution: Record<string, number>;
    };
  }> {
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

// ========================================================================
// SMS PAYMENT MANAGEMENT API
// ========================================================================

/**
 * SMS Payment Management API Service
 */
export class SmsPaymentApiService {
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
  } = {}): Promise<{
    success: boolean;
    message: string;
    data: {
      payments: unknown[];
      totals: {
        totalPayments: number;
        totalAmount: number;
        totalSmsCredits: number;
      };
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
      };
    };
  }> {
    const queryParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });

    const url = `/sms-payments${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return httpClient.get(url);
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
  }): Promise<{
    success: boolean;
    message: string;
    data: {
      payment: unknown;
      updatedLicense: unknown;
    };
  }> {
    return httpClient.post('/add-sms-payment', paymentData);
  }
}

// ========================================================================
// UNIFIED API EXPORTS
// ========================================================================

// ========================================================================
// UNIFIED LICENSE API - Primary Interface for Components
// ========================================================================

/**
 * Unified License API - Primary interface for all license operations
 * Provides both external and internal API access with consistent error handling
 */
export class UnifiedLicenseApi {
  // ========================================================================
  // LICENSE CRUD OPERATIONS
  // ========================================================================

  /**
   * Get licenses with pagination and filtering
   */
  static async getLicenses(params: {
    page?: number;
    limit?: number;
    status?: string;
    dba?: string;
    license_type?: string;
    startDate?: string;
    endDate?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}) {
    try {
      const response = await InternalLicenseApiService.getLicenses(params);
      const data = response.data ?? [];
      const licenses = data.map(transformApiLicenseToRecord);

      return {
        licenses,
        pagination: response.meta ?? {
          page: params.page ?? 1,
          limit: params.limit ?? 20,
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
    updates: Record<string, unknown>;
  }) {
    return await InternalLicenseApiService.bulkUpdateLicenses(updates);
  }

  /**
   * Bulk update internal licenses (by IDs)
   */
  static async bulkUpdateInternalLicenses(updates: Array<Partial<LicenseRecord> & { id: number | string }>): Promise<LicenseRecord[]> {
    const response = await httpClient.patch<BulkUpdateApiResponse>('/licenses/bulk', updates);
    const results = extractBulkUpdateResults(response as unknown);
    return results.map(transformApiLicenseToRecord);
  }

  /**
   * Bulk create licenses
   */
  static async bulkCreateLicenses(licenses: Array<Partial<LicenseRecord>>): Promise<{
    success: boolean;
    message: string;
    data: {
      created: number;
      failed: number;
      results: ApiLicenseRaw[];
    };
  }> {
    return await InternalLicenseApiService.bulkCreateLicenses(licenses);
  }

  /**
   * Bulk delete licenses
   */
  static async bulkDeleteLicenses(identifiers: {
    appids?: string[];
    emails?: string[];
    countids?: number[];
  }) {
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
  static async updateLicenseByEmail(email: string, updates: Record<string, any>) {
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
  static async updateLicenseByCountId(countId: number, updates: Record<string, any>) {
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

// ========================================================================
// LEGACY API EXPORTS (for backward compatibility)
// ========================================================================

// Export singleton instance methods for convenience
export const licenseApi = {
  // Unified API (recommended for new code)
  getLicenses: UnifiedLicenseApi.getLicenses,
  getLicense: UnifiedLicenseApi.getLicense,
  createLicense: UnifiedLicenseApi.createLicense,
  updateLicense: UnifiedLicenseApi.updateLicense,
  deleteLicense: UnifiedLicenseApi.deleteLicense,
  bulkUpdateLicenses: UnifiedLicenseApi.bulkUpdateLicenses,
  bulkUpdateInternalLicenses: UnifiedLicenseApi.bulkUpdateInternalLicenses,
  bulkCreateLicenses: UnifiedLicenseApi.bulkCreateLicenses,
  bulkDeleteLicenses: UnifiedLicenseApi.bulkDeleteLicenses,
  getLicenseByEmail: UnifiedLicenseApi.getLicenseByEmail,
  updateLicenseByEmail: UnifiedLicenseApi.updateLicenseByEmail,
  deleteLicenseByEmail: UnifiedLicenseApi.deleteLicenseByEmail,
  getLicenseByCountId: UnifiedLicenseApi.getLicenseByCountId,
  updateLicenseByCountId: UnifiedLicenseApi.updateLicenseByCountId,
  deleteLicenseByCountId: UnifiedLicenseApi.deleteLicenseByCountId,
  resetLicense: UnifiedLicenseApi.resetLicense,
  addRowLicense: UnifiedLicenseApi.addRowLicense,

  // Dashboard & Analytics
  getDashboardMetrics: UnifiedLicenseApi.getDashboardMetrics,
  getLicenseAnalytics: UnifiedLicenseApi.getLicenseAnalytics,
  getLicenseSyncStatus: UnifiedLicenseApi.getLicenseSyncStatus,

  // Lifecycle Management
  getLifecycleStatus: UnifiedLicenseApi.getLifecycleStatus,
  renewLicense: UnifiedLicenseApi.renewLicense,
  getRenewalPreview: UnifiedLicenseApi.getRenewalPreview,
  extendLicense: UnifiedLicenseApi.extendLicense,
  expireLicense: UnifiedLicenseApi.expireLicense,
  getExpirationPreview: UnifiedLicenseApi.getExpirationPreview,
  reactivateLicense: UnifiedLicenseApi.reactivateLicense,
  getLicensesRequiringAttention: UnifiedLicenseApi.getLicensesRequiringAttention,
  bulkRenewLicenses: UnifiedLicenseApi.bulkRenewLicenses,
  bulkExpireLicenses: UnifiedLicenseApi.bulkExpireLicenses,
  processLifecycle: UnifiedLicenseApi.processLifecycle,

  // SMS Payments
  getSmsPayments: UnifiedLicenseApi.getSmsPayments,
  addSmsPayment: UnifiedLicenseApi.addSmsPayment,

  // Legacy API methods (for backward compatibility)
  getInternalLicenses: InternalLicenseApiService.getLicenses,
  getInternalLicense: InternalLicenseApiService.getLicense,
  createInternalLicense: InternalLicenseApiService.createLicense,
  updateInternalLicense: InternalLicenseApiService.updateLicense,
  deleteInternalLicense: InternalLicenseApiService.deleteLicense,
  bulkCreateInternalLicenses: InternalLicenseApiService.bulkCreateLicenses,
  bulkDeleteInternalLicenses: InternalLicenseApiService.bulkDeleteLicenses,
} as const;
