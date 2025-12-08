/**
 * UserProfile Domain Entity
 * Represents the optional extended profile information for a User
 */
export class UserProfile {
  constructor({
    id,
    userId,
    bio,
    lastLoginAt,
    lastActivityAt,
    createdAt,
    updatedAt,
  }) {
    this.id = id;
    this.userId = userId;
    this.bio = bio;
    this.lastLoginAt = lastLoginAt;
    this.lastActivityAt = lastActivityAt;
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
  }

  /**
   * Business methods
   */
  getProfile() {
    return {
      id: this.id,
      userId: this.userId,
      bio: this.bio || null,
      lastLoginAt: this.lastLoginAt,
      lastActivityAt: this.lastActivityAt,
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
}
