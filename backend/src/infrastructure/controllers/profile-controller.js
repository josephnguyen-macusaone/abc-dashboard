/**
 * Profile Controller
 * Handles HTTP requests for user profile management
 */
import { BaseController } from './base-controller.js';
import { UpdateProfileRequestDto } from '../../application/dto/profile/index.js';
import { sendErrorResponse } from '../../shared/http/error-responses.js';

export class ProfileController extends BaseController {
  constructor(
    getProfileUseCase,
    profileUpdateProfileUseCase,
    authUpdateProfileUseCase,
    recordLoginUseCase
  ) {
    super();
    this.getProfileUseCase = getProfileUseCase;
    this.updateProfileUseCase = profileUpdateProfileUseCase;
    this.updateAuthProfileUseCase = authUpdateProfileUseCase;
    this.recordLoginUseCase = recordLoginUseCase;
  }

  async getProfile(req, res) {
    try {
      const userId = this.getUserId(req);

      const result = await this.executeUseCase(this.getProfileUseCase, [userId], {
        operation: 'getProfile',
        userId,
      });

      res.success(result.profile, 'Profile retrieved successfully');
    } catch (error) {
      return this.handleError(error, req, res, {
        operation: 'getProfile',
      });
    }
  }

  async updateProfile(req, res) {
    try {
      const userId = this.getUserId(req);
      const { displayName, bio, phone, avatarUrl } = req.body;

      // Create and validate request DTO
      const updateRequest = UpdateProfileRequestDto.fromRequest({
        displayName,
        bio,
        phone,
        avatarUrl,
      });

      // Check if there are any updates
      if (!updateRequest.hasUpdates()) {
        return sendErrorResponse(
          res,
          'VALIDATION_FAILED',
          {},
          {
            customMessage: 'No valid fields provided for update',
            details: [{ field: 'body', message: 'No valid fields provided for update' }],
          }
        );
      }

      // Use the auth update profile use case which handles all profile fields
      const result = await this.executeUseCase(
        this.updateAuthProfileUseCase,
        [userId, updateRequest.getUpdates()],
        {
          operation: 'updateProfile',
          userId,
        }
      );

      // Include warnings in the response meta if any
      const meta = result.warnings ? { warnings: result.warnings } : {};
      res.success({ user: result.user }, result.message, meta);
    } catch (error) {
      return this.handleError(error, req, res, {
        operation: 'updateProfile',
        requestBody: req.body,
      });
    }
  }

  async recordLogin(req, res) {
    try {
      const userId = this.getUserId(req);

      const result = await this.executeUseCase(this.recordLoginUseCase, [userId], {
        operation: 'recordLogin',
        userId,
      });

      res.success(result.profile, result.message);
    } catch (error) {
      return this.handleError(error, req, res, {
        operation: 'recordLogin',
      });
    }
  }
}
