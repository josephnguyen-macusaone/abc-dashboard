import { User } from '../../domain/entities/user-entity.js';
import { IUserRepository } from '../../domain/repositories/interfaces/i-user-repository.js';
import { withTimeout, TimeoutPresets } from '../../shared/utils/retry.js';
import logger from '../config/logger.js';

/**
 * User Repository Implementation
 * Implements the IUserRepository interface using Mongoose
 */
export class UserRepository extends IUserRepository {
  constructor(userModel, correlationId = null) {
    super();
    this.UserModel = userModel;
    this.correlationId = correlationId;
    this.operationId = correlationId ? `${correlationId}_repo` : null;
  }

  // Method to set correlation ID for request-scoped operations
  setCorrelationId(correlationId) {
    this.correlationId = correlationId;
    this.operationId = correlationId ? `${correlationId}_repo` : null;
  }

  async findById(id) {
    return withTimeout(
      async () => {
        const userDoc = await this.UserModel.findById(id);
        return userDoc ? this._toEntity(userDoc) : null;
      },
      TimeoutPresets.DATABASE,
      'user_findById',
      {
        correlationId: this.correlationId,
        onTimeout: (error) => {
          logger.error('User findById timed out', {
            correlationId: this.correlationId,
            userId: id,
            timeout: TimeoutPresets.DATABASE,
          });
        },
      }
    );
  }

  async findByEmail(email) {
    if (!email) {
      throw new Error('Email is required for findByEmail');
    }

    return withTimeout(
      async () => {
        const userDoc = await this.UserModel.findOne({ email: email.toLowerCase() });
        return userDoc ? this._toEntity(userDoc) : null;
      },
      TimeoutPresets.DATABASE,
      'user_findByEmail',
      {
        correlationId: this.correlationId,
        onTimeout: (error) => {
          logger.error('User findByEmail timed out', {
            correlationId: this.correlationId,
            email,
            timeout: TimeoutPresets.DATABASE,
          });
        },
      }
    );
  }

  async findByUsername(username) {
    if (!username) {
      throw new Error('Username is required for findByUsername');
    }

    return withTimeout(
      async () => {
        const userDoc = await this.UserModel.findOne({ username: username.toLowerCase() });
        return userDoc ? this._toEntity(userDoc) : null;
      },
      TimeoutPresets.DATABASE,
      'user_findByUsername',
      {
        correlationId: this.correlationId,
        onTimeout: (error) => {
          logger.error('User findByUsername timed out', {
            correlationId: this.correlationId,
            username,
            timeout: TimeoutPresets.DATABASE,
          });
        },
      }
    );
  }

  async findUsers(options = {}) {
    const {
      page = 1,
      limit = 10,
      filters = {},
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    const query = {};

    // Apply filters
    if (filters.email) {
      query.email = { $regex: filters.email, $options: 'i' };
    }
    if (filters.username) {
      query.username = { $regex: filters.username, $options: 'i' };
    }
    if (filters.displayName) {
      query.displayName = { $regex: filters.displayName, $options: 'i' };
    }
    if (filters.hasAvatar !== undefined) {
      query.avatarUrl = filters.hasAvatar ? { $exists: true, $ne: '' } : { $exists: false };
    }
    // Bio filtering is now handled separately since bio is in user_profiles collection
    let bioFilterUsers = null;
    if (filters.hasBio !== undefined) {
      // Import UserProfileModel for bio filtering
      const { default: UserProfileModel } = await import('../models/user-profile-model.js');
      const bioQuery = filters.hasBio
        ? { bio: { $exists: true, $ne: '' } }
        : { bio: { $exists: false } };
      const bioProfiles = await UserProfileModel.find(bioQuery, { userId: 1 });
      bioFilterUsers = bioProfiles.map((p) => p.userId?.toString()).filter(Boolean);
    }

    // Apply bio filter if set
    if (bioFilterUsers !== null) {
      query._id = { $in: bioFilterUsers };
    }

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [users, total] = await Promise.all([
      this.UserModel.find(query).sort(sort).skip(skip).limit(limit),
      this.UserModel.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      users: users.map((user) => this._toEntity(user)),
      total,
      page,
      totalPages,
    };
  }

  async save(userData) {
    // Validate required fields
    if (!userData.username || !userData.email || !userData.displayName) {
      throw new Error('Missing required user data fields');
    }

    const userDoc = new this.UserModel(userData);
    const savedDoc = await userDoc.save();
    return this._toEntity(savedDoc);
  }

  async update(id, updates) {
    return withTimeout(
      async () => {
        const updatedDoc = await this.UserModel.findByIdAndUpdate(
          id,
          { ...updates, updatedAt: new Date() },
          { new: true }
        );
        return updatedDoc ? this._toEntity(updatedDoc) : null;
      },
      TimeoutPresets.DATABASE,
      'user_update',
      {
        correlationId: this.correlationId,
        onTimeout: (error) => {
          logger.error('User update timed out', {
            correlationId: this.correlationId,
            userId: id,
            updateFields: Object.keys(updates),
            timeout: TimeoutPresets.DATABASE,
          });
        },
      }
    );
  }

  async delete(id) {
    const result = await this.UserModel.findByIdAndDelete(id);
    return !!result;
  }

  async emailExists(email, excludeId = null) {
    const query = { email: email.toLowerCase() };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    const count = await this.UserModel.countDocuments(query);
    return count > 0;
  }

  async getUserStats() {
    // Import UserProfileModel for bio stats
    const { default: UserProfileModel } = await import('../models/user-profile-model.js');

    const [totalUsers, usersWithAvatars, usersWithBio, usersWithPhone, recentRegistrations] =
      await Promise.all([
        this.UserModel.countDocuments(),
        this.UserModel.countDocuments({ avatarUrl: { $exists: true, $ne: '' } }),
        UserProfileModel.countDocuments({ bio: { $exists: true, $ne: '' } }),
        this.UserModel.countDocuments({ phone: { $exists: true, $ne: null } }),
        this.UserModel.countDocuments({
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days
        }),
      ]);

    return {
      totalUsers,
      usersWithAvatars,
      usersWithBio,
      usersWithPhone,
      recentRegistrations,
    };
  }

  /**
   * Update user active status
   */
  async updateUserStatus(userId, statusData) {
    const updateData = {};
    if (statusData.isActive !== undefined) {
      updateData.isActive = statusData.isActive;
    }

    const userDoc = await this.UserModel.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    });

    return userDoc ? this._toEntity(userDoc) : null;
  }

  _toEntity(userDoc) {
    if (!userDoc) {
      throw new Error('User document is null or undefined');
    }

    return new User({
      id: userDoc._id?.toString(),
      username: userDoc.username,
      hashedPassword: userDoc.hashedPassword,
      email: userDoc.email,
      displayName: userDoc.displayName,
      role: userDoc.role,
      avatarUrl: userDoc.avatarUrl,
      phone: userDoc.phone,
      isActive: userDoc.isActive || false,
      isFirstLogin: userDoc.isFirstLogin ?? true,
      langKey: userDoc.langKey || 'en',
      createdAt: userDoc.createdAt,
      updatedAt: userDoc.updatedAt,
      createdBy: userDoc.createdBy,
      lastModifiedBy: userDoc.lastModifiedBy,
    });
  }
}
