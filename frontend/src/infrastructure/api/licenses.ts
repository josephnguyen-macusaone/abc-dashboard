import { httpClient } from '@/infrastructure/api/client';
import type { DashboardMetricsResponse } from '@/infrastructure/api/types';

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
    licenses: any[];
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
          queryParams.append(key, String(value));
        }
      });

      const url = `/licenses${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await httpClient.get<{
        success: boolean;
        data: any[];
        meta: { pagination: any };
      }>(url);

      if (!response.success || !response.data) {
        throw new Error('Get licenses response missing data');
      }

      return {
        licenses: response.data,
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
  static async getLicense(id: number): Promise<any> {
    try {
      const response = await httpClient.get<any>(`/licenses/${id}`);
      return response.data?.license || response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create a new license
   */
  static async createLicense(licenseData: any): Promise<any> {
    try {
      const response = await httpClient.post<any>('/licenses', licenseData);
      return response.data?.license || response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update license by ID
   */
  static async updateLicense(id: number, updates: any): Promise<any> {
    try {
      const response = await httpClient.patch<any>(`/licenses/${id}`, updates);
      return response.data?.license || response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete license by ID
   */
  static async deleteLicense(id: number): Promise<{ message: string }> {
    try {
      const response = await httpClient.delete<any>(`/licenses/${id}`);
      return response.data || { message: 'License deleted successfully' };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Bulk update licenses
   */
  static async bulkUpdateLicenses(updates: any[]): Promise<any[]> {
    try {
      const response = await httpClient.patch<any>('/licenses/bulk', { updates });
      return response.data || [];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Bulk delete licenses
   */
  static async bulkDeleteLicenses(ids: number[]): Promise<{ deleted: number; notFound: number[] }> {
    try {
      const response = await httpClient.delete<any>('/licenses/bulk', { data: { ids } });
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
  bulkUpdateLicenses: LicenseApiService.bulkUpdateLicenses,
  bulkDeleteLicenses: LicenseApiService.bulkDeleteLicenses,
  getDashboardMetrics: LicenseApiService.getDashboardMetrics,
} as const;
