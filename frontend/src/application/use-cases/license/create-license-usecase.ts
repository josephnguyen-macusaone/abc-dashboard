import { LicenseRecord } from '@/shared/types';
import { licenseApiService, LicenseServiceContract } from '@/application/services/license-services';
import logger, { generateCorrelationId } from '@/shared/utils/logger';

/**
 * Application Use Case: Create License
 * Handles creating new licenses
 */
export interface CreateLicenseUseCaseContract {
  execute(licenseData: Omit<LicenseRecord, 'id' | 'smsBalance' | 'createdAt' | 'updatedAt'>): Promise<LicenseRecord>;
}


export class CreateLicenseUseCase implements CreateLicenseUseCaseContract {
  private readonly useCaseLogger = logger.createChild({
    component: 'CreateLicenseUseCase',
  });

  constructor(private readonly licenseService: LicenseServiceContract) {}

  async execute(licenseData: Omit<LicenseRecord, 'id' | 'smsBalance' | 'createdAt' | 'updatedAt'>): Promise<LicenseRecord> {
    const correlationId = generateCorrelationId();

    try {
      const response = await this.licenseService.create(licenseData);

      if (!response.data?.license) {
        throw new Error('Invalid response: license data not found');
      }

      return response.data.license;
    } catch (error) {
      this.useCaseLogger.error(`Failed to create license`, {
        correlationId,
        operation: 'create_license_usecase_error',
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(`Failed to create license: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

