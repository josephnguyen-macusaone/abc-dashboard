import { httpClient } from '@/infrastructure/api/client';
import type { DashboardMetricsResponse } from '@/infrastructure/api/types';
import type { LicenseRecord } from '@/shared/types';

/**
 * Transform backend license data to frontend LicenseRecord
 */
function transformApiLicenseToRecord(apiLicense: any): LicenseRecord {
  return {
    id: apiLicense.id,
    key: apiLicense.key,
    product: apiLicense.product,
    dba: apiLicense.dba || '',
    zip: apiLicense.zip || '',
    startsAt: apiLicense.startsAt || apiLicense.startDay || '', // Handle both formats
    status: apiLicense.status || 'pending',
    plan: apiLicense.plan || 'Basic',
    term: apiLicense.term || 'monthly',
    cancelDate: apiLicense.cancelDate,
    lastPayment: apiLicense.lastPayment || 0,
    lastActive: apiLicense.lastActive || '',
    smsPurchased: apiLicense.smsPurchased || 0,
    smsSent: apiLicense.smsSent || 0,
    smsBalance: apiLicense.smsBalance || (apiLicense.smsPurchased || 0) - (apiLicense.smsSent || 0),
    seatsTotal: apiLicense.seatsTotal,
    seatsUsed: apiLicense.seatsUsed,
    agents: apiLicense.agents || 0,
    agentsName: apiLicense.agentsName || [],
    agentsCost: apiLicense.agentsCost || 0,
    notes: apiLicense.notes || '',
  };
}

/**
 * Transform frontend LicenseRecord to backend API format
 * Filters out undefined, null, and empty values to ensure clean API payloads
 */
function transformRecordToApiLicense(license: Partial<LicenseRecord>): any {
  const apiLicense: any = {};

  // Helper to check if value should be included
  const shouldInclude = (value: any): boolean => {
    return value !== undefined && value !== null && value !== '';
  };

  // Only include fields that have defined, non-null, non-empty values
  if (shouldInclude((license as any).key)) {
    apiLicense.key = (license as any).key;
  }

  if (shouldInclude((license as any).product)) {
    apiLicense.product = (license as any).product;
  }

  if (shouldInclude(license.dba)) {
    apiLicense.dba = license.dba;
  }

  if (shouldInclude(license.zip)) {
    apiLicense.zip = license.zip;
  }

  if (shouldInclude(license.startsAt)) {
    // Convert to date-only format if it's a full timestamp
    const dateStr = String(license.startsAt);
    apiLicense.startsAt = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  }

  if (shouldInclude(license.status)) {
    apiLicense.status = license.status;
  }

  if (shouldInclude(license.plan)) {
    apiLicense.plan = license.plan;
  }

  if (shouldInclude(license.term)) {
    apiLicense.term = license.term;
  }

  // Only include cancelDate if it has a real value (not null or empty)
  if (shouldInclude(license.cancelDate)) {
    apiLicense.cancelDate = license.cancelDate;
  }

  if (license.lastPayment !== undefined && license.lastPayment !== null) {
    apiLicense.lastPayment = license.lastPayment;
  }

  if (license.smsPurchased !== undefined && license.smsPurchased !== null) {
    apiLicense.smsPurchased = license.smsPurchased;
  }

  if (license.smsSent !== undefined && license.smsSent !== null) {
    apiLicense.smsSent = license.smsSent;
  }

  if (license.agents !== undefined && license.agents !== null) {
    apiLicense.agents = license.agents;
  }

  if (license.agentsName !== undefined && license.agentsName !== null) {
    apiLicense.agentsName = license.agentsName;
  }

  if (license.agentsCost !== undefined && license.agentsCost !== null) {
    apiLicense.agentsCost = license.agentsCost;
  }

  if (license.seatsTotal !== undefined && license.seatsTotal !== null) {
    apiLicense.seatsTotal = license.seatsTotal;
  }

  if (shouldInclude(license.notes)) {
    apiLicense.notes = license.notes;
  }

  return apiLicense;
}

/**
 * License Management API service
 */
export class LicenseApiService {
  /**
   * Get dashboard metrics with optional date range filtering
   */
  static async getDashboardMetrics(params?: {
    startsAtFrom?: string;
    startsAtTo?: string;
  }): Promise<DashboardMetricsResponse> {
    try {
      const queryParams = new URLSearchParams();

      if (params?.startsAtFrom) {
        queryParams.append('startsAtFrom', params.startsAtFrom);
      }

      if (params?.startsAtTo) {
        queryParams.append('startsAtTo', params.startsAtTo);
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
  static async getLicenses(params: any = {}): Promise<{
    licenses: LicenseRecord[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    stats?: {
      total: number;
      active: number;
      expired: number;
      pending: number;
      cancel: number;
    };
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
        data: any[];
        meta: { pagination: any; stats?: any };
      }>(url);

      if (!response.success || !response.data) {
        throw new Error('Get licenses response missing data');
      }

      // Transform API licenses to LicenseRecords
      const licenses = response.data.map(transformApiLicenseToRecord);

      return {
        licenses,
        pagination: response.meta?.pagination || {
          page: params.page || 1,
          limit: params.limit || 20,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        },
        stats: response.meta?.stats
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
      const response = await httpClient.get<any>(`/licenses/${String(id)}`);
      const apiLicense = response.data?.license || response.data;
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

      // Validate required fields
      if (!apiData.dba || apiData.dba.trim() === '') {
        throw new Error('DBA is required and cannot be empty');
      }
      if (!apiData.startsAt || apiData.startsAt.trim() === '') {
        throw new Error('Start date is required and cannot be empty');
      }

      const response = await httpClient.post<any>('/licenses', apiData);
      const apiLicense = response.data?.license || response.data;
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
      // Backend expects string ID (UUID)
      const response = await httpClient.put<any>(`/licenses/${String(id)}`, apiData);
      const apiLicense = response.data?.license || response.data;
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
      const response = await httpClient.delete<any>(`/licenses/${String(id)}`);
      return response.data || { message: 'License deleted successfully' };
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
        if (!license.dba || license.dba.trim() === '') {
          return false;
        }
        return true;
      });

      if (validLicenses.length === 0) {
        throw new Error('No valid licenses to create');
      }

      const apiLicenses = validLicenses.map(license => transformRecordToApiLicense(license));

      const response = await httpClient.post<any>('/licenses/bulk', { licenses: apiLicenses });

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

      const response = await httpClient.patch<any>('/licenses/bulk', { updates: validUpdates });
      const apiLicenses = response.data?.licenses || response.data || [];

      return apiLicenses.map(transformApiLicenseToRecord);
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
      const response = await httpClient.delete<any>('/licenses/bulk', { data: { ids: stringIds } });
      return response.data || { deleted: ids.length, notFound: [] };
    } catch (error) {
      throw error;
    }
  }
}

// Export singleton instance methods for convenience
export const licenseApi = {
  getLicenses: LicenseApiService.getLicenses,
  getLicense: LicenseApiService.getLicense,
  createLicense: LicenseApiService.createLicense,
  updateLicense: LicenseApiService.updateLicense,
  deleteLicense: LicenseApiService.deleteLicense,
  bulkCreateLicenses: LicenseApiService.bulkCreateLicenses,
  bulkUpdateLicenses: LicenseApiService.bulkUpdateLicenses,
  bulkDeleteLicenses: LicenseApiService.bulkDeleteLicenses,
  getDashboardMetrics: LicenseApiService.getDashboardMetrics,
} as const;
