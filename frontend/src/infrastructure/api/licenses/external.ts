import { httpClient } from '@/infrastructure/api/client';
import type { DashboardMetricsResponse } from '@/infrastructure/api/types';
import type { LicenseRecord } from '@/types';
import logger from '@/shared/helpers/logger';
import { transformApiLicenseToRecord, transformRecordToApiLicense } from './transforms';
import type { GetLicensesParams, ExternalLicenseRow, ExternalLicenseListResponse, LicenseListMeta } from './types';

const log = logger.createChild({ component: 'LicenseApi-External' });

/**
 * External License Management API service (external-licenses endpoints).
 * Handles external license management system integration.
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
    pagination: LicenseListMeta;
  }> {
    try {
      const queryParams = new URLSearchParams();

      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          // Handle array values for filters like status - send as comma-separated string
          if (Array.isArray(value)) {
            queryParams.append(key, value.join(','));
          } else {
            queryParams.append(key, String(value));
          }
        }
      });

      const url = `/licenses${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await httpClient.get<{
        success: boolean;
        message: string;
        timestamp: string;
        data: ExternalLicenseRow[];
        meta: LicenseListMeta;
      }>(url);

      if (!response.success || !response.data) {
        throw new Error('Get licenses response missing data');
      }

      // Transform API licenses to LicenseRecords
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
      // Backend expects string ID (UUID)
      const response = await httpClient.get<{
        success: boolean;
        message?: string;
        data: ExternalLicenseRow | { license: ExternalLicenseRow };
      }>(`/external-licenses/${String(id)}`);
      
      const data = response.data as ExternalLicenseRow | { license: ExternalLicenseRow };
      const apiLicense: ExternalLicenseRow = (data && typeof data === 'object' && 'license' in data) 
        ? (data as { license: ExternalLicenseRow }).license 
        : data as ExternalLicenseRow;
      
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

      const response = await httpClient.post<{
        success: boolean;
        message?: string;
        data: ExternalLicenseRow | { license: ExternalLicenseRow };
      }>('/external-licenses', apiData);
      
      const data = response.data as ExternalLicenseRow | { license: ExternalLicenseRow };
      const apiLicense: ExternalLicenseRow = (data && typeof data === 'object' && 'license' in data) 
        ? (data as { license: ExternalLicenseRow }).license 
        : data as ExternalLicenseRow;
      
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
      const response = await httpClient.put<{
        success: boolean;
        message?: string;
        data: ExternalLicenseRow | { license: ExternalLicenseRow };
      }>(`/external-licenses/${String(id)}`, apiData);
      
      const data = response.data as ExternalLicenseRow | { license: ExternalLicenseRow };
      const apiLicense: ExternalLicenseRow = (data && typeof data === 'object' && 'license' in data) 
        ? (data as { license: ExternalLicenseRow }).license 
        : data as ExternalLicenseRow;
      
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
      const response = await httpClient.delete<{
        success: boolean;
        message: string;
        data?: { message: string };
      }>(`/external-licenses/${String(id)}`);
      return response.data || { message: response.message || 'License deleted successfully' };
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
      const results: ExternalLicenseRow[] = [];
      for (const apiLicense of apiLicenses) {
        try {
          const response = await httpClient.post<{
            success: boolean;
            message?: string;
            data: ExternalLicenseRow | { license: ExternalLicenseRow };
          }>('/external-licenses', apiLicense);
          
          const data = response.data as ExternalLicenseRow | { license: ExternalLicenseRow };
          const license: ExternalLicenseRow = (data && typeof data === 'object' && 'license' in data) 
            ? (data as { license: ExternalLicenseRow }).license 
            : data as ExternalLicenseRow;
          
          results.push(license);
        } catch (error) {
          // Log error but continue with other licenses
          log.error('Failed to create license', { apiLicense, error });
        }
      }

      return results.map(transformApiLicenseToRecord);
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
      const results: ExternalLicenseRow[] = [];
      for (const update of validUpdates) {
        try {
          const response = await httpClient.put<{
            success: boolean;
            message?: string;
            data: ExternalLicenseRow | { license: ExternalLicenseRow };
          }>(`/external-licenses/${update.id}`, update.updates);
          
          const data = response.data as ExternalLicenseRow | { license: ExternalLicenseRow };
          const license: ExternalLicenseRow = (data && typeof data === 'object' && 'license' in data) 
            ? (data as { license: ExternalLicenseRow }).license 
            : data as ExternalLicenseRow;
          
          results.push(license);
        } catch (error) {
          // Log error but continue with other updates
          log.error('Failed to update license', { id: update.id, error });
        }
      }

      return results.map(transformApiLicenseToRecord);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Bulk update internal licenses
   */
  static async bulkUpdateInternalLicenses(updates: Array<Partial<LicenseRecord> & { id: number | string }>): Promise<LicenseRecord[]> {
    try {
      // Send the array directly to the internal bulk update endpoint
      const response = await httpClient.patch<{
        success: boolean;
        message?: string;
        data?: {
          updated?: number;
          failed?: number;
          results?: ExternalLicenseRow[];
        };
      } | ExternalLicenseRow[]>('/licenses/bulk', updates);

      // Extract results from the response
      log.debug('Bulk update API response', {
        hasData: !!(response && typeof response === 'object' && 'data' in response),
        dataType: response && typeof response === 'object' && 'data' in response ? typeof response.data : typeof response,
        dataKeys: response && typeof response === 'object' && 'data' in response && response.data && typeof response.data === 'object' ? Object.keys(response.data) : [],
        hasResults: !!(response && typeof response === 'object' && 'data' in response && response.data && typeof response.data === 'object' && 'results' in response.data),
        resultsIsArray: response && typeof response === 'object' && 'data' in response && response.data && typeof response.data === 'object' && 'results' in response.data ? Array.isArray(response.data.results) : false,
        resultsLength: response && typeof response === 'object' && 'data' in response && response.data && typeof response.data === 'object' && 'results' in response.data && Array.isArray(response.data.results) ? response.data.results.length : 'N/A'
      });

      if (response && typeof response === 'object' && 'data' in response && response.data && typeof response.data === 'object' && 'results' in response.data && response.data.results) {
        const transformed = response.data.results.map(transformApiLicenseToRecord);
        log.debug('Bulk update API returning transformed results', { count: transformed.length });
        return transformed;
      } else if (Array.isArray(response)) {
        // Fallback for old format (response is array directly)
        const transformed = response.map(transformApiLicenseToRecord);
        log.debug('Bulk update API returning fallback transformed results', { count: transformed.length });
        return transformed;
      } else if (response && typeof response === 'object' && 'data' in response && Array.isArray(response.data)) {
        // Another fallback (response.data is array)
        const transformed = response.data.map(transformApiLicenseToRecord);
        log.debug('Bulk update API returning data array transformed results', { count: transformed.length });
        return transformed;
      } else {
        log.warn('Unexpected bulk update response format', { data: response });
        return [];
      }
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
          await httpClient.delete<{
            success: boolean;
            message: string;
          }>(`/external-licenses/${id}`);
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
