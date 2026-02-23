/**
 * Create User Request DTO
 * Represents input data for creating a new user
 */
import { BaseDto } from '../common/base.dto.js';
import { ValidationException } from '../../../domain/exceptions/domain.exception.js';

export class CreateUserRequestDto extends BaseDto {
  constructor({
    username,
    email,
    displayName,
    role = 'staff',
    avatarUrl = null,
    phone = null,
    managedBy = null,
    createdBy = null,
  }) {
    super();
    this.username = username;
    this.email = email;
    this.displayName = displayName;
    this.role = role;
    this.avatarUrl = avatarUrl;
    this.phone = phone;
    this.managedBy = managedBy;
    this.createdBy = createdBy;
  }

  /**
   * Create from Express request body
   * @param {Object} body - Request body
   * @returns {CreateUserRequestDto}
   */
  static fromRequest(body) {
    // Handle displayName construction from firstName + lastName if displayName is not provided
    let displayName = body.displayName;
    if (!displayName && (body.firstName || body.lastName)) {
      displayName = [body.firstName, body.lastName].filter(Boolean).join(' ').trim();
    }

    // Auto-generate username from email if not provided (since we use email for login)
    let username = body.username;
    if (!username && body.email) {
      username = body.email
        .split('@')[0]
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '');
    }

    return new CreateUserRequestDto({
      username,
      email: body.email,
      displayName,
      role: body.role,
      avatarUrl: body.avatarUrl,
      phone: body.phone,
      managedBy: body.managedBy,
      createdBy: body.createdBy,
    });
  }

  /**
   * Validate the DTO
   * @throws {ValidationException} If validation fails
   * @returns {boolean} True if valid
   */
  validate() {
    const errors = [];

    // Username is now optional - auto-generated from email if not provided
    if (this.username && this.username.trim().length < 3) {
      errors.push({
        field: 'username',
        message: 'Username must be at least 3 characters if provided',
      });
    }

    if (!this.email || !this.email.includes('@')) {
      errors.push({ field: 'email', message: 'Valid email is required' });
    }

    if (!this.displayName || this.displayName.trim().length === 0) {
      errors.push({ field: 'displayName', message: 'Display name is required' });
    }

    const validRoles = ['admin', 'manager', 'staff'];
    if (this.role && !validRoles.includes(this.role)) {
      errors.push({ field: 'role', message: `Role must be one of: ${validRoles.join(', ')}` });
    }

    if (errors.length > 0) {
      throw new ValidationException(errors.map((e) => e.message).join(', '));
    }

    return true;
  }
}

export default CreateUserRequestDto;
