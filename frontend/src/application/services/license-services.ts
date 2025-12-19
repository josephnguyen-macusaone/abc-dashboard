import { LicenseRecord } from '@/shared/types';
import { PaginatedResponse } from '@/shared/types';
import { httpClient } from '@/infrastructure/api/client';
import {
  GetLicensesUseCase,
  CreateLicenseUseCase,
  UpdateLicenseUseCase,
  DeleteLicenseUseCase,
  BulkUpdateLicensesUseCase,
  BulkCreateLicensesUseCase,
} from '@/application/use-cases/license';
import logger, { generateCorrelationId } from '@/shared/utils/logger';

// =====================================================================================
// INFRASTRUCTURE LAYER - API CLIENT
// Direct HTTP communication with backend APIs
// =====================================================================================

export interface LicenseListQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  dba?: string;
  sortBy?: keyof LicenseRecord;
  sortOrder?: 'asc' | 'desc';
}

export interface LicenseListResponse {
  success: boolean;
  message: string;
  timestamp: string;
  data: LicenseRecord[];
  meta: {
    pagination: {
      page: number;
      limit: number;
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
  };
}

export interface LicenseBulkResponse {
  success: boolean;
  message: string;
  data: LicenseRecord[];
}

export interface LicenseServiceContract {
  list(params: LicenseListQuery): Promise<LicenseListResponse>;
  getById(id: number): Promise<LicenseResponse>;
  create(payload: Omit<LicenseRecord, 'id' | 'smsBalance' | 'createdAt' | 'updatedAt'>): Promise<LicenseResponse>;
  update(id: number, payload: Partial<LicenseRecord>): Promise<LicenseResponse>;
  bulkUpdate(updates: Partial<LicenseRecord>[]): Promise<LicenseBulkResponse>;
  bulkCreate(licenses: Array<Omit<LicenseRecord, 'id' | 'smsBalance' | 'createdAt' | 'updatedAt'>>): Promise<LicenseBulkResponse>;
  delete(id: number): Promise<{ success: boolean; message: string }>;
}

export interface LicenseResponse {
  success: boolean;
  data: {
    license: LicenseRecord;
  };
}

/**
 * Infrastructure API Service - Direct HTTP client for license operations
 */
export const licenseApiService = {
  async list(params: LicenseListQuery): Promise<LicenseListResponse> {
    return httpClient.get<LicenseListResponse>('/licenses', { params });
  },

  async getById(id: number): Promise<LicenseResponse> {
    return httpClient.get<LicenseResponse>(`/licenses/${id}`);
  },

  async create(payload: Omit<LicenseRecord, 'id' | 'smsBalance' | 'createdAt' | 'updatedAt'>) {
    return httpClient.post<LicenseResponse>('/licenses', payload);
  },

  async update(id: number, payload: Partial<LicenseRecord>) {
    return httpClient.put<LicenseResponse>(`/licenses/${id}`, payload);
  },

  async bulkUpdate(updates: Partial<LicenseRecord>[]) {
    return httpClient.patch<LicenseBulkResponse>('/licenses/bulk', { updates });
  },

  async bulkCreate(licenses: Array<Omit<LicenseRecord, 'id' | 'smsBalance' | 'createdAt' | 'updatedAt'>>) {
    return httpClient.post<LicenseBulkResponse>('/licenses/bulk', { licenses });
  },

  async addRow(payload: Partial<LicenseRecord>) {
    return httpClient.post<LicenseResponse>('/licenses/row', payload);
  },

  async bulkDelete(ids: number[]) {
    return httpClient.delete('/licenses/bulk', { data: { ids } });
  },

  async delete(id: number) {
    return httpClient.delete<{ success: boolean; message: string }>(`/licenses/${id}`);
  },
};

// =====================================================================================
// APPLICATION LAYER - BUSINESS SERVICE
// Orchestrates use cases and handles business logic
// =====================================================================================

/**
 * Application Service: License Management
 * Coordinates multiple license use cases and provides high-level license management operations
 */
export class LicenseManagementService {
  private readonly logger = logger.createChild({
    component: 'LicenseManagementService',
  });

  constructor(
    private readonly getLicensesUseCase: GetLicensesUseCase,
    private readonly createLicenseUseCase: CreateLicenseUseCase,
    private readonly updateLicenseUseCase: UpdateLicenseUseCase,
    private readonly deleteLicenseUseCase: DeleteLicenseUseCase,
    private readonly bulkUpdateLicensesUseCase: BulkUpdateLicensesUseCase,
    private readonly bulkCreateLicensesUseCase: BulkCreateLicensesUseCase
  ) {}

  /**
   * Get paginated list of licenses
   */
  async getLicenses(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    dba?: string;
    sortBy?: keyof LicenseRecord;
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<PaginatedResponse<LicenseRecord>> {
    const correlationId = generateCorrelationId();

    try {
      const result = await this.getLicensesUseCase.execute(params);
      return result;
    } catch (error) {
      this.logger.error(`Get licenses error`, {
        correlationId,
        page: params.page,
        operation: 'get_licenses_error',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get a single license by ID
   */
  async getLicense(id: number): Promise<LicenseRecord> {
    const correlationId = generateCorrelationId();

    try {
      // Note: We'll need to create a GetLicenseUseCase for single license fetching
      // For now, we'll use getLicenses with a filter
      const result = await this.getLicensesUseCase.execute({ page: 1, limit: 1 });
      const license = result.data.find(l => l.id === id);
      if (!license) {
        throw new Error(`License with id ${id} not found`);
      }
      return license;
    } catch (error) {
      this.logger.error(`Get license error`, {
        correlationId,
        licenseId: id,
        operation: 'get_license_error',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Create a new license
   */
  async createLicense(licenseData: Omit<LicenseRecord, 'id' | 'smsBalance' | 'createdAt' | 'updatedAt'>): Promise<LicenseRecord> {
    const correlationId = generateCorrelationId();

    try {
      const result = await this.createLicenseUseCase.execute(licenseData);
      return result;
    } catch (error) {
      this.logger.error(`Create license error`, {
        correlationId,
        operation: 'create_license_error',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Update an existing license
   */
  async updateLicense(id: number, updates: Partial<LicenseRecord>): Promise<LicenseRecord> {
    const correlationId = generateCorrelationId();

    try {
      const result = await this.updateLicenseUseCase.execute(id, updates);
      return result;
    } catch (error) {
      this.logger.error(`Update license error`, {
        correlationId,
        licenseId: id,
        operation: 'update_license_error',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Delete a license
   */
  async deleteLicense(id: number): Promise<void> {
    const correlationId = generateCorrelationId();

    try {
      await this.deleteLicenseUseCase.execute(id);
    } catch (error) {
      this.logger.error(`Delete license error`, {
        correlationId,
        licenseId: id,
        operation: 'delete_license_error',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Bulk update licenses
   */
  async bulkUpdateLicenses(updates: Partial<LicenseRecord>[]): Promise<LicenseRecord[]> {
    const correlationId = generateCorrelationId();

    try {
      const result = await this.bulkUpdateLicensesUseCase.execute(updates);
      return result;
    } catch (error) {
      this.logger.error(`Bulk update licenses error`, {
        correlationId,
        count: updates.length,
        operation: 'bulk_update_licenses_error',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Bulk create licenses
   */
  async bulkCreateLicenses(licenses: Array<Omit<LicenseRecord, 'id' | 'smsBalance' | 'createdAt' | 'updatedAt'>>): Promise<LicenseRecord[]> {
    const correlationId = generateCorrelationId();

    try {
      const result = await this.bulkCreateLicensesUseCase.execute(licenses);
      return result;
    } catch (error) {
      this.logger.error(`Bulk create licenses error`, {
        correlationId,
        count: licenses.length,
        operation: 'bulk_create_licenses_error',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Bulk delete licenses
   */
  async bulkDeleteLicenses(ids: number[]): Promise<void> {
    const correlationId = generateCorrelationId();

    try {
      // Note: We'll need to create a BulkDeleteLicensesUseCase for this
      // For now, we'll delete licenses one by one
      for (const id of ids) {
        await this.deleteLicenseUseCase.execute(id);
      }
    } catch (error) {
      this.logger.error(`Bulk delete licenses error`, {
        correlationId,
        count: ids.length,
        operation: 'bulk_delete_licenses_error',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}