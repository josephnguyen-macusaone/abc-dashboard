import { LicenseRecord } from '@/shared/types';
import { licenseApiService, LicenseServiceContract } from '@/application/services/license-services';
import logger, { generateCorrelationId } from '@/shared/utils/logger';

/**
 * Application Use Case: Update License
 * Handles updating existing licenses
 */
export interface UpdateLicenseUseCaseContract {
  execute(id: number, updates: Partial<LicenseRecord>): Promise<LicenseRecord>;
}


export class UpdateLicenseUseCase implements UpdateLicenseUseCaseContract {
  private readonly useCaseLogger = logger.createChild({
    component: 'UpdateLicenseUseCase',
  });

  constructor(private readonly licenseService: LicenseServiceContract) {}

  async execute(id: number, updates: Partial<LicenseRecord>): Promise<LicenseRecord> {
    const correlationId = generateCorrelationId();

    try {
      const response = await this.licenseService.update(id, updates);

      if (!response.data?.license) {
        throw new Error('Invalid response: license data not found');
      }

      return response.data.license;
    } catch (error) {
      this.useCaseLogger.error(`Failed to update license`, {
        correlationId,
        licenseId: id,
        operation: 'update_license_usecase_error',
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(`Failed to update license: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

