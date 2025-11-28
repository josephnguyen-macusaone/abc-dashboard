import { ROLES } from '../../shared/constants/roles.js';

/**
 * User Domain Entity
 * Represents the core business concept of a User
 */
export class User {
  constructor({
    id,
    username,
    hashedPassword,
    email,
    displayName,
    role,
    avatarUrl,
    phone,
    isActive,
    isFirstLogin,
    langKey,
    createdAt,
    updatedAt,
    createdBy,
    lastModifiedBy,
  }) {
    this.id = id;
    this.username = username;
    this.hashedPassword = hashedPassword;
    this.email = email;
    this.displayName = displayName;
    this.role = role;
    this.avatarUrl = avatarUrl;
    this.phone = phone;
    this.isActive = isActive || false;
    this.isFirstLogin = isFirstLogin ?? true;
    this.langKey = langKey || 'en';
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.createdBy = createdBy;
    this.lastModifiedBy = lastModifiedBy;

    this.validate();
  }

  /**
   * Business rules validation
   */
  validate() {
    if (!this.email || !this.email.includes('@')) {
      throw new Error('Invalid email format');
    }

    if (!this.username || this.username.trim().length === 0) {
      throw new Error('Username is required');
    }

    if (!this.displayName || this.displayName.trim().length === 0) {
      throw new Error('Display name is required');
    }

    // Role validation
    if (!this.role || !Object.values(ROLES).includes(this.role)) {
      throw new Error('Invalid role specified');
    }

    // Username validation
    if (this.username.length < 3) {
      throw new Error('Username must be at least 3 characters long');
    }

    if (!/^[a-zA-Z0-9_]+$/.test(this.username)) {
      throw new Error('Username can only contain letters, numbers, and underscores');
    }

    // Language key validation
    if (this.langKey && typeof this.langKey !== 'string') {
      throw new Error('Language key must be a string');
    }
  }

  /**
   * Business methods
   */
  getProfile() {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      displayName: this.displayName,
      role: this.role,
      avatarUrl: this.avatarUrl || null,
      phone: this.phone || null,
      isActive: this.isActive,
      isFirstLogin: this.isFirstLogin,
      langKey: this.langKey,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      createdBy: this.createdBy,
      lastModifiedBy: this.lastModifiedBy,
    };
  }

  updateProfile(updates) {
    const allowedFields = ['displayName', 'avatarUrl', 'phone', 'langKey'];
    allowedFields.forEach((field) => {
      if (updates[field] !== undefined) {
        this[field] = updates[field];
      }
    });

    this.validate();

    return {
      type: 'UserProfileUpdated',
      userId: this.id,
      updates: allowedFields.reduce((acc, field) => {
        if (updates[field] !== undefined) {
          acc[field] = updates[field];
        }
        return acc;
      }, {}),
      occurredAt: new Date(),
    };
  }

  updateAvatar(avatarUrl) {
    this.avatarUrl = avatarUrl;

    return {
      type: 'UserAvatarUpdated',
      userId: this.id,
      avatarUrl: this.avatarUrl,
      occurredAt: new Date(),
    };
  }

  changePassword(newHashedPassword) {
    this.hashedPassword = newHashedPassword;

    return {
      type: 'UserPasswordChanged',
      userId: this.id,
      occurredAt: new Date(),
    };
  }

  /**
   * Activate user account (after email verification)
   */
  activate() {
    if (this.isActive) {
      throw new Error('Account already activated');
    }

    this.isActive = true;

    return {
      type: 'UserActivated',
      userId: this.id,
      occurredAt: new Date(),
    };
  }
}
