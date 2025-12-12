import { LicenseRecord } from '@/shared/types';
import { licenseService } from '@/application/services/license-management-service';

/**
 * License Service Interface
 */
export interface LicenseServiceContract {
  bulkUpdate(updates: Partial<LicenseRecord>[]): Promise<{ data: LicenseRecord[] }>;
}

/**
 * Bulk Update Licenses Use Case
 * Handles bulk updating multiple licenses
 */
export interface BulkUpdateLicensesUseCaseContract {
  execute(updates: Partial<LicenseRecord>[]): Promise<LicenseRecord[]>;
}

export class BulkUpdateLicensesUseCase implements BulkUpdateLicensesUseCaseContract {
  constructor(private readonly licenseService: LicenseServiceContract) {}

  async execute(updates: Partial<LicenseRecord>[]): Promise<LicenseRecord[]> {
    try {
      const response = await this.licenseService.bulkUpdate(updates);

      if (!Array.isArray(response.data)) {
        throw new Error('Invalid response: licenses data not found');
      }

      return response.data;
    } catch (error) {
      throw new Error(`Failed to bulk update licenses: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * Factory function to create BulkUpdateLicensesUseCase
 */
export function createBulkUpdateLicensesUseCase(): BulkUpdateLicensesUseCase {
  return new BulkUpdateLicensesUseCase(licenseService);
}
