/**
 * Update Profile Use Case
 * Handles user self-profile updates with graceful degradation
 */
import {
  ValidationException,
  ResourceNotFoundException
} from '../../../domain/exceptions/domain.exception.js';
import { executeWithDegradation } from '../../../shared/utils/graceful-degradation.js';
import { withTimeout, TimeoutPresets } from '../../../shared/utils/retry.js';
import logger from '../../../infrastructure/config/logger.js';

export class UpdateProfileUseCase {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async execute(userId, updates) {
    try {
      // Validate input
      if (!userId) {
        throw new ValidationException('User ID is required');
      }

      if (!updates || Object.keys(updates).length === 0) {
        throw new ValidationException('No updates provided');
      }

      // Find the user to update
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new ResourceNotFoundException('User');
      }

      // Separate user fields and profile fields
      const userFields = ['displayName', 'phone']; // Required user fields
      const profileFields = ['bio']; // Profile fields

      const userUpdates = {};
      const profileUpdates = {};
      const avatarUrlUpdate = updates.avatarUrl;

      // Separate updates by collection
      Object.keys(updates).forEach(key => {
        if (userFields.includes(key)) {
          userUpdates[key] = updates[key];
        } else if (profileFields.includes(key)) {
          profileUpdates[key] = updates[key];
        }
      });

      // Check if we have any required updates (excluding avatarUrl)
      const hasRequiredUpdates = Object.keys(userUpdates).length > 0 || Object.keys(profileUpdates).length > 0;

      if (!hasRequiredUpdates && !avatarUrlUpdate) {
        throw new ValidationException('No valid fields provided for update');
      }

      // Update user data (required fields first)
      let updatedUser = user;
      if (Object.keys(userUpdates).length > 0) {
        updatedUser = await this.userRepository.update(userId, userUpdates);
        if (!updatedUser) {
          throw new Error('Failed to update user profile');
        }
      }

      // Handle avatarUrl with graceful degradation - don't fail the whole update if it has issues
      let avatarUrlSkipped = false;
      if (avatarUrlUpdate !== undefined) {
        const avatarResult = await executeWithDegradation(
          'avatar_processing',
          async () => {
            logger.info('Processing avatar URL update', {
              userId,
              avatarUrlType: typeof avatarUrlUpdate,
              avatarUrlLength: typeof avatarUrlUpdate === 'string' ? avatarUrlUpdate.length : 'N/A'
            });

            // Ensure avatarUrl is a string to prevent type errors
            const safeAvatarUrl = typeof avatarUrlUpdate === 'string' ? avatarUrlUpdate : String(avatarUrlUpdate || '');
            const avatarOnlyUpdate = { avatarUrl: safeAvatarUrl };

            const userWithAvatar = await this.userRepository.update(userId, avatarOnlyUpdate);
            if (!userWithAvatar) {
              throw new Error('Avatar URL update returned null user object');
            }

            updatedUser = userWithAvatar;
            logger.info('Avatar URL update successful', { userId });
            return { success: true, user: userWithAvatar };
          },
          (error) => {
            avatarUrlSkipped = true;
            logger.warn('Avatar processing failed, using graceful degradation', {
              userId,
              error: error.message,
              willUseDefault: true
            });
            return { success: false, skipped: true, reason: 'processing_failed' };
          },
          { operation: 'avatar_update', userId, avatarUrlType: typeof avatarUrlUpdate }
        );
      }

      // Always ensure a profile record exists, even if no profile fields are updated
      const { container } = await import('../../../shared/kernel/container.js');
      const userProfileRepository = container.getUserProfileRepository();

      // Update profile with timeout handling
      await withTimeout(
        async () => {
          if (Object.keys(profileUpdates).length > 0) {
            // Update profile with provided data
            await userProfileRepository.updateByUserId(userId, profileUpdates);
          } else {
            // Ensure profile record exists with default values
            await userProfileRepository.updateByUserId(userId, {
              bio: null,
              emailVerified: false
            });
          }
        },
        TimeoutPresets.DATABASE,
        'profile_update',
        {
          correlationId: `profile_${userId}_${Date.now()}`,
          onTimeout: (error) => {
            logger.error('Profile update operation timed out', {
              userId,
              profileUpdates: Object.keys(profileUpdates),
              timeout: TimeoutPresets.DATABASE
            });
          }
        }
      );

      // Log the update
      const updatedFields = [
        ...Object.keys(userUpdates),
        ...Object.keys(profileUpdates),
        ...(avatarUrlUpdate !== undefined ? ['avatarUrl'] : [])
      ];
      logger.info('User profile updated', {
        userId,
        updatedFields
      });

      // Fetch the updated profile data to include in response
      let finalBio = updatedUser.bio; // Default to existing bio
      if (Object.keys(profileUpdates).length > 0) {
        await withTimeout(
          async () => {
            const { container } = await import('../../../shared/kernel/container.js');
            const userProfileRepository = container.getUserProfileRepository();
            const updatedProfile = await userProfileRepository.findByUserId(userId);
            finalBio = updatedProfile?.bio || null;
          },
          TimeoutPresets.DATABASE,
          'profile_fetch_after_update',
          {
            correlationId: `profile_fetch_${userId}_${Date.now()}`,
            onTimeout: (error) => {
              logger.warn('Profile fetch after update timed out, using existing bio', {
                userId,
                existingBio: updatedUser.bio
              });
              // Continue with existing bio if fetch times out
            }
          }
        );
      }

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
          updatedAt: updatedUser.updatedAt
        },
        message: avatarUrlSkipped
          ? 'Profile updated successfully, but avatar URL was skipped due to validation issues'
          : 'Profile updated successfully',
        warnings: avatarUrlSkipped ? [{
          field: 'avatarUrl',
          message: 'Avatar URL was not updated due to validation or processing issues. Other profile fields were updated successfully.'
        }] : undefined
      };
    } catch (error) {
      // Re-throw domain exceptions as-is
      if (error instanceof ValidationException || error instanceof ResourceNotFoundException) {
        throw error;
      }
      // Wrap unexpected errors
      throw new Error(`Profile update failed: ${error.message}`);
    }
  }
}
