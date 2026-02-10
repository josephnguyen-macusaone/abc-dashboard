/**
 * Login Request DTO
 * Represents input data for user login
 */
import { BaseDto } from '../common/base.dto.js';
import { ValidationException } from '../../../domain/exceptions/domain.exception.js';

export class LoginRequestDto extends BaseDto {
  constructor({ email, password }) {
    super();
    this.email = email;
    this.password = password;
  }

  /**
   * Create from Express request body
   * @param {Object} body - Request body
   * @returns {LoginRequestDto}
   */
  static fromRequest(body) {
    return new LoginRequestDto({
      email: body.email,
      password: body.password,
    });
  }

  /**
   * Validate the DTO
   * @throws {ValidationException} If validation fails
   * @returns {boolean} True if valid
   */
  validate() {
    const errors = [];

    if (!this.email || typeof this.email !== 'string') {
      errors.push({ field: 'email', message: 'Email is required and must be a string' });
    } else if (!this.email.includes('@')) {
      errors.push({ field: 'email', message: 'Valid email format is required' });
    }

    if (!this.password || typeof this.password !== 'string') {
      errors.push({ field: 'password', message: 'Password is required and must be a string' });
    }

    if (errors.length > 0) {
      throw new ValidationException(errors.map((e) => e.message).join(', '));
    }

    return true;
  }
}

export default LoginRequestDto;
