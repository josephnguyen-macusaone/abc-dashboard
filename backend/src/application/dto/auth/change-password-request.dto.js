/**
 * Change Password Request DTO
 * Represents input data for password change
 */
import { BaseDto } from '../common/base.dto.js';
import { ValidationException } from '../../../domain/exceptions/domain.exception.js';

export class ChangePasswordRequestDto extends BaseDto {
  constructor({ currentPassword, newPassword }) {
    super();
    this.currentPassword = currentPassword;
    this.newPassword = newPassword;
  }

  /**
   * Create from Express request body
   * @param {Object} body - Request body
   * @returns {ChangePasswordRequestDto}
   */
  static fromRequest(body) {
    return new ChangePasswordRequestDto({
      currentPassword: body.currentPassword,
      newPassword: body.newPassword,
    });
  }

  /**
   * Validate the DTO
   * @throws {ValidationException} If validation fails
   * @returns {boolean} True if valid
   */
  validate() {
    const errors = [];

    if (!this.currentPassword || typeof this.currentPassword !== 'string') {
      errors.push({
        field: 'currentPassword',
        message: 'Current password is required and must be a string',
      });
    }

    if (!this.newPassword || typeof this.newPassword !== 'string') {
      errors.push({
        field: 'newPassword',
        message: 'New password is required and must be a string',
      });
    } else if (this.newPassword.length < 8) {
      errors.push({
        field: 'newPassword',
        message: 'New password must be at least 8 characters long',
      });
    } else if (this.currentPassword === this.newPassword) {
      errors.push({
        field: 'newPassword',
        message: 'New password must be different from current password',
      });
    }

    if (errors.length > 0) {
      throw new ValidationException(errors.map((e) => e.message).join(', '));
    }

    return true;
  }
}

export default ChangePasswordRequestDto;
