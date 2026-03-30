/**
 * Update Profile Use Case
 * Handles user self-profile updates with graceful degradation
 */
import {
  ValidationException,
  ResourceNotFoundException,
} from '../../../domain/exceptions/domain.exception.js';
import { executeWithDegradation } from '../../../shared/utils/reliability/graceful-degradation.js';
import { withTimeout, TimeoutPresets } from '../../../shared/utils/reliability/retry.js';
import logger from '../../../shared/utils/logger.js';

/** @typedef {import('../../../domain/repositories/interfaces/i-user-repository.js').IUserRepository} IUserRepository */
/** @typedef {import('../../../domain/repositories/interfaces/i-user-profile-repository.js').IUserProfileRepository} IUserProfileRepository */

export class UpdateProfileUseCase {
  /**
   * @param {IUserRepository} userRepository
   * @param {IUserProfileRepository} userProfileRepository
   */
  constructor(userRepository, userProfileRepository) {
    this.userRepository = userRepository;
    this.userProfileRepository = userProfileRepository;
  }

  async execute(userId, updates) {
    try {
      this._validateInput(userId, updates);
      const user = await this._getUser(userId);
      const { userUpdates, profileUpdates, avatarUrlUpdate } = this._splitUpdates(updates);
      this._assertHasValidFields(userUpdates, profileUpdates, avatarUrlUpdate);

      let updatedUser = await this._applyUserUpdates(userId, user, userUpdates);
      const { updatedUser: userAfterAvatar, avatarUrlSkipped } = await this._applyAvatarUpdate(
        userId,
        avatarUrlUpdate,
        updatedUser
      );
      updatedUser = userAfterAvatar;

      await this._ensureProfile(userId, profileUpdates);
      const finalBio = await this._getFinalBio(userId, profileUpdates, updatedUser);

      this._logUpdate(userId, userUpdates, profileUpdates, avatarUrlUpdate);
      return this._buildResponse(updatedUser, finalBio, avatarUrlSkipped);
    } catch (error) {
      if (error instanceof ValidationException || error instanceof ResourceNotFoundException) {
        throw error;
      }
      throw new Error(`Profile update failed: ${error.message}`, { cause: error });
    }
  }

  _validateInput(userId, updates) {
    if (!userId) {
      throw new ValidationException('User ID is required');
    }
    if (!updates || Object.keys(updates).length === 0) {
      throw new ValidationException('No updates provided');
    }
  }

  _assertHasValidFields(userUpdates, profileUpdates, avatarUrlUpdate) {
    const hasRequired =
      Object.keys(userUpdates).length > 0 ||
      Object.keys(profileUpdates).length > 0 ||
      avatarUrlUpdate !== undefined;
    if (!hasRequired) {
      throw new ValidationException('No valid fields provided for update');
    }
  }

  _splitUpdates(updates) {
    const userFields = ['displayName', 'phone'];
    const profileFields = ['bio'];
    const userUpdates = {};
    const profileUpdates = {};
    for (const key of Object.keys(updates)) {
      if (key === 'avatarUrl') {
        continue;
      }
      if (userFields.includes(key)) {
        userUpdates[key] = updates[key];
      } else if (profileFields.includes(key)) {
        profileUpdates[key] = updates[key];
      }
    }
    return {
      userUpdates,
      profileUpdates,
      avatarUrlUpdate: updates.avatarUrl,
    };
  }

  async _getUser(userId) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new ResourceNotFoundException('User');
    }
    return user;
  }

  async _applyUserUpdates(userId, user, userUpdates) {
    if (Object.keys(userUpdates).length === 0) {
      return user;
    }
    const updatedUser = await this.userRepository.update(userId, userUpdates);
    if (!updatedUser) {
      throw new Error('Failed to update user profile');
    }
    return updatedUser;
  }

  async _applyAvatarUpdate(userId, avatarUrlUpdate, currentUser) {
    let avatarUrlSkipped = false;
    if (avatarUrlUpdate === undefined) {
      return { updatedUser: currentUser, avatarUrlSkipped };
    }
    const result = await executeWithDegradation(
      'avatar_processing',
      async () => {
        logger.info('Processing avatar URL update', {
          userId,
          avatarUrlType: typeof avatarUrlUpdate,
          avatarUrlLength: typeof avatarUrlUpdate === 'string' ? avatarUrlUpdate.length : 'N/A',
        });
        const safeAvatarUrl =
          typeof avatarUrlUpdate === 'string' ? avatarUrlUpdate : String(avatarUrlUpdate || '');
        const userWithAvatar = await this.userRepository.update(userId, {
          avatarUrl: safeAvatarUrl,
        });
        if (!userWithAvatar) {
          throw new Error('Avatar URL update returned null user object');
        }
        logger.info('Avatar URL update successful', { userId });
        return { success: true, user: userWithAvatar };
      },
      () => {
        avatarUrlSkipped = true;
        logger.warn('Avatar processing failed, using graceful degradation', {
          userId,
          willUseDefault: true,
        });
        return { success: false, skipped: true, reason: 'processing_failed' };
      },
      { operation: 'avatar_update', userId, avatarUrlType: typeof avatarUrlUpdate }
    );
    const updatedUser = result?.user ?? currentUser;
    return { updatedUser, avatarUrlSkipped };
  }

  async _ensureProfile(userId, profileUpdates) {
    await withTimeout(
      async () => {
        if (Object.keys(profileUpdates).length > 0) {
          await this.userProfileRepository.updateByUserId(userId, profileUpdates);
        } else {
          await this.userProfileRepository.updateByUserId(userId, {
            bio: null,
            emailVerified: false,
          });
        }
      },
      TimeoutPresets.DATABASE,
      'profile_update',
      {
        correlationId: `profile_${userId}_${Date.now()}`,
        onTimeout: () => {
          logger.error('Profile update operation timed out', {
            userId,
            profileUpdates: Object.keys(profileUpdates),
            timeout: TimeoutPresets.DATABASE,
          });
        },
      }
    );
  }

  async _getFinalBio(userId, profileUpdates, updatedUser) {
    if (Object.keys(profileUpdates).length === 0) {
      return updatedUser.bio ?? null;
    }
    let finalBio = updatedUser.bio ?? null;
    await withTimeout(
      async () => {
        const profile = await this.userProfileRepository.findByUserId(userId);
        finalBio = profile?.bio ?? null;
      },
      TimeoutPresets.DATABASE,
      'profile_fetch_after_update',
      {
        correlationId: `profile_fetch_${userId}_${Date.now()}`,
        onTimeout: () => {
          logger.warn('Profile fetch after update timed out, using existing bio', {
            userId,
            existingBio: updatedUser.bio,
          });
        },
      }
    );
    return finalBio;
  }

  _logUpdate(userId, userUpdates, profileUpdates, avatarUrlUpdate) {
    const updatedFields = [
      ...Object.keys(userUpdates),
      ...Object.keys(profileUpdates),
      ...(avatarUrlUpdate !== undefined ? ['avatarUrl'] : []),
    ];
    logger.info('User profile updated', { userId, updatedFields });
  }

  _buildResponse(updatedUser, finalBio, avatarUrlSkipped) {
    return {
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        displayName: updatedUser.displayName,
        role: updatedUser.role,
        avatarUrl: updatedUser.avatarUrl,
        bio: finalBio,
        phone: updatedUser.phone,
        isActive: updatedUser.isActive,
        updatedAt: updatedUser.updatedAt,
      },
      message: avatarUrlSkipped
        ? 'Profile updated successfully, but avatar URL was skipped due to validation issues'
        : 'Profile updated successfully',
      warnings: avatarUrlSkipped
        ? [
            {
              field: 'avatarUrl',
              message:
                'Avatar URL was not updated due to validation or processing issues. Other profile fields were updated successfully.',
            },
          ]
        : undefined,
    };
  }
}
