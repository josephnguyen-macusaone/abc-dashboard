import { LicenseRecord, LicenseStatus } from '@/shared/types';
import { PaginatedResponse } from '@/shared/types';
import { licenseApiService, LicenseListQuery, LicenseServiceContract } from '@/application/services/license-services';
import logger, { generateCorrelationId } from '@/shared/utils/logger';

/**
 * Application Use Case: Get Licenses
 * Handles fetching licenses with pagination, search, and filtering
 */
export interface GetLicensesUseCaseContract {
  execute(params?: LicenseListQuery): Promise<PaginatedResponse<LicenseRecord>>;
}


export class GetLicensesUseCase implements GetLicensesUseCaseContract {
  private readonly useCaseLogger = logger.createChild({
    component: 'GetLicensesUseCase',
  });

  constructor(private readonly licenseService: LicenseServiceContract) {}

  async execute(params: LicenseListQuery = {}): Promise<PaginatedResponse<LicenseRecord>> {
    const correlationId = generateCorrelationId();

    try {
      const response = await this.licenseService.list(params);

      return {
        data: response.data,
        pagination: {
          page: response.meta.pagination.page,
          limit: response.meta.pagination.limit,
          totalPages: response.meta.pagination.totalPages,
          total: response.meta.stats?.total || 0,
          hasNext: response.meta.pagination.hasNext,
          hasPrev: response.meta.pagination.hasPrev,
        },
      };
    } catch (error) {
      this.useCaseLogger.error(`Failed to fetch licenses`, {
        correlationId,
        params,
        operation: 'get_licenses_usecase_error',
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(`Failed to fetch licenses: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

