import { httpClient } from '@/infrastructure/api/client';
import type { DashboardMetricsResponse } from '@/infrastructure/api/types';
import type { LicenseRecord } from '@/types';

/**
 * Transform backend license data to frontend LicenseRecord
 */
function transformApiLicenseToRecord(apiLicense: any): LicenseRecord {
  // Handle external license API format
  // Convert status from string/number to proper status values
  let status: LicenseRecord['status'] = 'pending';
  if (apiLicense.status !== undefined && apiLicense.status !== null) {
    const statusValue = typeof apiLicense.status === 'string' ? parseInt(apiLicense.status) : apiLicense.status;
    switch (statusValue) {
      case 1:
        status = 'active';
        break;
      case 0:
        status = 'cancel'; // Changed from 'inactive' to 'cancel' (valid LicenseStatus)
        break;
      default:
        status = 'pending';
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

  return {
    id: apiLicense.appid || apiLicense.id || `temp-${Date.now()}`, // Use appid as primary ID, fallback to id or generate temp
    key: apiLicense.appid || apiLicense.key || '', // Use appid as license key
    product: apiLicense.product || 'ABC Business Suite',
    dba: apiLicense.dba || '',
    zip: apiLicense.zip || '',
    startsAt: convertDate(apiLicense.ActivateDate || apiLicense.startsAt || ''),
    status,
    plan: apiLicense.plan || 'Basic',
    term: apiLicense.term || 'monthly',
    cancelDate: apiLicense.cancelDate || '',
    lastPayment: apiLicense.monthlyFee || apiLicense.lastPayment || 0,
    lastActive: convertDateTime(apiLicense.lastActive || ''),
    smsPurchased: apiLicense.smsPurchased || 0,
    smsSent: apiLicense.smsSent || 0,
    smsBalance: apiLicense.smsBalance || 0,
    seatsTotal: apiLicense.seatsTotal || 1,
    seatsUsed: apiLicense.seatsUsed || 0,
    agents: apiLicense.agents || 0,
    agentsName: apiLicense.agentsName || [],
    agentsCost: apiLicense.agentsCost || 0,
    notes: apiLicense.Note || apiLicense.notes || '',
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

  // Map frontend fields to external API fields
  if (shouldInclude((license as any).key) || shouldInclude(license.id)) {
    apiLicense.appid = (license as any).key || license.id; // External API uses appid
  }

  // External API required fields
  if (shouldInclude(license.id)) {
    apiLicense.appid = license.id; // Ensure we always have appid
  }

  // Map frontend fields to external API fields
  if (shouldInclude(license.dba)) {
    apiLicense.dba = license.dba;
  }

  if (shouldInclude(license.zip)) {
    apiLicense.zip = license.zip;
  }

  // Required fields for external API
  if (shouldInclude(license.id)) {
    apiLicense.appid = license.id; // External API uses appid as identifier
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

  if (shouldInclude(license.notes)) {
    apiLicense.Note = license.notes; // External API uses Note
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

      const url = `/external-licenses${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await httpClient.get<{
        success: boolean;
        message: string;
        timestamp: string;
        data: any[];
        meta: {
          pagination: {
            page: number;
            limit: number;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
            total?: number;
          };
          stats?: {
            total: number;
            active: number;
            expired: number;
            pending: number;
            cancel: number;
          };
        };
      }>(url);

      if (!response.success || !response.data) {
        throw new Error('Get licenses response missing data');
      }

      // Transform API licenses to LicenseRecords
      const licenses = response.data.map(transformApiLicenseToRecord);

      const apiPagination = response.meta?.pagination || {
        page: params.page || 1,
        limit: params.limit || 20,
        totalPages: 0,
        hasNext: false,
        hasPrev: false
      };

      // Calculate total from totalPages and limit if not provided
      const total = apiPagination.total || (apiPagination.totalPages * apiPagination.limit);

      return {
        licenses,
        pagination: {
          page: apiPagination.page,
          limit: apiPagination.limit,
          total,
          totalPages: apiPagination.totalPages,
          hasNext: apiPagination.hasNext,
          hasPrev: apiPagination.hasPrev
        },
        stats: response.meta?.stats || undefined
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
      const response = await httpClient.get<any>(`/external-licenses/${String(id)}`);
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

      const response = await httpClient.post<any>('/external-licenses', apiData);
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
      // Backend expects ID in both URL and request body
      apiData.id = String(id);
      const response = await httpClient.put<any>(`/external-licenses/${String(id)}`, apiData);
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
      const response = await httpClient.delete<any>(`/external-licenses/${String(id)}`);
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
          const response = await httpClient.post<any>('/external-licenses', apiLicense);
          results.push(response.data);
        } catch (error) {
          // Log error but continue with other licenses
          console.error('Failed to create license:', apiLicense, error);
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
          const response = await httpClient.put<any>(`/external-licenses/${update.id}`, update.updates);
          results.push(response.data);
        } catch (error) {
          // Log error but continue with other updates
          console.error('Failed to update license:', update.id, error);
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
            console.error('Failed to delete license:', id, error);
          }
        }
      }

      return { deleted: deletedCount, notFound };
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
