import { License } from '@/domain/entities/license-entity';
import { ILicenseRepository, LicenseSpecification, LicenseSortField } from '@/domain/repositories/i-license-repository';
import { LicenseListQueryDTO, PaginatedLicenseListDTO } from '@/application/dto/license-dto';
import logger, { generateCorrelationId } from '@/shared/helpers/logger';

/**
 * Application Use Case: Get Licenses
 * Handles fetching licenses with pagination, search, and filtering following Clean Architecture
 */
export interface GetLicensesUseCase {
  execute(params?: LicenseListQueryDTO): Promise<PaginatedLicenseListDTO>;
}

export class GetLicensesUseCaseImpl implements GetLicensesUseCase {
  private readonly useCaseLogger = logger.createChild({
    component: 'GetLicensesUseCase',
  });

  constructor(private readonly licenseRepository: ILicenseRepository) {}

  async execute(params: LicenseListQueryDTO = {}): Promise<PaginatedLicenseListDTO> {
    const correlationId = generateCorrelationId();

    try {
      // Silent operation

      // Convert DTO to domain specification
      // Convert array filters to comma-separated strings for specification
      const planValue = Array.isArray(params.plan)
        ? params.plan.join(',')
        : params.plan;
      const termValue = Array.isArray(params.term)
        ? params.term.join(',')
        : params.term ? String(params.term) : undefined;

      const specification: LicenseSpecification = {
        // Only set dba when not doing a general search (so we never send searchField=dba for search-bar searches)
        dba: params.dba && !params.search ? params.dba : undefined,
        status: typeof params.status === 'string' ? params.status : undefined,
        plan: planValue,
        term: termValue,
        pagination: params.page && params.limit ? {
          page: params.page,
          limit: params.limit
        } : undefined,
        sort: params.sortBy ? {
          field: params.sortBy as LicenseSortField,
          direction: params.sortOrder === 'desc' ? 'desc' : 'asc'
        } : undefined
      };

      // General search: backend matches DBA and agent names when searchField is not set
      if (params.search) {
        specification.search = params.search;
        if (params.searchField) {
          specification.searchField = params.searchField;
        }
      }

      // Filter by license start date (starts_at)
      if (params.startsAtFrom) specification.startsAtFrom = params.startsAtFrom;
      if (params.startsAtTo) specification.startsAtTo = params.startsAtTo;

      // Add expiring filter
      if (params.expiringWithin) {
        specification.expiringWithin = params.expiringWithin;
      }

      // Get licenses from repository (returns paginated results with total count)
      const repoResult = await this.licenseRepository.findAll(specification);

      // Extract data from repository result
      const { licenses, total, pagination: repoPagination } = repoResult;

      // Use repository pagination info, fallback to calculated values
      const page = repoPagination?.page || params.page || 1;
      const limit = repoPagination?.limit || params.limit || 10;
      const totalPages = repoPagination?.totalPages || Math.ceil(total / limit);

      // Convert domain entities to response DTOs
      const licenseDTOs = licenses.map(license => ({
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
      }));

      // Statistics are not needed for basic license listing
      // They can be fetched separately when needed for dashboard/analytics
      const statistics = undefined;

      const result: PaginatedLicenseListDTO = {
        licenses: licenseDTOs,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: repoPagination?.hasNext ?? (page < totalPages),
          hasPrev: repoPagination?.hasPrev ?? (page > 1)
        },
        statistics
      };

      // Silent operation

      return result;
    } catch (error) {
      this.useCaseLogger.error('Failed to fetch licenses', {
        correlationId,
        params,
        operation: 'get_licenses_error',
        error: error instanceof Error ? error.message : String(error)
      });
      throw new Error(`Failed to fetch licenses: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

