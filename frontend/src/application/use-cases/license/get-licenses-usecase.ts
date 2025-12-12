import { LicenseRecord, LicenseStatus } from '@/shared/types';
import { PaginatedResponse } from '@/shared/types';
import { licenseService, LicenseListQuery, LicenseServiceContract } from '@/application/services/license-management-service';

/**
 * Get Licenses Use Case
 * Handles fetching licenses with pagination, search, and filtering
 */
export interface GetLicensesUseCaseContract {
  execute(params?: LicenseListQuery): Promise<PaginatedResponse<LicenseRecord>>;
}

export class GetLicensesUseCase implements GetLicensesUseCaseContract {
  constructor(private readonly licenseService: LicenseServiceContract) {}

  async execute(params: LicenseListQuery = {}): Promise<PaginatedResponse<LicenseRecord>> {
    try {
      const response = await this.licenseService.list(params);

      return {
        data: response.data,
        pagination: response.pagination,
      };
    } catch (error) {
      throw new Error(`Failed to fetch licenses: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * Factory function to create GetLicensesUseCase
 */
export function createGetLicensesUseCase(): GetLicensesUseCase {
  return new GetLicensesUseCase(licenseService);
}
