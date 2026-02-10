/**
 * User List Response DTO
 * Represents paginated list of users
 */
import { BaseDto } from '../common/base.dto.js';
import { PaginationDto } from '../common/pagination.dto.js';
import { UserResponseDto } from './user-response.dto.js';

export class UserListResponseDto extends BaseDto {
  constructor({ users, pagination, stats }) {
    super();
    this.users = users;
    this.pagination =
      pagination instanceof PaginationDto ? pagination : new PaginationDto(pagination);
    this.stats = stats;
  }

  /**
   * Create from use case result
   * @param {Object} result - GetUsers use case result
   * @returns {UserListResponseDto}
   */
  static fromUseCase(result) {
    return new UserListResponseDto({
      users: result.users.map((user) => UserResponseDto.fromEntity(user)),
      pagination: new PaginationDto({
        page: result.pagination.page,
        limit: result.pagination.limit,
        totalPages: result.pagination.totalPages,
      }),
      stats: result.stats,
    });
  }

  /**
   * Get data for API response
   * @returns {Array} Array of user objects
   */
  getData() {
    return this.users;
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

export default UserListResponseDto;
