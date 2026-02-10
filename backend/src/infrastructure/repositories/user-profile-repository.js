import { UserProfile } from '../../domain/entities/user-profile-entity.js';
import { IUserProfileRepository } from '../../domain/repositories/interfaces/i-user-profile-repository.js';
import { withTimeout, TimeoutPresets } from '../../shared/utils/reliability/retry.js';
import logger from '../config/logger.js';

/**
 * UserProfile Repository Implementation
 * Implements the IUserProfileRepository interface using PostgreSQL with Knex
 */
export class UserProfileRepository extends IUserProfileRepository {
  constructor(db, correlationId = null) {
    super();
    this.db = db;
    this.tableName = 'user_profiles';
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
        const profileRow = await this.db(this.tableName).where('id', id).first();
        return profileRow ? this._toEntity(profileRow) : null;
      },
      TimeoutPresets.DATABASE,
      'user_profile_findById',
      {
        correlationId: this.correlationId,
        onTimeout: () => {
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
        const profileRow = await this.db(this.tableName).where('user_id', userId).first();
        return profileRow ? this._toEntity(profileRow) : null;
      },
      TimeoutPresets.DATABASE,
      'user_profile_findByUserId',
      {
        correlationId: this.correlationId,
        onTimeout: () => {
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
          user_id: userProfile.userId,
          bio: userProfile.bio,
          last_login_at: userProfile.lastLoginAt,
          last_activity_at: userProfile.lastActivityAt,
        };

        const [savedRow] = await this.db(this.tableName).insert(profileData).returning('*');

        return this._toEntity(savedRow);
      },
      TimeoutPresets.DATABASE,
      'user_profile_save',
      {
        correlationId: this.correlationId,
        onTimeout: () => {
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
        const updateData = { updated_at: new Date() };

        if (updates.bio !== undefined) {
          updateData.bio = updates.bio;
        }
        if (updates.lastLoginAt !== undefined) {
          updateData.last_login_at = updates.lastLoginAt;
        }
        if (updates.lastActivityAt !== undefined) {
          updateData.last_activity_at = updates.lastActivityAt;
        }

        const [updatedRow] = await this.db(this.tableName)
          .where('id', id)
          .update(updateData)
          .returning('*');

        return updatedRow ? this._toEntity(updatedRow) : null;
      },
      TimeoutPresets.DATABASE,
      'user_profile_update',
      {
        correlationId: this.correlationId,
        onTimeout: () => {
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
        const updateData = { updated_at: new Date() };

        if (updates.bio !== undefined) {
          updateData.bio = updates.bio;
        }
        if (updates.lastLoginAt !== undefined) {
          updateData.last_login_at = updates.lastLoginAt;
        }
        if (updates.lastActivityAt !== undefined) {
          updateData.last_activity_at = updates.lastActivityAt;
        }

        // Use upsert (INSERT ... ON CONFLICT ... UPDATE)
        const existingProfile = await this.db(this.tableName).where('user_id', userId).first();

        let resultRow;
        if (existingProfile) {
          [resultRow] = await this.db(this.tableName)
            .where('user_id', userId)
            .update(updateData)
            .returning('*');
        } else {
          [resultRow] = await this.db(this.tableName)
            .insert({
              user_id: userId,
              ...updateData,
            })
            .returning('*');
        }

        return this._toEntity(resultRow);
      },
      TimeoutPresets.DATABASE,
      'user_profile_updateByUserId',
      {
        correlationId: this.correlationId,
        onTimeout: () => {
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
        const result = await this.db(this.tableName).where('id', id).del();
        return result > 0;
      },
      TimeoutPresets.DATABASE,
      'user_profile_delete',
      {
        correlationId: this.correlationId,
        onTimeout: () => {
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
        const result = await this.db(this.tableName).where('user_id', userId).del();
        return result > 0;
      },
      TimeoutPresets.DATABASE,
      'user_profile_deleteByUserId',
      {
        correlationId: this.correlationId,
        onTimeout: () => {
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
        const updateData = {
          last_login_at: now,
          last_activity_at: now,
          updated_at: now,
        };

        // Upsert: insert if not exists, update if exists
        const existingProfile = await this.db(this.tableName).where('user_id', userId).first();

        let resultRow;
        if (existingProfile) {
          [resultRow] = await this.db(this.tableName)
            .where('user_id', userId)
            .update(updateData)
            .returning('*');
        } else {
          [resultRow] = await this.db(this.tableName)
            .insert({
              user_id: userId,
              last_login_at: now,
              last_activity_at: now,
            })
            .returning('*');
        }

        return this._toEntity(resultRow);
      },
      TimeoutPresets.DATABASE,
      'user_profile_recordLogin',
      {
        correlationId: this.correlationId,
        onTimeout: () => {
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
        const updateData = {
          last_activity_at: now,
          updated_at: now,
        };

        // Upsert: insert if not exists, update if exists
        const existingProfile = await this.db(this.tableName).where('user_id', userId).first();

        let resultRow;
        if (existingProfile) {
          [resultRow] = await this.db(this.tableName)
            .where('user_id', userId)
            .update(updateData)
            .returning('*');
        } else {
          [resultRow] = await this.db(this.tableName)
            .insert({
              user_id: userId,
              last_activity_at: now,
            })
            .returning('*');
        }

        return this._toEntity(resultRow);
      },
      TimeoutPresets.DATABASE,
      'user_profile_recordActivity',
      {
        correlationId: this.correlationId,
        onTimeout: () => {
          logger.error('User profile recordActivity timed out', {
            correlationId: this.correlationId,
            userId,
            timeout: TimeoutPresets.DATABASE,
          });
        },
      }
    );
  }

  /**
   * Convert database row to entity (snake_case to camelCase)
   *
   * @param {Object} profileRow - Database row
   * @return {UserProfile} User profile entity
   */
  _toEntity(profileRow) {
    return new UserProfile({
      id: profileRow.id,
      userId: profileRow.user_id,
      bio: profileRow.bio,
      lastLoginAt: profileRow.last_login_at,
      lastActivityAt: profileRow.last_activity_at,
      createdAt: profileRow.created_at,
      updatedAt: profileRow.updated_at,
    });
  }
}
