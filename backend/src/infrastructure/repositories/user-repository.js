import { User } from '../../domain/entities/user-entity.js';
import { IUserRepository } from '../../domain/repositories/interfaces/i-user-repository.js';
import { withTimeout, TimeoutPresets } from '../../shared/utils/reliability/retry.js';
import logger from '../../shared/utils/logger.js';

/** camelCase user field → DB column; optional transform when writing */
const USER_DB_FIELD_MAPPINGS = [
  ['username', 'username', (v) => v.toLowerCase()],
  ['hashedPassword', 'hashed_password'],
  ['email', 'email', (v) => v.toLowerCase()],
  ['displayName', 'display_name'],
  ['role', 'role'],
  ['avatarUrl', 'avatar_url'],
  ['phone', 'phone'],
  ['isActive', 'is_active'],
  ['emailVerified', 'email_verified'],
  ['isFirstLogin', 'is_first_login'],
  ['requiresPasswordChange', 'requires_password_change'],
  ['langKey', 'lang_key'],
  ['managedBy', 'managed_by'],
  ['createdBy', 'created_by'],
  ['lastModifiedBy', 'last_modified_by'],
];

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

  _getUserSortColumn(sortBy) {
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
    return sortColumnMap[sortBy] || sortBy;
  }

  _applyUserSearchFilter(query, filters) {
    if (!filters.search) {
      return query;
    }
    const searchTerm = `%${filters.search}%`;
    if (filters.searchField) {
      const fieldMap = {
        email: 'email',
        displayName: 'display_name',
        username: 'username',
        phone: 'phone',
      };
      const dbField = fieldMap[filters.searchField];
      if (dbField) {
        return query.whereRaw(`${dbField} ILIKE ?`, [searchTerm]);
      }
      return query;
    }
    return query.where((qb) => {
      qb.whereRaw('email ILIKE ?', [searchTerm])
        .orWhereRaw('display_name ILIKE ?', [searchTerm])
        .orWhereRaw('username ILIKE ?', [searchTerm])
        .orWhereRaw('phone ILIKE ?', [searchTerm]);
    });
  }

  _applyUserFieldFilters(query, filters) {
    if (filters.email && !filters.search) {
      query = query.whereRaw('email ILIKE ?', [`%${filters.email}%`]);
    }
    if (filters.username && !filters.search) {
      query = query.whereRaw('username ILIKE ?', [`%${filters.username}%`]);
    }
    if (filters.displayName && !filters.search) {
      query = query.whereRaw('display_name ILIKE ?', [`%${filters.displayName}%`]);
    }
    if (filters.phone && !filters.search) {
      query = query.whereRaw('phone ILIKE ?', [`%${filters.phone}%`]);
    }
    return query;
  }

  _applyUserDateFilters(query, filters) {
    if (filters.createdAtFrom) {
      const fromDate = new Date(filters.createdAtFrom);
      fromDate.setUTCHours(0, 0, 0, 0);
      query = query.where('created_at', '>=', fromDate);
    }
    if (filters.createdAtTo) {
      const toDate = new Date(filters.createdAtTo);
      toDate.setUTCHours(23, 59, 59, 999);
      query = query.where('created_at', '<=', toDate);
    }
    if (filters.updatedAtFrom) {
      const fromDate = new Date(filters.updatedAtFrom);
      fromDate.setUTCHours(0, 0, 0, 0);
      query = query.where('updated_at', '>=', fromDate);
    }
    if (filters.updatedAtTo) {
      const toDate = new Date(filters.updatedAtTo);
      toDate.setUTCHours(23, 59, 59, 999);
      query = query.where('updated_at', '<=', toDate);
    }
    // last_login_at lives on user_profiles, not users
    if (filters.lastLoginFrom) {
      const fromDate = new Date(filters.lastLoginFrom);
      fromDate.setUTCHours(0, 0, 0, 0);
      query = query.whereExists(
        this.db('user_profiles')
          .select(this.db.raw('1'))
          .whereColumn('user_profiles.user_id', 'users.id')
          .where('user_profiles.last_login_at', '>=', fromDate)
      );
    }
    if (filters.lastLoginTo) {
      const toDate = new Date(filters.lastLoginTo);
      toDate.setUTCHours(23, 59, 59, 999);
      query = query.whereExists(
        this.db('user_profiles')
          .select(this.db.raw('1'))
          .whereColumn('user_profiles.user_id', 'users.id')
          .where('user_profiles.last_login_at', '<=', toDate)
      );
    }
    return query;
  }

  _applyUserAdvancedFilters(query, filters) {
    if (filters.role) {
      if (Array.isArray(filters.role)) {
        query = query.whereIn('role', filters.role);
      } else {
        query = query.where('role', filters.role);
      }
    }
    if (filters.isActive !== undefined) {
      if (Array.isArray(filters.isActive)) {
        query = query.whereIn('is_active', filters.isActive);
      } else {
        query = query.where('is_active', filters.isActive);
      }
    }
    if (filters.managedBy) {
      query = query.where('managed_by', filters.managedBy);
    }
    if (filters.excludeRoles?.length) {
      query = query.whereNotIn('role', filters.excludeRoles);
    }
    if (filters.excludeUserIds?.length) {
      query = query.whereNotIn('id', filters.excludeUserIds);
    }
    return query;
  }

  _applyUserListFilters(query, filters) {
    if (filters.__emptyUserList) {
      return query.whereRaw('1 = 0');
    }
    query = this._applyUserSearchFilter(query, filters);
    query = this._applyUserFieldFilters(query, filters);
    query = this._applyUserDateFilters(query, filters);
    query = this._applyUserAdvancedFilters(query, filters);
    return query;
  }

  async findUsers(options = {}) {
    const {
      page = 1,
      limit = 10,
      filters = {},
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = options;

    const sortColumn = this._getUserSortColumn(sortBy);
    const offset = (page - 1) * limit;

    let query = this.db(this.tableName);
    query = this._applyUserListFilters(query, filters);

    const listQuery = query.clone();
    const isLastLoginSort = sortColumn === 'last_login_at';
    const orderedQuery = isLastLoginSort
      ? listQuery
          .leftJoin('user_profiles', 'users.id', 'user_profiles.user_id')
          .select('users.*')
          .orderBy('user_profiles.last_login_at', sortOrder)
      : listQuery.select('users.*').orderBy(`users.${sortColumn}`, sortOrder);

    const [users, stats] = await Promise.all([
      orderedQuery.offset(offset).limit(limit),
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
    let query = this.db(this.tableName);
    query = this._applyUserListFilters(query, filters);
    const roles = ['admin', 'accountant', 'manager', 'tech', 'agent'];
    const [totalCount, ...roleCounts] = await Promise.all([
      query.clone().count('id as count').first(),
      ...roles.map((role) => query.clone().where('role', role).count('id as count').first()),
    ]);

    const stats = {
      total: parseInt(totalCount?.count || 0),
    };
    roles.forEach((role, index) => {
      stats[role] = parseInt(roleCounts[index]?.count || 0);
    });
    return stats;
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

    return new User(
      {
        id: userRow.id,
        username: userRow.username,
        hashedPassword: userRow.hashed_password,
        email: userRow.email,
        displayName: userRow.display_name,
        role: userRow.role,
        avatarUrl: userRow.avatar_url,
        phone: userRow.phone,
        isActive: userRow.is_active || false,
        emailVerified: userRow.email_verified ?? false,
        isFirstLogin: userRow.is_first_login ?? true,
        requiresPasswordChange: userRow.requires_password_change || false,
        langKey: userRow.lang_key || 'en',
        managedBy: userRow.managed_by,
        createdBy: userRow.created_by,
        createdAt: userRow.created_at,
        updatedAt: userRow.updated_at,
        lastModifiedBy: userRow.last_modified_by,
      },
      { skipValidation: true }
    );
  }

  /**
   * Convert entity/updates to database format (camelCase to snake_case)
   */
  _toDbFormat(data) {
    const dbData = {};
    for (const entry of USER_DB_FIELD_MAPPINGS) {
      const [camelKey, snakeKey, transform] = entry;
      if (data[camelKey] !== undefined) {
        const raw = data[camelKey];
        dbData[snakeKey] = transform ? transform(raw) : raw;
      }
    }
    return dbData;
  }

  /**
   * Activate a user and mark their email as verified in a single update.
   * @param {string} userId
   */
  async updateEmailVerification(userId) {
    const [userRow] = await this.db(this.tableName)
      .where('id', userId)
      .update({ is_active: true, email_verified: true, updated_at: new Date() })
      .returning('*');

    return userRow ? this._toEntity(userRow) : null;
  }

  // ── Refresh token revocation ─────────────────────────────────────────────

  /**
   * Persist a hashed refresh token so it can be validated and revoked later.
   * @param {string} userId
   * @param {string} tokenHash   SHA-256 hex of the raw refresh token
   * @param {Date}   expiresAt
   */
  async storeRefreshToken(userId, tokenHash, expiresAt) {
    await this.db('refresh_tokens').insert({
      user_id: userId,
      token_hash: tokenHash,
      expires_at: expiresAt,
    });
  }

  /**
   * Look up a stored refresh token by its hash.
   * Returns the row or null; also returns null if the token is expired.
   * @param {string} tokenHash
   */
  async findRefreshToken(tokenHash) {
    return (
      this.db('refresh_tokens')
        .where('token_hash', tokenHash)
        .where('expires_at', '>', new Date())
        .first() ?? null
    );
  }

  /**
   * Delete a specific refresh token (used during rotation or logout).
   * @param {string} tokenHash
   */
  async revokeRefreshToken(tokenHash) {
    await this.db('refresh_tokens').where('token_hash', tokenHash).delete();
  }

  /**
   * Delete all refresh tokens for a user (used on password change or admin revoke).
   * @param {string} userId
   */
  async revokeAllUserRefreshTokens(userId) {
    await this.db('refresh_tokens').where('user_id', userId).delete();
  }

  /** Remove all expired rows — intended to be called by a nightly scheduler. */
  async cleanExpiredRefreshTokens() {
    const deleted = await this.db('refresh_tokens').where('expires_at', '<', new Date()).delete();
    logger.info('Cleaned expired refresh tokens', { correlationId: this.correlationId, deleted });
    return deleted;
  }
}
