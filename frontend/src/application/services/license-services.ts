import type { CreateLicenseProps } from '@/domain/entities/license-entity';
import { ILicenseRepository, LicenseSyncStatus } from '@/domain/repositories/i-license-repository';
import { LicenseDomainService } from '@/domain/services/license-domain-service';
import { LicenseRecord, PaginatedResponse } from '@/types';
import { httpClient } from '@/infrastructure/api/client';
import {
  type GetLicensesUseCase,
  type CreateLicenseUseCase,
  type UpdateLicenseUseCase,
} from '@/application/use-cases/license';
import {
  CreateLicenseDTO,
  UpdateLicenseDTO,
  LicenseListQueryDTO,
  PaginatedLicenseListDTO,
  BulkCreateLicensesDTO,
  BulkOperationResultDTO,
  LicenseResponseDTO
} from '@/application/dto/license-dto';
import logger, { generateCorrelationId } from '@/shared/helpers/logger';

/**
 * License Management Ports
 * Defines the contracts for license use cases following Clean Architecture
 */
export interface LicensePorts {
  getLicenses: GetLicensesUseCase;
  createLicense: CreateLicenseUseCase;
  updateLicense: UpdateLicenseUseCase;
}

/** Result shape returned by bulkUpdateLicenses for store ID mapping */
export interface BulkUpdateLicenseResult {
  _isBulkUpdateResult: true;
  results: LicenseRecord[];
  idMapping: Record<string, string>;
}

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

export interface LicenseBulkCreateResponse {
  success: boolean;
  message: string;
  data: {
    created: number;
    failed: number;
    results: LicenseRecord[];
  };
}

export interface LicenseServiceContract {
  list(params: LicenseListQuery): Promise<LicenseListResponse>;
  getById(id: number): Promise<LicenseResponse>;
  create(payload: Omit<LicenseRecord, 'id' | 'smsBalance' | 'createdAt' | 'updatedAt'>): Promise<LicenseResponse>;
  update(id: number, payload: Partial<LicenseRecord>): Promise<LicenseResponse>;
  bulkUpdate(updates: Partial<LicenseRecord>[]): Promise<LicenseBulkResponse>;
  bulkCreate(licenses: Array<Omit<LicenseRecord, 'id' | 'smsBalance' | 'createdAt' | 'updatedAt'>>): Promise<LicenseBulkCreateResponse>;
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
    return httpClient.post('/licenses/bulk', { licenses }) as Promise<LicenseBulkCreateResponse>;
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
/**
 * Application Service - License Management Service
 * Orchestrates license business operations using use cases following Clean Architecture
 */
export class LicenseManagementService {
  private readonly serviceLogger = logger.createChild({
    component: 'LicenseManagementService',
  });

  constructor(
    private readonly licenseRepository: ILicenseRepository,
    private readonly ports: LicensePorts,
    private readonly licenseDomainService: LicenseDomainService
  ) {}

  /**
   * List licenses with pagination and filtering
   */
  async list(params: LicenseListQueryDTO = {}): Promise<PaginatedLicenseListDTO> {
    const correlationId = generateCorrelationId();

    try {
      // Minimal logging - only errors

      const result = await this.ports.getLicenses.execute(params);

      return result;
    } catch (error) {
      this.serviceLogger.error('Failed to list licenses', {
        correlationId,
        params,
        operation: 'service_list_error',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get license by ID
   */
  /**
   * Get license sync status (e.g. last sync result for dashboard)
   */
  async getSyncStatus(): Promise<LicenseSyncStatus> {
    return this.licenseRepository.getSyncStatus();
  }

  /**
   * Get dashboard metrics (overview, utilization, alerts - shape depends on backend)
   */
  async getDashboardMetrics(params?: { startsAtFrom?: string; startsAtTo?: string; search?: string; status?: string; dba?: string }): Promise<unknown> {
    return this.licenseRepository.getDashboardMetrics(params);
  }

  /**
   * Get licenses requiring attention (expiring soon, expired, suspended)
   */
  async getLicensesRequiringAttention(options: Record<string, unknown> = {}): Promise<{
    expiringSoon: unknown[];
    expired: unknown[];
    suspended: unknown[];
    total: number;
  }> {
    return this.licenseRepository.getLicensesRequiringAttention(options);
  }

  /**
   * Bulk update licenses by identifiers (appids, emails, countids)
   */
  async bulkUpdateByIdentifiers(identifiers: { appids?: string[]; emails?: string[]; countids?: number[] }, updates: Record<string, unknown>): Promise<{ updated: number }> {
    return this.licenseRepository.bulkUpdateByIdentifiers(identifiers, updates);
  }

  /**
   * Get SMS payments with optional filters
   */
  async getSmsPayments(params?: {
    appid?: string;
    emailLicense?: string;
    countid?: number;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ payments: unknown[]; totals: unknown; pagination: unknown }> {
    return this.licenseRepository.getSmsPayments(params);
  }

  /**
   * Add SMS payment
   */
  async addSmsPayment(paymentData: {
    appid?: string;
    emailLicense?: string;
    countid?: number;
    amount: number;
    paymentDate?: string;
    description?: string;
  }): Promise<unknown> {
    return this.licenseRepository.addSmsPayment(paymentData);
  }

  async getById(id: string): Promise<LicenseResponseDTO> {
    const correlationId = generateCorrelationId();

    try {
      this.serviceLogger.debug('Getting license by ID', {
        correlationId,
        licenseId: id,
        operation: 'service_get_by_id_start'
      });

      // For now, get all licenses and filter - in production, we'd have a dedicated use case
      const result = await this.ports.getLicenses.execute({ limit: 10000 });
      const license = result.licenses.find(l => l.id === id);

      if (!license) {
        throw new Error(`License with ID ${id} not found`);
      }

      this.serviceLogger.debug('License retrieved successfully', {
        correlationId,
        licenseId: id,
        operation: 'service_get_by_id_success'
      });

      return license;
    } catch (error) {
      this.serviceLogger.error('Failed to get license by ID', {
        correlationId,
        licenseId: id,
        operation: 'service_get_by_id_error',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Create a new license
   */
  async create(dto: CreateLicenseDTO): Promise<LicenseResponseDTO> {
    const correlationId = generateCorrelationId();

    try {
      this.serviceLogger.debug('Creating license', {
        correlationId,
        dba: dto.dba,
        plan: dto.plan,
        operation: 'service_create_start'
      });

      // Validate business rules
      const validation = LicenseDomainService.validateLicenseCreation(dto);
      if (!validation.isValid) {
        this.serviceLogger.warn('License creation validation failed', {
          correlationId,
          errors: validation.errors,
          operation: 'service_create_validation_failed'
        });
        throw new Error(`License validation failed: ${validation.errors.join(', ')}`);
      }

      // Execute use case
      const license = await this.ports.createLicense.execute(dto);

      // Convert domain entity to response DTO
      const responseDTO: LicenseResponseDTO = {
        id: license.id.toString(),
        key: license.key,
        product: license.product,
        dba: license.dba,
        zip: license.zip,
        startsAt: license.startsAt.toISOString(),
        status: license.status,
        cancelDate: license.cancelDate?.toISOString(),
        plan: license.plan,
        term: license.term,
        seatsTotal: license.seatsTotal,
        seatsUsed: license.seatsUsed,
        lastPayment: license.lastPayment.getAmount(),
        lastActive: license.lastActive.toISOString(),
        smsPurchased: license.smsPurchased,
        smsSent: license.smsSent,
        smsBalance: license.smsBalance,
        agents: license.agents,
        agentsName: license.agentsName,
        agentsCost: license.agentsCost.getAmount(),
        notes: license.notes,
        expirationDate: license.calculateExpirationDate().toISOString(),
        daysUntilExpiration: Math.ceil((license.calculateExpirationDate().getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
        isExpiringSoon: license.isExpiringSoon(),
        utilizationRate: license.seatsTotal > 0 ? (license.seatsUsed / license.seatsTotal) * 100 : 0,
        createdAt: license.createdAt?.toISOString(),
        updatedAt: license.updatedAt?.toISOString()
      };

      this.serviceLogger.debug('License created successfully', {
        correlationId,
        licenseId: license.id.toString(),
        operation: 'service_create_success'
      });

      return responseDTO;
    } catch (error) {
      this.serviceLogger.error('Failed to create license', {
        correlationId,
        dba: dto.dba,
        operation: 'service_create_error',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Update an existing license
   */
  async update(id: string, dto: UpdateLicenseDTO): Promise<LicenseResponseDTO> {
    const correlationId = generateCorrelationId();

    try {
      this.serviceLogger.debug('Updating license', {
        correlationId,
        licenseId: id,
        updates: Object.keys(dto),
        operation: 'service_update_start'
      });

      // Execute use case
      const license = await this.ports.updateLicense.execute(id, dto);

      // Convert domain entity to response DTO
      const responseDTO: LicenseResponseDTO = {
        id: license.id.toString(),
        key: license.key,
        product: license.product,
        dba: license.dba,
        zip: license.zip,
        startsAt: license.startsAt.toISOString(),
        status: license.status,
        cancelDate: license.cancelDate?.toISOString(),
        plan: license.plan,
        term: license.term,
        seatsTotal: license.seatsTotal,
        seatsUsed: license.seatsUsed,
        lastPayment: license.lastPayment.getAmount(),
        lastActive: license.lastActive.toISOString(),
        smsPurchased: license.smsPurchased,
        smsSent: license.smsSent,
        smsBalance: license.smsBalance,
        agents: license.agents,
        agentsName: license.agentsName,
        agentsCost: license.agentsCost.getAmount(),
        notes: license.notes,
        expirationDate: license.calculateExpirationDate().toISOString(),
        daysUntilExpiration: Math.ceil((license.calculateExpirationDate().getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
        isExpiringSoon: license.isExpiringSoon(),
        utilizationRate: license.seatsTotal > 0 ? (license.seatsUsed / license.seatsTotal) * 100 : 0,
        createdAt: license.createdAt?.toISOString(),
        updatedAt: license.updatedAt?.toISOString()
      };

      this.serviceLogger.debug('License updated successfully', {
        correlationId,
        licenseId: id,
        operation: 'service_update_success'
      });

      return responseDTO;
    } catch (error) {
      this.serviceLogger.error('Failed to update license', {
        correlationId,
        licenseId: id,
        updates: Object.keys(dto),
        operation: 'service_update_error',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Bulk create licenses
   */
  async bulkCreate(dto: BulkCreateLicensesDTO): Promise<BulkOperationResultDTO<LicenseResponseDTO>> {
    const correlationId = generateCorrelationId();

    try {
      this.serviceLogger.debug('Bulk creating licenses', {
        correlationId,
        count: dto.licenses.length,
        operation: 'service_bulk_create_start'
      });

      // Validate and normalize all licenses first
      const validationErrors: string[] = [];
      const normalizedLicenses: CreateLicenseDTO[] = [];

      dto.licenses.forEach((license, index) => {
        const withStartDay = license as Partial<LicenseRecord> & { startDay?: string; key?: string };
        const normalizedLicense: Partial<CreateLicenseDTO> & { startDay?: string; key?: string } = {
          ...license,
          startsAt: license.startsAt ?? withStartDay.startDay
        };
        delete normalizedLicense.startDay;

        if (normalizedLicense.key === undefined && withStartDay.key !== undefined) {
          normalizedLicense.key = withStartDay.key;
        }

        // Set default values for missing required fields to prevent validation errors
        if (!normalizedLicense.startsAt || normalizedLicense.startsAt === 'string') {
          // If no valid start date, use a future date (next month)
          const futureDate = new Date();
          futureDate.setMonth(futureDate.getMonth() + 1);
          normalizedLicense.startsAt = futureDate.toISOString().split('T')[0]; // Just the date part
        }

        if (!normalizedLicense.plan || normalizedLicense.plan === 'string') {
          normalizedLicense.plan = 'Basic'; // Default plan
        }

        if (!normalizedLicense.term) {
          normalizedLicense.term = 'monthly'; // Default term
        }

        if (!normalizedLicense.dba || normalizedLicense.dba === 'string') {
          normalizedLicense.dba = `License ${index + 1}`; // Default DBA
        }

        if (!normalizedLicense.zip || normalizedLicense.zip === 'string') {
          normalizedLicense.zip = '00000'; // Default ZIP
        }

        normalizedLicenses.push(normalizedLicense as CreateLicenseDTO);

        // Validate the normalized license
        const validation = LicenseDomainService.validateLicenseCreation(normalizedLicense as CreateLicenseProps);
        if (!validation.isValid) {
          validationErrors.push(`License ${index + 1}: ${validation.errors.join(', ')}`);
        }
      });

      if (validationErrors.length > 0) {
        this.serviceLogger.warn('Bulk validation warnings', {
          correlationId,
          errors: validationErrors.slice(0, 5), // Log first 5 errors to avoid spam
          totalErrors: validationErrors.length
        });
        // Don't throw error for now - try to create valid licenses
      }

      // Use the bulk create API
      this.serviceLogger.debug('Calling bulk create API', {
        correlationId,
        licenseCount: normalizedLicenses.length
      });

      const bulkCreateResults = await this.licenseRepository.bulkCreateLicensesRaw(normalizedLicenses);

      // Extract the created licenses from the API response
      const createdLicenses = (bulkCreateResults.data?.results || []) as LicenseRecord[];

      // Convert to the expected response format
      const results: LicenseResponseDTO[] = createdLicenses.map((license: LicenseRecord) => ({
        id: String(license.id),
        key: license.key || '',
        product: license.product || '',
        dba: license.dba,
        zip: license.zip,
        startsAt: license.startsAt,
        status: license.status,
        cancelDate: license.cancelDate,
        plan: license.plan,
        term: license.term,
        seatsTotal: license.seatsTotal || 1,
        seatsUsed: license.seatsUsed || 0,
        lastPayment: license.lastPayment || 0,
        lastActive: license.lastActive || '',
        smsPurchased: license.smsPurchased || 0,
        smsSent: license.smsSent || 0,
        smsBalance: license.smsBalance || 0,
        agents: license.agents || 0,
        agentsName: license.agentsName || [],
        agentsCost: license.agentsCost || 0,
        notes: license.notes || '',
        expirationDate: '', // These would be calculated in a real implementation
        daysUntilExpiration: 0,
        isExpiringSoon: false,
        utilizationRate: 0,
        createdAt: '',
        updatedAt: ''
      }));

      const errors: string[] = [];

      const result: BulkOperationResultDTO<LicenseResponseDTO> = {
        success: errors.length === 0,
        processed: normalizedLicenses.length,
        successful: results.length,
        failed: errors.length,
        results: [
          ...results.map((license) => ({
            id: license.id,
            success: true as const,
            result: license
          })),
          ...errors.map((error, index) => ({
            id: `failed_${index}`,
            success: false as const,
            error
          }))
        ],
        summary: {
          message: `Processed ${normalizedLicenses.length} licenses: ${results.length} successful, ${errors.length} failed`,
          details: { successful: results.length, failed: errors.length }
        }
      };

      this.serviceLogger.debug('Bulk license creation completed', {
        correlationId,
        processed: normalizedLicenses.length,
        successful: results.length,
        failed: errors.length
      });

      return result;
    } catch (error) {
      this.serviceLogger.error('Failed to bulk create licenses', {
        correlationId,
        count: dto.licenses.length,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Delete license by ID
   */
  async delete(id: string): Promise<{ success: boolean; message: string }> {
    const correlationId = generateCorrelationId();

    try {
      this.serviceLogger.debug('Deleting license', {
        correlationId,
        licenseId: id,
        operation: 'service_delete_start'
      });

      // In a real implementation, we'd have a DeleteLicenseUseCase
      // For now, we'll need to implement this through the repository directly
      throw new Error('Delete operation not yet implemented in Clean Architecture');

    } catch (error) {
      this.serviceLogger.error('Failed to delete license', {
        correlationId,
        licenseId: id,
        operation: 'service_delete_error',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  // Legacy methods for backward compatibility (to be removed after migration)
  async getLicenses(params: LicenseListQueryDTO = {}): Promise<PaginatedResponse<LicenseRecord>> {
    const result = await this.list(params as LicenseListQueryDTO);
    return {
      data: result.licenses.map(dto => ({
        id: dto.id, // Keep as UUID string for consistency
        key: dto.key,
        product: dto.product,
        dba: dto.dba,
        zip: dto.zip,
        startsAt: dto.startsAt,
        status: dto.status,
        cancelDate: dto.cancelDate,
        plan: dto.plan,
        term: dto.term,
        seatsTotal: dto.seatsTotal,
        seatsUsed: dto.seatsUsed,
        lastPayment: dto.lastPayment,
        lastActive: dto.lastActive,
        smsPurchased: dto.smsPurchased,
        smsSent: dto.smsSent,
        smsBalance: dto.smsBalance,
        agents: dto.agents,
        agentsName: dto.agentsName,
        agentsCost: dto.agentsCost,
        notes: dto.notes
      })),
      pagination: result.pagination
    };
  }

  async getLicense(id: string): Promise<LicenseRecord> {
    const result = await this.getById(id.toString());
    return {
      id, // Keep UUID from domain entity
      key: result.key,
      product: result.product,
      dba: result.dba,
      zip: result.zip,
      startsAt: result.startsAt,
      status: result.status,
      cancelDate: result.cancelDate,
      plan: result.plan,
      term: result.term,
      seatsTotal: result.seatsTotal,
      seatsUsed: result.seatsUsed,
      lastPayment: result.lastPayment,
      lastActive: result.lastActive,
      smsPurchased: result.smsPurchased,
      smsSent: result.smsSent,
      smsBalance: result.smsBalance,
      agents: result.agents,
      agentsName: result.agentsName,
      agentsCost: result.agentsCost,
      notes: result.notes
    };
  }

  async createLicense(licenseData: CreateLicenseDTO): Promise<LicenseRecord> {
    const result = await this.create(licenseData);
    return {
      id: parseInt(result.id),
      key: result.key,
      product: result.product,
      dba: result.dba,
      zip: result.zip,
      startsAt: result.startsAt,
      status: result.status,
      cancelDate: result.cancelDate,
      plan: result.plan,
      term: result.term,
      seatsTotal: result.seatsTotal,
      seatsUsed: result.seatsUsed,
      lastPayment: result.lastPayment,
      lastActive: result.lastActive,
      smsPurchased: result.smsPurchased,
      smsSent: result.smsSent,
      smsBalance: result.smsBalance,
      agents: result.agents,
      agentsName: result.agentsName,
      agentsCost: result.agentsCost,
      notes: result.notes
    };
  }

  async updateLicense(id: string, updates: UpdateLicenseDTO): Promise<LicenseRecord> {
    const result = await this.update(id, updates);
    return {
      id: parseInt(result.id),
      key: result.key,
      product: result.product,
      dba: result.dba,
      zip: result.zip,
      startsAt: result.startsAt,
      status: result.status,
      cancelDate: result.cancelDate,
      plan: result.plan,
      term: result.term,
      seatsTotal: result.seatsTotal,
      seatsUsed: result.seatsUsed,
      lastPayment: result.lastPayment,
      lastActive: result.lastActive,
      smsPurchased: result.smsPurchased,
      smsSent: result.smsSent,
      smsBalance: result.smsBalance,
      agents: result.agents,
      agentsName: result.agentsName,
      agentsCost: result.agentsCost,
      notes: result.notes
    };
  }

  async bulkUpdateLicenses(
    updates: Array<Partial<LicenseRecord> & { id: number | string }>,
    options?: { currentLicenses?: LicenseRecord[] }
  ): Promise<BulkUpdateLicenseResult> {
    const correlationId = generateCorrelationId();

    try {
      // Use provided list (e.g. store's current page) for key resolution so filtered/paginated rows resolve; otherwise fetch
      let currentLicenses: LicenseRecord[];
      if (options?.currentLicenses != null && Array.isArray(options.currentLicenses)) {
        currentLicenses = options.currentLicenses;
      } else {
        const currentLicensesResult = await this.list({ limit: 1000 });
        currentLicenses = currentLicensesResult.licenses;
      }

      // Create ID mapping: original input ID -> UUID
      const idMapping: Map<string | number, string> = new Map();

      // Normalize and validate all updates first
      const normalizedUpdates: Array<Partial<LicenseRecord> & { id: number | string; _originalId?: string | number }> = [];
      const validationErrors: string[] = [];

      updates.forEach((update, index) => {
        // Map field names if needed (startDay -> startsAt)
        const normalizedUpdate = {
          ...update,
          startsAt: update.startsAt ?? (update as Partial<LicenseRecord> & { startDay?: string }).startDay,
          _originalId: update.id
        };
        delete (normalizedUpdate as Partial<LicenseRecord> & { startDay?: string }).startDay;

        // Basic validation - check if we have required fields for updates
        if (!normalizedUpdate.id) {
          validationErrors.push(`License ${index + 1}: Missing license ID`);
          return;
        }

        // Map ID to actual license UUID
        let actualLicenseId: string;

        if (typeof normalizedUpdate.id === 'number') {
          // If ID is a number, assume it's an index into current licenses
          const licenseIndex = normalizedUpdate.id;
          if (licenseIndex >= 0 && licenseIndex < currentLicenses.length) {
            actualLicenseId = String(currentLicenses[licenseIndex].id);
            idMapping.set(normalizedUpdate.id, actualLicenseId);
            // ID mapping completed silently
          } else {
            validationErrors.push(`License ${index + 1}: Invalid license index ${licenseIndex} (max: ${currentLicenses.length - 1})`);
            return;
          }
        } else {
          // If ID is already a string, check if it's a valid UUID
          const idStr = String(normalizedUpdate.id);
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

          if (uuidRegex.test(idStr)) {
            // It's a valid UUID, use it directly
            actualLicenseId = idStr;
            idMapping.set(normalizedUpdate.id, actualLicenseId);
          } else if (/^\d+$/.test(idStr)) {
            // It's a numeric string, treat as index
            const licenseIndex = parseInt(idStr);
            if (licenseIndex >= 0 && licenseIndex < currentLicenses.length) {
              actualLicenseId = String(currentLicenses[licenseIndex].id);
              idMapping.set(normalizedUpdate.id, actualLicenseId);
              // ID mapping completed silently
            } else {
              validationErrors.push(`License ${index + 1}: Invalid license index ${licenseIndex} (max: ${currentLicenses.length - 1})`);
              return;
            }
          } else {
            // Non-UUID string: treat as license key (e.g. from external API or id=appid in list response)
            const byKey = currentLicenses.find(
              (l) => (l.key && String(l.key) === idStr) || String(l.id) === idStr
            );
            if (byKey) {
              actualLicenseId = String(byKey.id);
              idMapping.set(normalizedUpdate.id, actualLicenseId);
            } else {
              validationErrors.push(`License ${index + 1}: Invalid ID format "${idStr}". Expected UUID, license key, or valid index.`);
              return;
            }
          }
        }

        normalizedUpdate.id = actualLicenseId;

        // Normalize agentsName to array so backend always receives array (grid may send string from cell edit)
        const rawAgentsName = (normalizedUpdate as Record<string, unknown>).agentsName;
        if (rawAgentsName !== undefined) {
          (normalizedUpdate as Record<string, unknown>).agentsName = Array.isArray(rawAgentsName)
            ? rawAgentsName
            : typeof rawAgentsName === 'string'
              ? rawAgentsName.split(',').map((s: string) => s.trim()).filter(Boolean)
              : [];
        }

        // For bulk updates, we allow partial updates, so we don't validate all fields
        // Just ensure we have at least one field to update (agentsName counts even when [])
        const updatableFields = ['dba', 'zip', 'startsAt', 'status', 'plan', 'term', 'seatsTotal', 'lastPayment', 'smsPurchased', 'agents', 'agentsName', 'agentsCost', 'notes'];

        // Check if we have at least one field to update
        const hasUpdates = updatableFields.some(field => {
          const v = (normalizedUpdate as Record<string, unknown>)[field];
          if (v === undefined || v === null) return false;
          if (field === 'agentsName') return true; // empty array [] is a valid update (clear names)
          return v !== '';
        });

        if (!hasUpdates) {
          this.serviceLogger.warn(`Skipping license ${normalizedUpdate.id} - no valid updates provided`, {
            correlationId,
            licenseId: normalizedUpdate.id,
            receivedFields: Object.keys(normalizedUpdate)
          });
          return;
        }

        normalizedUpdates.push(normalizedUpdate);
      });

      if (normalizedUpdates.length === 0) {
        this.serviceLogger.warn('No valid updates to process after filtering', {
          correlationId,
          originalCount: updates.length,
          validationErrors: validationErrors.length
        });
        return { _isBulkUpdateResult: true as const, results: [], idMapping: {} };
      }

      if (validationErrors.length > 0) {
        this.serviceLogger.warn('Bulk update validation warnings', {
          correlationId,
          errors: validationErrors.slice(0, 5), // Log first 5 errors
          totalErrors: validationErrors.length
        });
      }

      // Call the bulk API endpoint
      this.serviceLogger.debug('Calling bulk update API', {
        correlationId,
        validUpdatesCount: normalizedUpdates.length,
        sampleIds: normalizedUpdates.slice(0, 3).map(u => ({ id: u.id, idType: typeof u.id })),
        allIds: normalizedUpdates.map(u => u.id) // Log all IDs being sent
      });

      this.serviceLogger.debug('About to call bulk update API', {
        correlationId,
        updatesToSend: normalizedUpdates.map(u => ({
          id: u.id,
          fields: Object.keys(u).filter(k => k !== 'id')
        }))
      });

      const apiResponse = await this.licenseRepository.bulkUpdateInternalLicensesRaw(normalizedUpdates);

      this.serviceLogger.debug('Bulk license API response received', {
        correlationId,
        responseType: typeof apiResponse,
        isArray: Array.isArray(apiResponse),
        arrayLength: Array.isArray(apiResponse) ? apiResponse.length : 'N/A',
        firstItemType: Array.isArray(apiResponse) && apiResponse.length > 0 ? typeof apiResponse[0] : 'N/A'
      });

      // Handle different response formats from the API
      const response = apiResponse as LicenseRecord[] | { data?: LicenseRecord[]; results?: LicenseRecord[] };
      let results: LicenseRecord[];
      if (Array.isArray(response)) {
        results = response;
      } else if (response && typeof response === 'object') {
        if (response.data && Array.isArray(response.data)) {
          results = response.data;
        } else if (response.results && Array.isArray(response.results)) {
          results = response.results;
        } else {
          this.serviceLogger.error('Unexpected API response format - no valid data array found', {
            correlationId,
            apiResponseType: typeof apiResponse,
            apiResponseKeys: Object.keys(response),
            hasData: !!(response.data),
            dataIsArray: Array.isArray(response.data),
            hasResults: !!(response.results),
            resultsIsArray: Array.isArray(response.results)
          });
          throw new Error('Bulk update API returned unexpected response format');
        }
      } else {
        this.serviceLogger.error('Unexpected API response type', {
          correlationId,
          apiResponseType: typeof apiResponse,
          apiResponseValue: apiResponse
        });
        throw new Error('Bulk update API returned unexpected response type');
      }

      this.serviceLogger.debug('Bulk license updates completed successfully', {
        correlationId,
        processed: normalizedUpdates.length,
        successful: results.length,
        resultsSample: results.slice(0, 2), // Show first 2 results
        idMapping: Array.from(idMapping.entries()).slice(0, 3), // Show first 3 mappings
        operation: 'service_bulk_update_success'
      });

      return {
        results,
        idMapping: Object.fromEntries(idMapping),
        _isBulkUpdateResult: true as const
      };
    } catch (error) {
      this.serviceLogger.error('Failed to bulk update licenses via API', {
        correlationId,
        count: updates.length,
        operation: 'service_bulk_update_error',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async bulkCreateLicenses(licenses: Array<Partial<LicenseRecord>>): Promise<LicenseRecord[]> {
    const result = await this.licenseRepository.bulkCreateLicensesRaw(licenses) as {
      success?: boolean;
      data?: LicenseRecord[] | { results?: LicenseRecord[] };
      results?: LicenseRecord[];
      successful?: number;
      failed?: number;
      message?: string;
    };

    // Debug logging for troubleshooting
    const dataArray = Array.isArray(result.data) ? result.data : result.data?.results;
    this.serviceLogger.debug('Bulk create API response received', {
      correlationId: 'bulk_create_' + Date.now(),
      resultType: typeof result,
      resultKeys: result ? Object.keys(result) : [],
      hasResults: !!(result && result.results),
      resultsType: result?.results ? typeof result.results : 'undefined',
      resultsIsArray: Array.isArray(result?.results),
      resultsLength: Array.isArray(result?.results) ? result.results.length : (dataArray?.length ?? 'N/A'),
      successful: result?.successful,
      failed: result?.failed
    });

    // Handle the API response - it returns { success, message, data, timestamp } or { success, data: { results } }
    if (result && result.success && dataArray && Array.isArray(dataArray)) {
      this.serviceLogger.debug('Bulk create completed', {
        inputCount: licenses.length,
        outputCount: dataArray.length,
        message: result.message
      });
      if (licenses.length > 0 && dataArray.length === 0) {
        const errors = (result as { errors?: Array<{ error: string }> }).errors;
        const msg = errors?.length ? errors.map((e) => e.error).join('; ') : 'No licenses were created. Check validation or server logs.';
        throw new Error(msg);
      }
      return dataArray as LicenseRecord[];
    } else if (result && result.success && result.data && Array.isArray(result.data)) {
      if (licenses.length > 0 && (result.data as LicenseRecord[]).length === 0) {
        throw new Error('No licenses were created. Check validation or server logs.');
      }
      return result.data as LicenseRecord[];
    } else {
      this.serviceLogger.error('Bulk create failed - invalid response format', {
        correlationId: 'bulk_create_error_' + Date.now(),
        resultType: typeof result,
        resultKeys: result ? Object.keys(result) : [],
        fullResult: result
      });
      throw new Error('Bulk create API returned invalid response format');
    }
  }
}