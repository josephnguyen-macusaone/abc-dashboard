import { LicenseRecord } from '@/types';
import { licenseApiService } from '@/application/services/license-services';
import logger, { generateCorrelationId } from '@/shared/helpers/logger';

/**
 * Application Use Case: Bulk Create Licenses
 * Handles bulk creating multiple licenses
 */
export interface BulkCreateLicensesUseCaseContract {
  execute(licenses: Array<Omit<LicenseRecord, 'id' | 'smsBalance' | 'createdAt' | 'updatedAt'>>): Promise<LicenseRecord[]>;
}

export function createBulkCreateLicensesUseCase(): BulkCreateLicensesUseCaseContract {
  const useCaseLogger = logger.createChild({
    component: 'BulkCreateLicensesUseCase',
  });

  return {
    async execute(licenses: Array<Omit<LicenseRecord, 'id' | 'smsBalance' | 'createdAt' | 'updatedAt'>>): Promise<LicenseRecord[]> {
      const correlationId = generateCorrelationId();

      try {
        const response = await licenseApiService.bulkCreate(licenses);

        if (!Array.isArray(response.data)) {
          throw new Error('Invalid response: licenses data not found');
        }

        return response.data;
      } catch (error) {
        useCaseLogger.error(`Failed to bulk create licenses`, {
          correlationId,
          count: licenses.length,
          operation: 'bulk_create_licenses_usecase_error',
          error: error instanceof Error ? error.message : String(error),
        });
        throw new Error(`Failed to bulk create licenses: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
  };
}

export class BulkCreateLicensesUseCase implements BulkCreateLicensesUseCaseContract {
  private readonly useCaseLogger = logger.createChild({
    component: 'BulkCreateLicensesUseCase',
  });

  constructor(private readonly licenseService: any) {}

  async execute(licenses: Array<Omit<LicenseRecord, 'id' | 'smsBalance' | 'createdAt' | 'updatedAt'>>): Promise<LicenseRecord[]> {
    const correlationId = generateCorrelationId();

    try {
      const response = await this.licenseService.bulkCreate(licenses);

      if (!Array.isArray(response.data)) {
        throw new Error('Invalid response: licenses data not found');
      }

      return response.data;
    } catch (error) {
      this.useCaseLogger.error(`Failed to bulk create licenses`, {
        correlationId,
        count: licenses.length,
        operation: 'bulk_create_licenses_usecase_error',
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(`Failed to bulk create licenses: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}