import { UserProfile } from '../../domain/entities/user-profile-entity.js';
import { IUserProfileRepository } from '../../domain/repositories/interfaces/i-user-profile-repository.js';
import { withTimeout, TimeoutPresets } from '../../shared/utils/reliability/retry.js';
import logger from '../config/logger.js';

/**
 * UserProfile Repository Implementation
 * Implements the IUserProfileRepository interface using Mongoose
 */
export class UserProfileRepository extends IUserProfileRepository {
  constructor(userProfileModel, correlationId = null) {
    super();
    this.UserProfileModel = userProfileModel;
    this.correlationId = correlationId;
    this.operationId = correlationId ? `${correlationId}_profile_repo` : null;
  }

  // Method to set correlation ID for request-scoped operations
  setCorrelationId(correlationId) {
    this.correlationId = correlationId;
    this.operationId = correlationId ? `${correlationId}_profile_repo` : null;
  }

  async findById(id) {
    return withTimeout(
      async () => {
        const profileDoc = await this.UserProfileModel.findById(id);
        return profileDoc ? this._toEntity(profileDoc) : null;
      },
      TimeoutPresets.DATABASE,
      'user_profile_findById',
      {
        correlationId: this.correlationId,
        onTimeout: (error) => {
          logger.error('User profile findById timed out', {
            correlationId: this.correlationId,
            profileId: id,
            timeout: TimeoutPresets.DATABASE,
          });
        },
      }
    );
  }

  async findByUserId(userId) {
    return withTimeout(
      async () => {
        const profileDoc = await this.UserProfileModel.findOne({ userId });
        return profileDoc ? this._toEntity(profileDoc) : null;
      },
      TimeoutPresets.DATABASE,
      'user_profile_findByUserId',
      {
        correlationId: this.correlationId,
        onTimeout: (error) => {
          logger.error('User profile findByUserId timed out', {
            correlationId: this.correlationId,
            userId,
            timeout: TimeoutPresets.DATABASE,
          });
        },
      }
    );
  }

  async save(userProfile) {
    return withTimeout(
      async () => {
        const profileData = {
          userId: userProfile.userId,
          bio: userProfile.bio,
          emailVerified: userProfile.emailVerified,
          lastLoginAt: userProfile.lastLoginAt,
          lastActivityAt: userProfile.lastActivityAt,
          emailVerifiedAt: userProfile.emailVerifiedAt,
        };

        const profileDoc = new this.UserProfileModel(profileData);
        const savedDoc = await profileDoc.save();
        return this._toEntity(savedDoc);
      },
      TimeoutPresets.DATABASE,
      'user_profile_save',
      {
        correlationId: this.correlationId,
        onTimeout: (error) => {
          logger.error('User profile save timed out', {
            correlationId: this.correlationId,
            userId: userProfile.userId,
            timeout: TimeoutPresets.DATABASE,
          });
        },
      }
    );
  }

  async update(id, updates) {
    return withTimeout(
      async () => {
        const updateData = {};

        if (updates.bio !== undefined) {
          updateData.bio = updates.bio;
        }
        if (updates.emailVerified !== undefined) {
          updateData.emailVerified = updates.emailVerified;
        }
        if (updates.lastLoginAt !== undefined) {
          updateData.lastLoginAt = updates.lastLoginAt;
        }
        if (updates.lastActivityAt !== undefined) {
          updateData.lastActivityAt = updates.lastActivityAt;
        }
        if (updates.emailVerifiedAt !== undefined) {
          updateData.emailVerifiedAt = updates.emailVerifiedAt;
        }

        const updatedDoc = await this.UserProfileModel.findByIdAndUpdate(id, updateData, {
          new: true,
          runValidators: true,
        });

        return updatedDoc ? this._toEntity(updatedDoc) : null;
      },
      TimeoutPresets.DATABASE,
      'user_profile_update',
      {
        correlationId: this.correlationId,
        onTimeout: (error) => {
          logger.error('User profile update timed out', {
            correlationId: this.correlationId,
            profileId: id,
            updateFields: Object.keys(updates),
            timeout: TimeoutPresets.DATABASE,
          });
        },
      }
    );
  }

  async updateByUserId(userId, updates) {
    return withTimeout(
      async () => {
        const updateData = {};

        if (updates.bio !== undefined) {
          updateData.bio = updates.bio;
        }
        if (updates.emailVerified !== undefined) {
          updateData.emailVerified = updates.emailVerified;
        }
        if (updates.lastLoginAt !== undefined) {
          updateData.lastLoginAt = updates.lastLoginAt;
        }
        if (updates.lastActivityAt !== undefined) {
          updateData.lastActivityAt = updates.lastActivityAt;
        }
        if (updates.emailVerifiedAt !== undefined) {
          updateData.emailVerifiedAt = updates.emailVerifiedAt;
        }

        const updatedDoc = await this.UserProfileModel.findOneAndUpdate({ userId }, updateData, {
          new: true,
          runValidators: true,
          upsert: true,
        });

        return this._toEntity(updatedDoc);
      },
      TimeoutPresets.DATABASE,
      'user_profile_updateByUserId',
      {
        correlationId: this.correlationId,
        onTimeout: (error) => {
          logger.error('User profile updateByUserId timed out', {
            correlationId: this.correlationId,
            userId,
            updateFields: Object.keys(updates),
            timeout: TimeoutPresets.DATABASE,
          });
        },
      }
    );
  }

  async delete(id) {
    return withTimeout(
      async () => {
        const result = await this.UserProfileModel.findByIdAndDelete(id);
        return !!result;
      },
      TimeoutPresets.DATABASE,
      'user_profile_delete',
      {
        correlationId: this.correlationId,
        onTimeout: (error) => {
          logger.error('User profile delete timed out', {
            correlationId: this.correlationId,
            profileId: id,
            timeout: TimeoutPresets.DATABASE,
          });
        },
      }
    );
  }

  async deleteByUserId(userId) {
    return withTimeout(
      async () => {
        const result = await this.UserProfileModel.findOneAndDelete({ userId });
        return !!result;
      },
      TimeoutPresets.DATABASE,
      'user_profile_deleteByUserId',
      {
        correlationId: this.correlationId,
        onTimeout: (error) => {
          logger.error('User profile deleteByUserId timed out', {
            correlationId: this.correlationId,
            userId,
            timeout: TimeoutPresets.DATABASE,
          });
        },
      }
    );
  }

  async recordLogin(userId) {
    return withTimeout(
      async () => {
        const now = new Date();
        const updatedDoc = await this.UserProfileModel.findOneAndUpdate(
          { userId },
          {
            lastLoginAt: now,
            lastActivityAt: now,
          },
          { new: true, runValidators: true, upsert: true }
        );

        return this._toEntity(updatedDoc);
      },
      TimeoutPresets.DATABASE,
      'user_profile_recordLogin',
      {
        correlationId: this.correlationId,
        onTimeout: (error) => {
          logger.error('User profile recordLogin timed out', {
            correlationId: this.correlationId,
            userId,
            timeout: TimeoutPresets.DATABASE,
          });
        },
      }
    );
  }

  async recordActivity(userId) {
    return withTimeout(
      async () => {
        const now = new Date();
        const updatedDoc = await this.UserProfileModel.findOneAndUpdate(
          { userId },
          { lastActivityAt: now },
          { new: true, runValidators: true, upsert: true }
        );

        return this._toEntity(updatedDoc);
      },
      TimeoutPresets.DATABASE,
      'user_profile_recordActivity',
      {
        correlationId: this.correlationId,
        onTimeout: (error) => {
          logger.error('User profile recordActivity timed out', {
            correlationId: this.correlationId,
            userId,
            timeout: TimeoutPresets.DATABASE,
          });
        },
      }
    );
  }

  async verifyEmail(userId) {
    return withTimeout(
      async () => {
        const now = new Date();
        const updatedDoc = await this.UserProfileModel.findOneAndUpdate(
          { userId },
          {
            emailVerified: true,
            emailVerifiedAt: now,
          },
          { new: true, runValidators: true, upsert: true }
        );

        return this._toEntity(updatedDoc);
      },
      TimeoutPresets.DATABASE,
      'user_profile_verifyEmail',
      {
        correlationId: this.correlationId,
        onTimeout: (error) => {
          logger.error('User profile verifyEmail timed out', {
            correlationId: this.correlationId,
            userId,
            timeout: TimeoutPresets.DATABASE,
          });
        },
      }
    );
  }

  _toEntity(profileDoc) {
    return new UserProfile({
      id: profileDoc._id?.toString(),
      userId: profileDoc.userId?.toString(),
      bio: profileDoc.bio,
      emailVerified: profileDoc.emailVerified || false,
      lastLoginAt: profileDoc.lastLoginAt,
      lastActivityAt: profileDoc.lastActivityAt,
      emailVerifiedAt: profileDoc.emailVerifiedAt,
      createdAt: profileDoc.createdAt,
      updatedAt: profileDoc.updatedAt,
    });
  }
}
