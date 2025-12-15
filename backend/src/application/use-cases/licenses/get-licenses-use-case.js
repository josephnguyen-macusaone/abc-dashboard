/**
 * Get Licenses Use Case
 * Handles retrieving licenses with pagination and filtering
 */
import { LicenseListResponseDto, LicenseResponseDto } from '../../dto/license/index.js';
import { PaginationDto } from '../../dto/common/index.js';

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
      const result = await this.licenseRepository.findLicenses(options);

      // Get total from stats instead of pagination
      const total = result.stats?.total || 0;
      const limit = options.limit || 10;
      const totalPages = Math.ceil(total / limit);

      return new LicenseListResponseDto({
        licenses: result.licenses.map((license) => LicenseResponseDto.fromEntity(license)),
        pagination: new PaginationDto({
          page: result.page,
          limit: limit,
          totalPages: result.totalPages || totalPages,
        }),
        total: total,
        stats: result.stats,
      });
    } catch (error) {
      throw new Error(`Failed to get licenses: ${error.message}`);
    }
  }
}
