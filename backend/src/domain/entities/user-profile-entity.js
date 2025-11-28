/**
 * UserProfile Domain Entity
 * Represents the optional extended profile information for a User
 */
export class UserProfile {
  constructor({
    id,
    userId,
    bio,
    emailVerified,
    lastLoginAt,
    lastActivityAt,
    emailVerifiedAt,
    createdAt,
    updatedAt,
  }) {
    this.id = id;
    this.userId = userId;
    this.bio = bio;
    this.emailVerified = emailVerified || false;
    this.lastLoginAt = lastLoginAt;
    this.lastActivityAt = lastActivityAt;
    this.emailVerifiedAt = emailVerifiedAt;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;

    this.validate();
  }

  /**
   * Business rules validation
   */
  validate() {
    if (!this.userId) {
      throw new Error('UserId is required');
    }

    // Bio validation
    if (this.bio && this.bio.length > 500) {
      throw new Error('Bio cannot exceed 500 characters');
    }

    // Email verification timestamp validation
    if (this.emailVerified && !this.emailVerifiedAt) {
      throw new Error('Email verification timestamp required when email is verified');
    }

    if (this.emailVerifiedAt && !this.emailVerified) {
      throw new Error('Email cannot be marked verified without verification timestamp');
    }
  }

  /**
   * Business methods
   */
  getProfile() {
    return {
      id: this.id,
      userId: this.userId,
      bio: this.bio || null,
      emailVerified: this.emailVerified,
      lastLoginAt: this.lastLoginAt,
      lastActivityAt: this.lastActivityAt,
      emailVerifiedAt: this.emailVerifiedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  updateProfile(updates) {
    const allowedFields = ['bio'];
    allowedFields.forEach((field) => {
      if (updates[field] !== undefined) {
        this[field] = updates[field];
      }
    });

    this.validate();

    return {
      type: 'UserProfileUpdated',
      userId: this.userId,
      profileId: this.id,
      updates: allowedFields.reduce((acc, field) => {
        if (updates[field] !== undefined) {
          acc[field] = updates[field];
        }
        return acc;
      }, {}),
      occurredAt: new Date(),
    };
  }

  recordLogin() {
    this.lastLoginAt = new Date();
    this.lastActivityAt = new Date();

    return {
      type: 'UserLoginRecorded',
      userId: this.userId,
      profileId: this.id,
      loginAt: this.lastLoginAt,
      occurredAt: new Date(),
    };
  }

  recordActivity() {
    this.lastActivityAt = new Date();

    return {
      type: 'UserActivityRecorded',
      userId: this.userId,
      profileId: this.id,
      activityAt: this.lastActivityAt,
      occurredAt: new Date(),
    };
  }

  verifyEmail() {
    if (this.emailVerified) {
      throw new Error('Email already verified');
    }

    this.emailVerified = true;
    this.emailVerifiedAt = new Date();

    return {
      type: 'UserEmailVerified',
      userId: this.userId,
      profileId: this.id,
      verifiedAt: this.emailVerifiedAt,
      occurredAt: new Date(),
    };
  }
}
