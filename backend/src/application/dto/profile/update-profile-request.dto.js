/**
 * Update Profile Request DTO
 * Represents input data for updating user profile
 */
import { BaseDto } from '../common/base.dto.js';

export class UpdateProfileRequestDto extends BaseDto {
  constructor({ displayName, bio, phone, avatarUrl }) {
    super();
    // Only include fields that are explicitly provided
    if (displayName !== undefined) {
      this.displayName = displayName;
    }
    if (bio !== undefined) {
      this.bio = bio;
    }
    if (phone !== undefined) {
      this.phone = phone;
    }
    if (avatarUrl !== undefined) {
      this.avatarUrl = avatarUrl;
    }
  }

  /**
   * Create from Express request body
   * @param {Object} body - Request body
   * @returns {UpdateProfileRequestDto}
   */
  static fromRequest(body) {
    return new UpdateProfileRequestDto({
      displayName: body.displayName,
      bio: body.bio,
      phone: body.phone,
      avatarUrl: body.avatarUrl,
    });
  }

  /**
   * Check if any fields are being updated
   * @returns {boolean} True if at least one field is set
   */
  hasUpdates() {
    return Object.keys(this).length > 0;
  }

  /**
   * Get updates as plain object
   * @returns {Object} Object with only defined fields
   */
  getUpdates() {
    return { ...this };
  }
}

export default UpdateProfileRequestDto;
