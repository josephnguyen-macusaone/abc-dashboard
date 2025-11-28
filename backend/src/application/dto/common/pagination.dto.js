/**
 * Pagination DTO
 * Represents pagination metadata for list responses
 */
import { BaseDto } from './base.dto.js';

export class PaginationDto extends BaseDto {
  constructor({ page = 1, limit = 10, total = 0, totalPages = 0 }) {
    super();
    this.page = page;
    this.limit = limit;
    this.total = total;
    this.totalPages = totalPages || Math.ceil(total / limit);
    this.hasNext = page < this.totalPages;
    this.hasPrev = page > 1;
  }

  /**
   * Create pagination from query parameters
   * @param {Object} query - Request query object
   * @param {number} total - Total count of items
   * @returns {PaginationDto}
   */
  static fromQuery(query, total) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    return new PaginationDto({ page, limit, total });
  }
}

export default PaginationDto;
