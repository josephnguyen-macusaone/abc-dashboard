import { LicenseRecord } from '@/shared/types';
import { licenseService, LicenseServiceContract } from '@/application/services/license-management-service';

/**
 * Update License Use Case
 * Handles updating existing licenses
 */
export interface UpdateLicenseUseCaseContract {
  execute(id: number, updates: Partial<LicenseRecord>): Promise<LicenseRecord>;
}

export class UpdateLicenseUseCase implements UpdateLicenseUseCaseContract {
  constructor(private readonly licenseService: LicenseServiceContract) {}

  async execute(id: number, updates: Partial<LicenseRecord>): Promise<LicenseRecord> {
    try {
      const response = await this.licenseService.update(id, updates);

      if (!response.data?.license) {
        throw new Error('Invalid response: license data not found');
      }

      return response.data.license;
    } catch (error) {
      throw new Error(`Failed to update license: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * Factory function to create UpdateLicenseUseCase
 */
export function createUpdateLicenseUseCase(): UpdateLicenseUseCase {
  return new UpdateLicenseUseCase(licenseService);
}
