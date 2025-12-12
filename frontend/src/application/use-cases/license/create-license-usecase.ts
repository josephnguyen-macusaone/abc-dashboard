import { LicenseRecord } from '@/shared/types';
import { licenseService, LicenseServiceContract } from '@/application/services/license-management-service';

/**
 * Create License Use Case
 * Handles creating new licenses
 */
export interface CreateLicenseUseCaseContract {
  execute(licenseData: Omit<LicenseRecord, 'id' | 'smsBalance' | 'createdAt' | 'updatedAt'>): Promise<LicenseRecord>;
}

export class CreateLicenseUseCase implements CreateLicenseUseCaseContract {
  constructor(private readonly licenseService: LicenseServiceContract) {}

  async execute(licenseData: Omit<LicenseRecord, 'id' | 'smsBalance' | 'createdAt' | 'updatedAt'>): Promise<LicenseRecord> {
    try {
      const response = await this.licenseService.create(licenseData);

      if (!response.data?.license) {
        throw new Error('Invalid response: license data not found');
      }

      return response.data.license;
    } catch (error) {
      throw new Error(`Failed to create license: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * Factory function to create CreateLicenseUseCase
 */
export function createCreateLicenseUseCase(): CreateLicenseUseCase {
  return new CreateLicenseUseCase(licenseService);
}
