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

    // ========================================================================
    // ENHANCED: Multi-field Search (Phase 2.1)
    // Search across email, displayName, username, and phone
    // ========================================================================
    if (filters.search) {
      const searchTerm = `%${filters.search}%`;

      // Determine search field if specified
      if (filters.searchField) {
        // Single field search
        const fieldMap = {
          email: 'email',
          displayName: 'display_name',
          username: 'username',
          phone: 'phone',
        };
        const dbField = fieldMap[filters.searchField];

        if (dbField) {
          query = query.whereRaw(`${dbField} ILIKE ?`, [searchTerm]);
          countQuery = countQuery.whereRaw(`${dbField} ILIKE ?`, [searchTerm]);
        }
      } else {
        // Multi-field search (default): search across all fields
        query = query.where((qb) => {
          qb.whereRaw('email ILIKE ?', [searchTerm])
            .orWhereRaw('display_name ILIKE ?', [searchTerm])
            .orWhereRaw('username ILIKE ?', [searchTerm])
            .orWhereRaw('phone ILIKE ?', [searchTerm]);
        });
        countQuery = countQuery.where((qb) => {
          qb.whereRaw('email ILIKE ?', [searchTerm])
            .orWhereRaw('display_name ILIKE ?', [searchTerm])
            .orWhereRaw('username ILIKE ?', [searchTerm])
            .orWhereRaw('phone ILIKE ?', [searchTerm]);
        });
      }
    }

    // ========================================================================
    // Individual field filters (can now work alongside general search)
    // ========================================================================
    if (filters.email && !filters.search) {
      query = query.whereRaw('email ILIKE ?', [`%${filters.email}%`]);
      countQuery = countQuery.whereRaw('email ILIKE ?', [`%${filters.email}%`]);
    }
    if (filters.username && !filters.search) {
      query = query.whereRaw('username ILIKE ?', [`%${filters.username}%`]);
      countQuery = countQuery.whereRaw('username ILIKE ?', [`%${filters.username}%`]);
    }
    if (filters.displayName && !filters.search) {
      query = query.whereRaw('display_name ILIKE ?', [`%${filters.displayName}%`]);
      countQuery = countQuery.whereRaw('display_name ILIKE ?', [`%${filters.displayName}%`]);
    }
    if (filters.phone && !filters.search) {
      query = query.whereRaw('phone ILIKE ?', [`%${filters.phone}%`]);
      countQuery = countQuery.whereRaw('phone ILIKE ?', [`%${filters.phone}%`]);
    }

    // ========================================================================
    // Date Range Filters (Phase 2.2)
    // ========================================================================

    // Created date range
    if (filters.createdAtFrom) {
      const fromDate = new Date(filters.createdAtFrom);
      // Set to start of day in UTC to ensure we capture all records from that day
      fromDate.setUTCHours(0, 0, 0, 0);
      query = query.where('created_at', '>=', fromDate);
      countQuery = countQuery.where('created_at', '>=', fromDate);
    }
    if (filters.createdAtTo) {
      const toDate = new Date(filters.createdAtTo);
      // Set to end of day in UTC to ensure we capture all records from that day
      toDate.setUTCHours(23, 59, 59, 999);
      query = query.where('created_at', '<=', toDate);
      countQuery = countQuery.where('created_at', '<=', toDate);
    }

    // Updated date range
    if (filters.updatedAtFrom) {
      const fromDate = new Date(filters.updatedAtFrom);
      // Set to start of day in UTC to ensure we capture all records from that day
      fromDate.setUTCHours(0, 0, 0, 0);
      query = query.where('updated_at', '>=', fromDate);
      countQuery = countQuery.where('updated_at', '>=', fromDate);
    }
    if (filters.updatedAtTo) {
      const toDate = new Date(filters.updatedAtTo);
      // Set to end of day in UTC to ensure we capture all records from that day
      toDate.setUTCHours(23, 59, 59, 999);
      query = query.where('updated_at', '<=', toDate);
      countQuery = countQuery.where('updated_at', '<=', toDate);
    }

    // Last login date range
    if (filters.lastLoginFrom) {
      const fromDate = new Date(filters.lastLoginFrom);
      // Set to start of day in UTC to ensure we capture all records from that day
      fromDate.setUTCHours(0, 0, 0, 0);
      query = query.where('last_login_at', '>=', fromDate);
      countQuery = countQuery.where('last_login_at', '>=', fromDate);
    }
    if (filters.lastLoginTo) {
      const toDate = new Date(filters.lastLoginTo);
      // Set to end of day in UTC to ensure we capture all records from that day
      toDate.setUTCHours(23, 59, 59, 999);
      query = query.where('last_login_at', '<=', toDate);
      countQuery = countQuery.where('last_login_at', '<=', toDate);
    }

    // ========================================================================
    // Advanced Filters
    // ========================================================================

    // Role filter - support single value or array
    if (filters.role) {
      if (Array.isArray(filters.role)) {
        query = query.whereIn('role', filters.role);
        countQuery = countQuery.whereIn('role', filters.role);
      } else {
        query = query.where('role', filters.role);
        countQuery = countQuery.where('role', filters.role);
      }
    }

    // Active status filter - support single value or array
    if (filters.isActive !== undefined) {
      if (Array.isArray(filters.isActive)) {
        query = query.whereIn('is_active', filters.isActive);
        countQuery = countQuery.whereIn('is_active', filters.isActive);
      } else {
        query = query.where('is_active', filters.isActive);
        countQuery = countQuery.where('is_active', filters.isActive);
      }
    }

    // Managed by filter
    if (filters.managedBy) {
      query = query.where('managed_by', filters.managedBy);
      countQuery = countQuery.where('managed_by', filters.managedBy);
    }

    const [users, stats] = await Promise.all([
      query.select('users.*').orderBy(`users.${sortColumn}`, sortOrder).offset(offset).limit(limit),
      this.getUserStats(filters),
    ]);

    const total = stats.total || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      users: users.map((user) => this._toEntity(user)),
      page,
      totalPages,
      stats,
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

  async getUserStats(filters = {}) {
    // Start with base query that applies the same filters as getUsers
    let baseQuery = this.db(this.tableName);

    // Apply the same filters as getUsers method
    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      baseQuery = baseQuery.where((qb) => {
        qb.whereRaw('email ILIKE ?', [searchTerm])
          .orWhereRaw('display_name ILIKE ?', [searchTerm])
          .orWhereRaw('username ILIKE ?', [searchTerm])
          .orWhereRaw('phone ILIKE ?', [searchTerm]);
      });
    }

    // Individual field filters
    if (filters.email && !filters.search) {
      baseQuery = baseQuery.whereRaw('email ILIKE ?', [`%${filters.email}%`]);
    }
    if (filters.username && !filters.search) {
      baseQuery = baseQuery.whereRaw('username ILIKE ?', [`%${filters.username}%`]);
    }
    if (filters.displayName && !filters.search) {
      baseQuery = baseQuery.whereRaw('display_name ILIKE ?', [`%${filters.displayName}%`]);
    }
    if (filters.phone && !filters.search) {
      baseQuery = baseQuery.whereRaw('phone ILIKE ?', [`%${filters.phone}%`]);
    }

    // Date range filters
    if (filters.createdAtFrom) {
      const fromDate = new Date(filters.createdAtFrom);
      // Set to start of day in UTC to ensure we capture all records from that day
      fromDate.setUTCHours(0, 0, 0, 0);
      baseQuery = baseQuery.where('created_at', '>=', fromDate);
    }
    if (filters.createdAtTo) {
      const toDate = new Date(filters.createdAtTo);
      // Set to end of day in UTC to ensure we capture all records from that day
      toDate.setUTCHours(23, 59, 59, 999);
      baseQuery = baseQuery.where('created_at', '<=', toDate);
    }

    if (filters.updatedAtFrom) {
      const fromDate = new Date(filters.updatedAtFrom);
      // Set to start of day in UTC to ensure we capture all records from that day
      fromDate.setUTCHours(0, 0, 0, 0);
      baseQuery = baseQuery.where('updated_at', '>=', fromDate);
    }
    if (filters.updatedAtTo) {
      const toDate = new Date(filters.updatedAtTo);
      // Set to end of day in UTC to ensure we capture all records from that day
      toDate.setUTCHours(23, 59, 59, 999);
      baseQuery = baseQuery.where('updated_at', '<=', toDate);
    }

    if (filters.lastLoginFrom) {
      const fromDate = new Date(filters.lastLoginFrom);
      // Set to start of day in UTC to ensure we capture all records from that day
      fromDate.setUTCHours(0, 0, 0, 0);
      baseQuery = baseQuery.where('last_login_at', '>=', fromDate);
    }
    if (filters.lastLoginTo) {
      const toDate = new Date(filters.lastLoginTo);
      // Set to end of day in UTC to ensure we capture all records from that day
      toDate.setUTCHours(23, 59, 59, 999);
      baseQuery = baseQuery.where('last_login_at', '<=', toDate);
    }

    // Advanced filters
    if (filters.role) {
      if (Array.isArray(filters.role)) {
        baseQuery = baseQuery.whereIn('role', filters.role);
      } else {
        baseQuery = baseQuery.where('role', filters.role);
      }
    }
    if (filters.isActive !== undefined) {
      if (Array.isArray(filters.isActive)) {
        baseQuery = baseQuery.whereIn('is_active', filters.isActive);
      } else {
        baseQuery = baseQuery.where('is_active', filters.isActive);
      }
    }

    // Calculate stats based on filtered query
    const [totalCount, adminCount, managerCount, staffCount] = await Promise.all([
      baseQuery.clone().count('id as count').first(),
      baseQuery.clone().where('role', 'admin').count('id as count').first(),
      baseQuery.clone().where('role', 'manager').count('id as count').first(),
      baseQuery.clone().where('role', 'staff').count('id as count').first(),
    ]);

    return {
      total: parseInt(totalCount?.count || 0),
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
