import { User } from '../../domain/entities/user-entity.js';
import { IUserRepository } from '../../domain/repositories/interfaces/i-user-repository.js';
import { withTimeout, TimeoutPresets } from '../../shared/utils/reliability/retry.js';
import logger from '../config/logger.js';

/**
 * User Repository Implementation
 * Implements the IUserRepository interface using PostgreSQL with Knex
 */
export class UserRepository extends IUserRepository {
  constructor(db, correlationId = null) {
    super();
    this.db = db;
    this.tableName = 'users';
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
        const userRow = await this.db(this.tableName).where('id', id).first();
        return userRow ? this._toEntity(userRow) : null;
      },
      TimeoutPresets.DATABASE,
      'user_findById',
      {
        correlationId: this.correlationId,
        onTimeout: () => {
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

    try {
      const userRow = await this.db(this.tableName)
        .whereRaw('LOWER(email) = ?', [email.toLowerCase()])
        .first();
      return userRow ? this._toEntity(userRow) : null;
    } catch (error) {
      logger.error('User findByEmail error', {
        correlationId: this.correlationId,
        email,
        error: error.message,
      });
      throw error;
    }
  }

  async findByUsername(username) {
    if (!username) {
      throw new Error('Username is required for findByUsername');
    }

    return withTimeout(
      async () => {
        const userRow = await this.db(this.tableName)
          .whereRaw('LOWER(username) = ?', [username.toLowerCase()])
          .first();
        return userRow ? this._toEntity(userRow) : null;
      },
      TimeoutPresets.DATABASE,
      'user_findByUsername',
      {
        correlationId: this.correlationId,
        onTimeout: () => {
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
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = options;

    // Map camelCase to snake_case for sorting
    const sortColumnMap = {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      displayName: 'display_name',
      email: 'email',
      username: 'username',
      role: 'role',
      isActive: 'is_active',
      lastLogin: 'last_login_at',
    };

    const sortColumn = sortColumnMap[sortBy] || sortBy;
    const offset = (page - 1) * limit;

    let query = this.db(this.tableName);
    let countQuery = this.db(this.tableName);

    // Apply filters
    if (filters.search) {
      // Full-text search across displayName and email only
      const searchTerm = `%${filters.search}%`;
      query = query.where((qb) => {
        qb.whereRaw('email ILIKE ?', [searchTerm])
          .orWhereRaw('display_name ILIKE ?', [searchTerm]);
      });
      countQuery = countQuery.where((qb) => {
        qb.whereRaw('email ILIKE ?', [searchTerm])
          .orWhereRaw('display_name ILIKE ?', [searchTerm]);
      });
    } else {
      // Individual field filters (only if no general search)
      if (filters.email) {
        query = query.whereRaw('email ILIKE ?', [`%${filters.email}%`]);
        countQuery = countQuery.whereRaw('email ILIKE ?', [`%${filters.email}%`]);
      }
      if (filters.username) {
        query = query.whereRaw('username ILIKE ?', [`%${filters.username}%`]);
        countQuery = countQuery.whereRaw('username ILIKE ?', [`%${filters.username}%`]);
      }
      if (filters.displayName) {
        query = query.whereRaw('display_name ILIKE ?', [`%${filters.displayName}%`]);
        countQuery = countQuery.whereRaw('display_name ILIKE ?', [`%${filters.displayName}%`]);
      }
    }
    if (filters.role) {
      query = query.where('role', filters.role);
      countQuery = countQuery.where('role', filters.role);
    }
    if (filters.isActive !== undefined) {
      query = query.where('is_active', filters.isActive);
      countQuery = countQuery.where('is_active', filters.isActive);
    }
    if (filters.managedBy) {
      query = query.where('managed_by', filters.managedBy);
      countQuery = countQuery.where('managed_by', filters.managedBy);
    }
    if (filters.hasAvatar !== undefined) {
      if (filters.hasAvatar) {
        query = query.whereNotNull('avatar_url').whereNot('avatar_url', '');
        countQuery = countQuery.whereNotNull('avatar_url').whereNot('avatar_url', '');
      } else {
        query = query.where((qb) => {
          qb.whereNull('avatar_url').orWhere('avatar_url', '');
        });
        countQuery = countQuery.where((qb) => {
          qb.whereNull('avatar_url').orWhere('avatar_url', '');
        });
      }
    }

    // Bio filtering - need to join with user_profiles
    if (filters.hasBio !== undefined) {
      if (filters.hasBio) {
        query = query
          .join('user_profiles', 'users.id', 'user_profiles.user_id')
          .whereNotNull('user_profiles.bio')
          .whereNot('user_profiles.bio', '');
        countQuery = countQuery
          .join('user_profiles', 'users.id', 'user_profiles.user_id')
          .whereNotNull('user_profiles.bio')
          .whereNot('user_profiles.bio', '');
      } else {
        query = query.leftJoin('user_profiles', 'users.id', 'user_profiles.user_id').where((qb) => {
          qb.whereNull('user_profiles.bio').orWhere('user_profiles.bio', '');
        });
        countQuery = countQuery
          .leftJoin('user_profiles', 'users.id', 'user_profiles.user_id')
          .where((qb) => {
            qb.whereNull('user_profiles.bio').orWhere('user_profiles.bio', '');
          });
      }
    }

    const [users, countResult] = await Promise.all([
      query.select('users.*').orderBy(`users.${sortColumn}`, sortOrder).offset(offset).limit(limit),
      countQuery.count('users.id as count').first(),
    ]);

    const total = parseInt(countResult?.count || 0);
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

    const dbData = this._toDbFormat(userData);
    const [savedRow] = await this.db(this.tableName).insert(dbData).returning('*');

    return this._toEntity(savedRow);
  }

  async update(id, updates) {
    return withTimeout(
      async () => {
        const dbUpdates = this._toDbFormat(updates);
        dbUpdates.updated_at = new Date();

        const [updatedRow] = await this.db(this.tableName)
          .where('id', id)
          .update(dbUpdates)
          .returning('*');

        return updatedRow ? this._toEntity(updatedRow) : null;
      },
      TimeoutPresets.DATABASE,
      'user_update',
      {
        correlationId: this.correlationId,
        onTimeout: () => {
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
    const result = await this.db(this.tableName).where('id', id).del();
    return result > 0;
  }

  async emailExists(email, excludeId = null) {
    let query = this.db(this.tableName).whereRaw('LOWER(email) = ?', [email.toLowerCase()]);

    if (excludeId) {
      query = query.whereNot('id', excludeId);
    }

    const result = await query.count('id as count').first();
    return parseInt(result?.count || 0) > 0;
  }

  async getUserStats() {
    const [totalUsers, adminCount, managerCount, staffCount] = await Promise.all([
      this.db(this.tableName).count('id as count').first(),
      this.db(this.tableName).where('role', 'admin').count('id as count').first(),
      this.db(this.tableName).where('role', 'manager').count('id as count').first(),
      this.db(this.tableName).where('role', 'staff').count('id as count').first(),
    ]);

    return {
      totalUsers: parseInt(totalUsers?.count || 0),
      admin: parseInt(adminCount?.count || 0),
      manager: parseInt(managerCount?.count || 0),
      staff: parseInt(staffCount?.count || 0),
    };
  }

  /**
   * Update user active status
   */
  async updateUserStatus(userId, statusData) {
    const updateData = {};
    if (statusData.isActive !== undefined) {
      updateData.is_active = statusData.isActive;
    }
    updateData.updated_at = new Date();

    const [userRow] = await this.db(this.tableName)
      .where('id', userId)
      .update(updateData)
      .returning('*');

    return userRow ? this._toEntity(userRow) : null;
  }

  /**
   * Convert database row to entity (snake_case to camelCase)
   */
  _toEntity(userRow) {
    if (!userRow) {
      throw new Error('User row is null or undefined');
    }

    return new User({
      id: userRow.id,
      username: userRow.username,
      hashedPassword: userRow.hashed_password,
      email: userRow.email,
      displayName: userRow.display_name,
      role: userRow.role,
      avatarUrl: userRow.avatar_url,
      phone: userRow.phone,
      isActive: userRow.is_active || false,
      isFirstLogin: userRow.is_first_login ?? true,
      requiresPasswordChange: userRow.requires_password_change || false,
      langKey: userRow.lang_key || 'en',
      managedBy: userRow.managed_by,
      createdBy: userRow.created_by,
      createdAt: userRow.created_at,
      updatedAt: userRow.updated_at,
      lastModifiedBy: userRow.last_modified_by,
    });
  }

  /**
   * Convert entity/updates to database format (camelCase to snake_case)
   */
  _toDbFormat(data) {
    const dbData = {};

    if (data.username !== undefined) dbData.username = data.username.toLowerCase();
    if (data.hashedPassword !== undefined) dbData.hashed_password = data.hashedPassword;
    if (data.email !== undefined) dbData.email = data.email.toLowerCase();
    if (data.displayName !== undefined) dbData.display_name = data.displayName;
    if (data.role !== undefined) dbData.role = data.role;
    if (data.avatarUrl !== undefined) dbData.avatar_url = data.avatarUrl;
    if (data.phone !== undefined) dbData.phone = data.phone;
    if (data.isActive !== undefined) dbData.is_active = data.isActive;
    if (data.isFirstLogin !== undefined) dbData.is_first_login = data.isFirstLogin;
    if (data.requiresPasswordChange !== undefined)
      dbData.requires_password_change = data.requiresPasswordChange;
    if (data.langKey !== undefined) dbData.lang_key = data.langKey;
    if (data.managedBy !== undefined) dbData.managed_by = data.managedBy;
    if (data.createdBy !== undefined) dbData.created_by = data.createdBy;
    if (data.lastModifiedBy !== undefined) dbData.last_modified_by = data.lastModifiedBy;

    return dbData;
  }
}
