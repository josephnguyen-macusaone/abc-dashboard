/**
 * Profile Controller
 * Handles HTTP requests for user profile management
 */
import { BaseController } from './base-controller.js';

export class ProfileController extends BaseController {
  constructor(
    getProfileUseCase,
    updateProfileUseCase,
    updateAuthProfileUseCase,
    recordLoginUseCase,
    verifyEmailUseCase
  ) {
    super();
    this.getProfileUseCase = getProfileUseCase;
    this.updateProfileUseCase = updateProfileUseCase;
    this.updateAuthProfileUseCase = updateAuthProfileUseCase;
    this.recordLoginUseCase = recordLoginUseCase;
    this.verifyEmailUseCase = verifyEmailUseCase;
  }

  async getProfile(req, res) {
    try {
      const userId = this.getUserId(req);

      const result = await this.executeUseCase(
        this.getProfileUseCase,
        [userId],
        { operation: 'getProfile', userId }
      );

      res.success(result.profile, 'Profile retrieved successfully');
    } catch (error) {
      return this.handleError(error, req, res, {
        operation: 'getProfile'
      });
    }
  }

  async updateProfile(req, res) {
    try {
      const userId = this.getUserId(req);
      const { displayName, bio, phone, avatarUrl } = req.body;

      // Use the auth update profile use case which handles all profile fields
      const updates = {};
      if (displayName !== undefined) updates.displayName = displayName;
      if (bio !== undefined) updates.bio = bio;
      if (phone !== undefined) updates.phone = phone;
      if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;

      const result = await this.executeUseCase(
        this.updateAuthProfileUseCase,
        [userId, updates],
        { operation: 'updateProfile', userId }
      );

      // Include warnings in the response meta if any
      const meta = result.warnings ? { warnings: result.warnings } : {};
      res.success({ user: result.user }, result.message, meta);
    } catch (error) {
      return this.handleError(error, req, res, {
        operation: 'updateProfile',
        requestBody: req.body
      });
    }
  }

  async recordLogin(req, res) {
    try {
      const userId = this.getUserId(req);

      const result = await this.executeUseCase(
        this.recordLoginUseCase,
        [userId],
        { operation: 'recordLogin', userId }
      );

      res.success(result.profile, result.message);
    } catch (error) {
      return this.handleError(error, req, res, {
        operation: 'recordLogin'
      });
    }
  }

  async verifyEmail(req, res) {
    try {
      const userId = this.getUserId(req);

      const result = await this.executeUseCase(
        this.verifyEmailUseCase,
        [userId],
        { operation: 'verifyEmail', userId }
      );

      res.success(result.profile, result.message);
    } catch (error) {
      return this.handleError(error, req, res, {
        operation: 'verifyEmail'
      });
    }
  }
}
