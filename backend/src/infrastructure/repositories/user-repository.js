import { User } from '../../domain/entities/user-entity.js';
import { IUserRepository } from '../../domain/repositories/interfaces/i-user-repository.js';

/**
 * User Repository Implementation
 * Implements the IUserRepository interface using Mongoose
 */
export class UserRepository extends IUserRepository {
  constructor(userModel) {
    super();
    this.UserModel = userModel;
  }

  async findById(id) {
    const userDoc = await this.UserModel.findById(id);
    return userDoc ? this._toEntity(userDoc) : null;
  }

  async findByEmail(email) {
    const userDoc = await this.UserModel.findOne({ email: email.toLowerCase() });
    return userDoc ? this._toEntity(userDoc) : null;
  }

  async findByUsername(username) {
    const userDoc = await this.UserModel.findOne({ username: username.toLowerCase() });
    return userDoc ? this._toEntity(userDoc) : null;
  }


  async findUsers(options = {}) {
    const {
      page = 1,
      limit = 10,
      filters = {},
      sortBy = 'createdAt',
      sortOrder = 'desc'
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
    if (filters.hasBio !== undefined) {
      query.bio = filters.hasBio ? { $exists: true, $ne: '' } : { $exists: false };
    }

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [users, total] = await Promise.all([
      this.UserModel.find(query).sort(sort).skip(skip).limit(limit),
      this.UserModel.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      users: users.map(user => this._toEntity(user)),
      total,
      page,
      totalPages
    };
  }

  async save(userData) {
    const userDoc = new this.UserModel(userData);
    const savedDoc = await userDoc.save();
    return this._toEntity(savedDoc);
  }

  async update(id, updates) {
    const updatedDoc = await this.UserModel.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date() },
      { new: true }
    );
    return updatedDoc ? this._toEntity(updatedDoc) : null;
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
    const [
      totalUsers,
      usersWithAvatars,
      usersWithBio,
      usersWithPhone,
      recentRegistrations
    ] = await Promise.all([
      this.UserModel.countDocuments(),
      this.UserModel.countDocuments({ avatarUrl: { $exists: true, $ne: '' } }),
      this.UserModel.countDocuments({ bio: { $exists: true, $ne: '' } }),
      this.UserModel.countDocuments({ phone: { $exists: true, $ne: null } }),
      this.UserModel.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
      })
    ]);

    return {
      totalUsers,
      usersWithAvatars,
      usersWithBio,
      usersWithPhone,
      recentRegistrations
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

    const userDoc = await this.UserModel.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    );

    return userDoc ? this._toEntity(userDoc) : null;
  }

  _toEntity(userDoc) {
    return new User({
      id: userDoc._id.toString(),
      username: userDoc.username,
      hashedPassword: userDoc.hashedPassword,
      email: userDoc.email,
      displayName: userDoc.displayName,
      avatarUrl: userDoc.avatarUrl,
      avatarId: userDoc.avatarId,
      bio: userDoc.bio,
      phone: userDoc.phone,
      isActive: userDoc.isActive || false,
      createdAt: userDoc.createdAt,
      updatedAt: userDoc.updatedAt
    });
  }
}
