/**
 * Get Licenses Use Case
 * Handles retrieving licenses with pagination and filtering
 */
import { LicenseListResponseDto, LicenseResponseDto } from '../../dto/license/index.js';
import { PaginationDto } from '../../dto/common/index.js';
import logger from '../../../infrastructure/config/logger.js';

export class GetLicensesUseCase {
  constructor(licenseRepository) {
    this.licenseRepository = licenseRepository;
  }

  /**
   * Execute get licenses use case
   * @param {Object} options - Query options (page, limit, filters, sortBy, sortOrder)
   * @returns {Promise<LicenseListResponseDto>} Paginated list of licenses
   */
  async execute(options = {}) {
    try {
      logger.debug('GetLicensesUseCase.execute called', {
        hasFilters: !!(options.filters && Object.keys(options.filters).length > 0),
        filters: Object.keys(options.filters || {}),
      });

      const result = await this.licenseRepository.findLicenses(options);

      logger.debug('GetLicensesUseCase repository returned', {
        licensesCount: result?.licenses?.length || 0,
        total: result?.total,
        statsTotal: result?.stats?.total,
        page: result?.page,
        totalPages: result?.totalPages,
      });

      // Get total from stats instead of pagination
      const total = result.stats?.total || 0;
      const limit = options.limit || 10;
      const totalPages = Math.ceil(total / limit);

      const responseDto = new LicenseListResponseDto({
        licenses: result.licenses.map((license) => LicenseResponseDto.fromEntity(license)),
        pagination: new PaginationDto({
          page: result.page,
          limit: limit,
          totalPages: result.totalPages || totalPages,
        }),
        total: total,
        stats: result.stats,
      });

      logger.debug('GetLicensesUseCase returning DTO', {
        licensesCount: responseDto.licenses?.length || 0,
        total: responseDto.total,
        paginationTotalPages: responseDto.pagination?.totalPages,
      });

      return responseDto;
    } catch (error) {
      logger.error('GetLicensesUseCase error', { error: error.message, stack: error.stack });
      throw new Error(`Failed to get licenses: ${error.message}`);
    }
  }
}
