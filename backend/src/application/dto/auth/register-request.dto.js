/**
 * Register Request DTO
 * Represents input data for user registration
 */
import { BaseDto } from '../common/base.dto.js';
import { ValidationException } from '../../../domain/exceptions/domain.exception.js';

export class RegisterRequestDto extends BaseDto {
  constructor({ username, email, password, firstName, lastName, avatarUrl, bio, phone }) {
    super();
    this.username = username;
    this.email = email;
    this.password = password;
    this.firstName = firstName;
    this.lastName = lastName;
    this.avatarUrl = avatarUrl;
    this.bio = bio;
    this.phone = phone;
  }

  /**
   * Create from Express request body
   * @param {Object} body - Request body
   * @returns {RegisterRequestDto}
   */
  static fromRequest(body) {
    return new RegisterRequestDto({
      username: body.username,
      email: body.email,
      password: body.password,
      firstName: body.firstName,
      lastName: body.lastName,
      avatarUrl: body.avatarUrl,
      bio: body.bio,
      phone: body.phone,
    });
  }

  /**
   * Validate the DTO
   * @throws {ValidationException} If validation fails
   * @returns {boolean} True if valid
   */
  validate() {
    const errors = [];

    if (!this.username || typeof this.username !== 'string') {
      errors.push({ field: 'username', message: 'Username is required and must be a string' });
    } else if (this.username.length < 3 || this.username.length > 30) {
      errors.push({ field: 'username', message: 'Username must be between 3 and 30 characters' });
    } else if (!/^[a-zA-Z0-9_]+$/.test(this.username)) {
      errors.push({
        field: 'username',
        message: 'Username can only contain letters, numbers, and underscores',
      });
    }

    if (!this.email || typeof this.email !== 'string') {
      errors.push({ field: 'email', message: 'Email is required and must be a string' });
    } else if (!this.email.includes('@')) {
      errors.push({ field: 'email', message: 'Valid email format is required' });
    }

    if (!this.password || typeof this.password !== 'string') {
      errors.push({ field: 'password', message: 'Password is required and must be a string' });
    } else if (this.password.length < 8) {
      errors.push({ field: 'password', message: 'Password must be at least 8 characters long' });
    }

    if (this.firstName && typeof this.firstName !== 'string') {
      errors.push({ field: 'firstName', message: 'First name must be a string' });
    }

    if (this.lastName && typeof this.lastName !== 'string') {
      errors.push({ field: 'lastName', message: 'Last name must be a string' });
    }

    if (this.bio && typeof this.bio !== 'string') {
      errors.push({ field: 'bio', message: 'Bio must be a string' });
    } else if (this.bio && this.bio.length > 500) {
      errors.push({ field: 'bio', message: 'Bio cannot exceed 500 characters' });
    }

    if (this.phone && typeof this.phone !== 'string') {
      errors.push({ field: 'phone', message: 'Phone must be a string' });
    }

    if (this.avatarUrl && typeof this.avatarUrl !== 'string') {
      errors.push({ field: 'avatarUrl', message: 'Avatar URL must be a string' });
    } else if (this.avatarUrl && !this.avatarUrl.match(/^https?:\/\/.+/)) {
      errors.push({ field: 'avatarUrl', message: 'Avatar URL must be a valid HTTP/HTTPS URL' });
    }

    if (errors.length > 0) {
      throw new ValidationException(errors.map((e) => e.message).join(', '));
    }

    return true;
  }
}

export default RegisterRequestDto;
