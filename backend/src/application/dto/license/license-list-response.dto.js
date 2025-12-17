/**
 * License List Response DTO
 * Represents paginated list of licenses
 */
import { BaseDto } from '../common/base.dto.js';
import { PaginationDto } from '../common/pagination.dto.js';
import { LicenseResponseDto } from './license-response.dto.js';

export class LicenseListResponseDto extends BaseDto {
  constructor({ licenses, pagination, total, stats }) {
    super();
    this.licenses = licenses;
    this.pagination =
      pagination instanceof PaginationDto ? pagination : new PaginationDto(pagination);
    this.total = total;
    this.stats = stats;
  }

  /**
   * Create from use case result
   * @param {Object} result - GetLicenses use case result
   * @returns {LicenseListResponseDto}
   */
  static fromUseCase(result) {
    return new LicenseListResponseDto({
      licenses: result.licenses.map((license) => LicenseResponseDto.fromEntity(license)),
      pagination: new PaginationDto({
        page: result.pagination.page,
        limit: result.pagination.limit,
        total: result.pagination.total,
        totalPages: result.pagination.totalPages,
      }),
    });
  }

  /**
   * Get data for API response
   * @returns {Array} Array of license objects
   */
  getData() {
    return this.licenses;
  }

  /**
   * Get pagination meta
   * @returns {Object} Pagination metadata with stats
   */
  getMeta() {
    return {
      pagination: this.pagination.toJSON ? this.pagination.toJSON() : this.pagination,
      stats: this.stats,
    };
  }
}

export default LicenseListResponseDto;
