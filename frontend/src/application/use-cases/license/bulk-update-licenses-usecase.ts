import { LicenseRecord } from '@/shared/types';
import { licenseApiService } from '@/application/services/license-services';
import logger, { generateCorrelationId } from '@/shared/utils/logger';

/**
 * License Service Interface
 */
export interface LicenseServiceContract {
  bulkUpdate(updates: Partial<LicenseRecord>[]): Promise<{ data: LicenseRecord[] }>;
}

/**
 * Application Use Case: Bulk Update Licenses
 * Handles bulk updating multiple licenses
 */
export interface BulkUpdateLicensesUseCaseContract {
  execute(updates: Partial<LicenseRecord>[]): Promise<LicenseRecord[]>;
}


export class BulkUpdateLicensesUseCase implements BulkUpdateLicensesUseCaseContract {
  private readonly useCaseLogger = logger.createChild({
    component: 'BulkUpdateLicensesUseCase',
  });

  constructor(private readonly licenseService: LicenseServiceContract) {}

  async execute(updates: Partial<LicenseRecord>[]): Promise<LicenseRecord[]> {
    const correlationId = generateCorrelationId();

    try {
      const response = await this.licenseService.bulkUpdate(updates);

      if (!Array.isArray(response.data)) {
        throw new Error('Invalid response: licenses data not found');
      }

      return response.data;
    } catch (error) {
      this.useCaseLogger.error(`Failed to bulk update licenses`, {
        correlationId,
        count: updates.length,
        operation: 'bulk_update_licenses_usecase_error',
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(`Failed to bulk update licenses: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

