import { License } from '@/domain/entities/license-entity';
import { ILicenseRepository, LicenseSpecification } from '@/domain/repositories/i-license-repository';
import { LicenseListQueryDTO, PaginatedLicenseListDTO } from '@/application/dto/license-dto';
import logger, { generateCorrelationId } from '@/shared/utils/logger';

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
      const specification: LicenseSpecification = {
        dba: params.dba,
        status: params.status,
        plan: params.plan,
        term: params.term,
        pagination: params.page && params.limit ? {
          page: params.page,
          limit: params.limit
        } : undefined,
        sort: params.sortBy ? {
          field: params.sortBy as any, // Type assertion needed due to DTO vs domain type differences
          direction: params.sortOrder === 'desc' ? 'desc' : 'asc'
        } : undefined
      };

      // Add search if specified
      if (params.search) {
        specification.dba = params.search; // For now, search in DBA field
      }

      // Add date filters if specified
      if (params.startsAtFrom || params.startsAtTo) {
        specification.expiresBetween = {
          from: params.startsAtFrom ? new Date(params.startsAtFrom) : new Date('2000-01-01'),
          to: params.startsAtTo ? new Date(params.startsAtTo) : new Date('2100-12-31')
        };
      }

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

