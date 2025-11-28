/**
 * Refresh Token Request DTO
 * Represents input data for token refresh
 */
import { BaseDto } from '../common/base.dto.js';
import { ValidationException } from '../../../domain/exceptions/domain.exception.js';

export class RefreshTokenRequestDto extends BaseDto {
  constructor({ refreshToken }) {
    super();
    this.refreshToken = refreshToken;
  }

  /**
   * Create from Express request body
   * @param {Object} body - Request body
   * @returns {RefreshTokenRequestDto}
   */
  static fromRequest(body) {
    return new RefreshTokenRequestDto({
      refreshToken: body.refreshToken,
    });
  }

  /**
   * Validate the DTO
   * @throws {ValidationException} If validation fails
   * @returns {boolean} True if valid
   */
  validate() {
    const errors = [];

    if (!this.refreshToken || typeof this.refreshToken !== 'string') {
      errors.push({
        field: 'refreshToken',
        message: 'Refresh token is required and must be a string',
      });
    } else if (this.refreshToken.trim().length === 0) {
      errors.push({ field: 'refreshToken', message: 'Refresh token cannot be empty' });
    }

    if (errors.length > 0) {
      throw new ValidationException(errors.map((e) => e.message).join(', '));
    }

    return true;
  }
}

export default RefreshTokenRequestDto;
