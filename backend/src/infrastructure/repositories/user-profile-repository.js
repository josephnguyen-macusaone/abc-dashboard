import { UserProfile } from '../../domain/entities/user-profile-entity.js';
import { IUserProfileRepository } from '../../domain/repositories/interfaces/i-user-profile-repository.js';

/**
 * UserProfile Repository Implementation
 * Implements the IUserProfileRepository interface using Mongoose
 */
export class UserProfileRepository extends IUserProfileRepository {
  constructor(userProfileModel) {
    super();
    this.UserProfileModel = userProfileModel;
  }

  async findById(id) {
    const profileDoc = await this.UserProfileModel.findById(id);
    return profileDoc ? this._toEntity(profileDoc) : null;
  }

  async findByUserId(userId) {
    const profileDoc = await this.UserProfileModel.findOne({ userId });
    return profileDoc ? this._toEntity(profileDoc) : null;
  }

  async save(userProfile) {
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
  }

  async update(id, updates) {
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
  }

  async updateByUserId(userId, updates) {
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
  }

  async delete(id) {
    const result = await this.UserProfileModel.findByIdAndDelete(id);
    return !!result;
  }

  async deleteByUserId(userId) {
    const result = await this.UserProfileModel.findOneAndDelete({ userId });
    return !!result;
  }

  async recordLogin(userId) {
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
  }

  async recordActivity(userId) {
    const now = new Date();
    const updatedDoc = await this.UserProfileModel.findOneAndUpdate(
      { userId },
      { lastActivityAt: now },
      { new: true, runValidators: true, upsert: true }
    );

    return this._toEntity(updatedDoc);
  }

  async verifyEmail(userId) {
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
