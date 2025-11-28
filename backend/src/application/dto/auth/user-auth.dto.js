/**
 * User Auth DTO
 * Represents user data in authentication responses
 */
import { BaseDto } from '../common/base.dto.js';

export class UserAuthDto extends BaseDto {
  constructor({
    id,
    username,
    email,
    displayName,
    role,
    avatarUrl = null,
    phone = null,
    isActive = true,
    isFirstLogin = false,
    createdAt,
    updatedAt = null,
  }) {
    super();
    this.id = id;
    this.username = username;
    this.email = email;
    this.displayName = displayName;
    this.role = role;
    this.avatarUrl = avatarUrl;
    this.phone = phone;
    this.isActive = isActive;
    this.isFirstLogin = isFirstLogin;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Create from User entity or model
   * @param {Object} user - User entity or Mongoose document
   * @returns {UserAuthDto}
   */
  static fromEntity(user) {
    return new UserAuthDto({
      id: user.id || user._id?.toString(),
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      avatarUrl: user.avatarUrl || null,
      phone: user.phone || null,
      isActive: user.isActive,
      isFirstLogin: user.isFirstLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  }
}

export default UserAuthDto;
