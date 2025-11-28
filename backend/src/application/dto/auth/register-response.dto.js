/**
 * Register Response DTO
 * Represents the response data for a successful registration
 */
import { BaseDto } from '../common/base.dto.js';
import { UserAuthDto } from './user-auth.dto.js';

export class RegisterResponseDto extends BaseDto {
  constructor({ user, message = 'Registration successful', requiresVerification = true }) {
    super();
    this.user = user instanceof UserAuthDto ? user : new UserAuthDto(user);
    this.message = message;
    this.requiresVerification = requiresVerification;
  }

  /**
   * Create from use case result
   * @param {Object} result - Register use case result
   * @returns {RegisterResponseDto}
   */
  static fromUseCase(result) {
    return new RegisterResponseDto({
      user: UserAuthDto.fromEntity(result.user),
      message: result.message,
      requiresVerification: !result.user.isActive,
    });
  }
}

export default RegisterResponseDto;
