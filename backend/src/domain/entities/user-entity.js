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
    avatarUrl,
    avatarId,
    bio,
    phone,
    emailVerificationToken,
    emailVerificationExpires,
    isEmailVerified,
    createdAt,
    updatedAt
  }) {
    this.id = id;
    this.username = username;
    this.hashedPassword = hashedPassword;
    this.email = email;
    this.displayName = displayName;
    this.avatarUrl = avatarUrl;
    this.avatarId = avatarId;
    this.bio = bio;
    this.phone = phone;
    this.emailVerificationToken = emailVerificationToken;
    this.emailVerificationExpires = emailVerificationExpires;
    this.isEmailVerified = isEmailVerified || false;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;

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

    // Username validation
    if (this.username.length < 3) {
      throw new Error('Username must be at least 3 characters long');
    }

    if (!/^[a-zA-Z0-9_]+$/.test(this.username)) {
      throw new Error('Username can only contain letters, numbers, and underscores');
    }

    // Bio length validation
    if (this.bio && this.bio.length > 500) {
      throw new Error('Bio cannot exceed 500 characters');
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
      avatarUrl: this.avatarUrl || null,
      avatarId: this.avatarId || null,
      bio: this.bio || null,
      phone: this.phone || null,
      isEmailVerified: this.isEmailVerified,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  updateProfile(updates) {
    const allowedFields = ['displayName', 'avatarUrl', 'avatarId', 'bio', 'phone'];
    allowedFields.forEach(field => {
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
      occurredAt: new Date()
    };
  }

  updateAvatar(avatarUrl, avatarId) {
    this.avatarUrl = avatarUrl;
    this.avatarId = avatarId;

    return {
      type: 'UserAvatarUpdated',
      userId: this.id,
      avatarUrl: this.avatarUrl,
      avatarId: this.avatarId,
      occurredAt: new Date()
    };
  }

  changePassword(newHashedPassword) {
    this.hashedPassword = newHashedPassword;

    return {
      type: 'UserPasswordChanged',
      userId: this.id,
      occurredAt: new Date()
    };
  }

  /**
   * Generate email verification token
   */
  generateEmailVerificationToken() {
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    this.emailVerificationToken = otp;
    this.emailVerificationExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    return otp;
  }

  /**
   * Verify email with token
   */
  verifyEmail(token) {
    if (this.isEmailVerified) {
      throw new Error('Email already verified');
    }

    if (!this.emailVerificationToken || !this.emailVerificationExpires) {
      throw new Error('No verification token found');
    }

    if (Date.now() > this.emailVerificationExpires) {
      throw new Error('Verification token has expired');
    }

    if (this.emailVerificationToken !== token) {
      throw new Error('Invalid verification token');
    }

    this.isEmailVerified = true;
    this.emailVerificationToken = null;
    this.emailVerificationExpires = null;

    return true;
  }
}
