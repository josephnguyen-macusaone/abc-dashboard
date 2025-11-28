/**
 * User Response DTO
 * Represents a single user in API responses
 */
import { BaseDto } from '../common/base.dto.js';

export class UserResponseDto extends BaseDto {
  constructor({
    id,
    username,
    email,
    displayName,
    role,
    avatarUrl = null,
    bio = null,
    phone = null,
    isActive = true,
    emailVerified = false,
    createdAt,
    updatedAt = null,
    createdBy = null,
    lastModifiedBy = null,
  }) {
    super();
    this.id = id;
    this.username = username;
    this.email = email;
    this.displayName = displayName;
    this.role = role;
    this.avatarUrl = avatarUrl;
    this.bio = bio;
    this.phone = phone;
    this.isActive = isActive;
    this.emailVerified = emailVerified;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.createdBy = createdBy;
    this.lastModifiedBy = lastModifiedBy;
  }

  /**
   * Create from User entity/model and optional profile
   * @param {Object} user - User entity or Mongoose document
   * @param {Object} profile - Optional user profile
   * @returns {UserResponseDto}
   */
  static fromEntity(user, profile = null) {
    return new UserResponseDto({
      id: user.id || user._id?.toString(),
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      avatarUrl: user.avatarUrl || null,
      bio: profile?.bio || user.bio || null,
      phone: user.phone || null,
      isActive: user.isActive,
      emailVerified: profile?.emailVerified ?? false,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      createdBy: user.createdBy,
      lastModifiedBy: user.lastModifiedBy,
    });
  }

  /**
   * Create minimal user response (for lists)
   * @param {Object} user - User entity
   * @returns {Object} Minimal user object
   */
  static minimal(user) {
    return {
      id: user.id || user._id?.toString(),
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      avatarUrl: user.avatarUrl || null,
      isActive: user.isActive,
    };
  }
}

export default UserResponseDto;
