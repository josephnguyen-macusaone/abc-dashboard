/**
 * Profile Response DTO
 * Represents user profile data
 */
import { BaseDto } from '../common/base.dto.js';

export class ProfileDto extends BaseDto {
  constructor({
    id,
    userId,
    bio = null,
    emailVerified = false,
    emailVerifiedAt = null,
    lastLoginAt = null,
    lastActivityAt = null,
    createdAt,
    updatedAt = null,
  }) {
    super();
    this.id = id;
    this.userId = userId;
    this.bio = bio;
    this.emailVerified = emailVerified;
    this.emailVerifiedAt = emailVerifiedAt;
    this.lastLoginAt = lastLoginAt;
    this.lastActivityAt = lastActivityAt;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Create from UserProfile entity/model
   * @param {Object} profile - UserProfile entity or Mongoose document
   * @returns {ProfileDto}
   */
  static fromEntity(profile) {
    return new ProfileDto({
      id: profile.id || profile._id?.toString(),
      userId: profile.userId?.toString() || profile.userId,
      bio: profile.bio || null,
      emailVerified: profile.emailVerified || false,
      emailVerifiedAt: profile.emailVerifiedAt || null,
      lastLoginAt: profile.lastLoginAt || null,
      lastActivityAt: profile.lastActivityAt || null,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    });
  }
}

export default ProfileDto;
