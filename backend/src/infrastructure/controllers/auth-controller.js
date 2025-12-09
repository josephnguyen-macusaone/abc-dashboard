/**
 * Auth Controller
 * Handles HTTP requests for authentication
 */
import { BaseController } from './base-controller.js';
import logger from '../config/logger.js';
import { AuthValidator } from '../../application/validators/index.js';
import { sendErrorResponse } from '../../shared/http/error-responses.js';
import {
  InvalidCredentialsException,
  ValidationException,
  ResourceNotFoundException,
  InvalidRefreshTokenException,
} from '../../domain/exceptions/domain.exception.js';
import { trackFailedLogin, resetFailedAttempts } from '../api/v1/middleware/security.middleware.js';

export class AuthController extends BaseController {
  constructor(
    loginUseCase,
    refreshTokenUseCase,
    changePasswordUseCase,
    requestPasswordResetUseCase,
    requestPasswordResetWithGeneratedPasswordUseCase,
    resetPasswordUseCase,
    tokenService,
    userProfileRepository
  ) {
    super();
    this.loginUseCase = loginUseCase;
    this.refreshTokenUseCase = refreshTokenUseCase;
    this.changePasswordUseCase = changePasswordUseCase;
    this.requestPasswordResetUseCase = requestPasswordResetUseCase;
    this.requestPasswordResetWithGeneratedPasswordUseCase =
      requestPasswordResetWithGeneratedPasswordUseCase;
    this.resetPasswordUseCase = resetPasswordUseCase;
    this.tokenService = tokenService;
    this.userProfileRepository = userProfileRepository;
  }

  async login(req, res) {
    let email, password;

    try {
      ({ email, password } = req.body);

      // Use comprehensive AuthValidator for login
      AuthValidator.validateLogin({ email, password });

      const result = await this.executeUseCase(
        this.loginUseCase,
        { email, password },
        { operation: 'login', email }
      );

      await resetFailedAttempts(req);

      return res.success(result, 'Login successful');
    } catch (error) {
      if (error instanceof InvalidCredentialsException) {
        await trackFailedLogin(req);
      }

      return this.handleError(error, req, res, {
        operation: 'login',
        requestBody: {
          email: email || 'undefined',
          password: '[REDACTED]',
        },
      });
    }
  }

  async getProfile(req, res) {
    try {
      // Prevent caching - always return fresh data
      res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
        Pragma: 'no-cache',
        Expires: '0',
      });

      logger.debug('Get profile request', {
        correlationId: req.correlationId,
        hasUser: !!req.user,
        userId: req.user?.id,
        userRole: req.user?.role,
        userEmail: req.user?.email,
      });

      // Check if user is authenticated (user attached by optional auth middleware)
      if (!req.user) {
        // Not authenticated - return status only
        logger.warn('Get profile - no user attached', {
          correlationId: req.correlationId,
        });
        return res.success(
          {
            user: null,
            isAuthenticated: false,
          },
          'Not authenticated'
        );
      }

      // User is authenticated - return full profile
      const user = req.user;

      logger.debug('Auth controller getProfile - authenticated user', {
        correlationId: req.correlationId,
        userId: user?.id || user?._id,
        userRole: user?.role,
        userEmail: user?.email,
      });

      // Validate user object
      if (!user.id && !user._id) {
        logger.warn('Auth controller getProfile - invalid user object', {
          correlationId: req.correlationId,
          hasId: !!user?.id,
          has_id: !!user?._id,
        });
        return sendErrorResponse(res, 'INVALID_TOKEN');
      }

      // Get user profile for additional data
      let profile = null;
      try {
        if (!this.userProfileRepository) {
          return sendErrorResponse(res, 'SERVICE_UNAVAILABLE');
        }

        const userId = user.id || user._id?.toString();
        profile = await this.userProfileRepository.findByUserId(userId);
      } catch (profileError) {
        // Continue without profile - it's optional
        profile = null;
      }

      const responseData = {
        user: {
          id: user.id || user._id?.toString(),
          username: user.username,
          email: user.email,
          displayName: user.displayName,
          role: user.role,
          avatarUrl: user.avatarUrl || null,
          bio: profile?.bio || null,
          phone: user.phone || null,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        isAuthenticated: true,
      };

      logger.debug('Sending profile response', {
        correlationId: req.correlationId,
        userId: responseData.user.id,
        userRole: responseData.user.role,
        isAuthenticated: responseData.isAuthenticated,
      });

      return res.status(200).json({
        success: true,
        message: 'Profile retrieved successfully',
        timestamp: new Date().toISOString(),
        data: responseData,
      });
    } catch (error) {
      logger.error('Get profile error: Unexpected error', {
        error: error.message,
        userId: req.user?.id || req.user?._id?.toString(),
        correlationId: req.correlationId,
      });
      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  }

  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      // Use comprehensive AuthValidator for refresh token
      AuthValidator.validateRefreshToken({ refreshToken });

      const result = await this.refreshTokenUseCase.execute({ refreshToken });

      return res.success(result, 'Token refreshed successfully');
    } catch (error) {
      // Handle domain exceptions
      if (
        error instanceof InvalidCredentialsException ||
        error instanceof ValidationException ||
        error instanceof InvalidRefreshTokenException
      ) {
        return res.status(error.statusCode).json(error.toResponse());
      }

      // Handle unexpected errors
      logger.error('Refresh token error:', error);
      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  }

  async changePassword(req, res) {
    let userId;
    try {
      if (!req.user) {
        return sendErrorResponse(res, 'TOKEN_MISSING');
      }

      userId = req.user.id || (req.user._id ? req.user._id?.toString() : null);
      if (!userId) {
        return sendErrorResponse(res, 'INVALID_TOKEN');
      }
      const { currentPassword, newPassword } = req.body;

      // Use comprehensive AuthValidator for password change
      AuthValidator.validatePasswordChange({
        currentPassword,
        newPassword,
      });

      const result = await this.changePasswordUseCase.execute(userId, {
        currentPassword,
        newPassword,
      });

      return res.success(result, result.message);
    } catch (error) {
      // Handle domain exceptions
      if (error instanceof ValidationException || error instanceof ResourceNotFoundException) {
        return res.status(error.statusCode).json(error.toResponse());
      }

      // Handle unexpected errors
      logger.error('Password change error:', {
        error: error.message,
        userId: userId || 'undefined',
        correlationId: req.correlationId,
      });
      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  }

  async logout(req, res) {
    try {
      if (!req.user) {
        return sendErrorResponse(res, 'TOKEN_MISSING');
      }

      // With JWT-based refresh tokens, logout is implicit through token expiration
      // No database cleanup needed as refresh tokens are self-contained
      logger.debug('User logout processed', {
        correlationId: req.correlationId,
        userId: req.user.id || req.user._id?.toString(),
      });

      return res.success(null, 'Logout successful');
    } catch (error) {
      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  }

  async requestPasswordReset(req, res) {
    try {
      const { email } = req.body;

      const result = await this.requestPasswordResetUseCase.execute({ email });

      return res.success(null, result.message);
    } catch (error) {
      // Handle domain exceptions
      if (error instanceof ValidationException) {
        return res.status(error.statusCode).json(error.toResponse());
      }

      // Don't reveal if email exists or not for security
      logger.error('Password reset request failed:', error);
      return res.success(null, 'Password reset email sent if account exists');
    }
  }

  async requestPasswordResetWithGeneratedPassword(req, res) {
    try {
      const { email } = req.body;

      const result = await this.requestPasswordResetWithGeneratedPasswordUseCase.execute({ email });

      return res.success(null, result.message);
    } catch (error) {
      // Handle domain exceptions
      if (error instanceof ValidationException) {
        return res.status(error.statusCode).json(error.toResponse());
      }

      // Don't reveal if email exists or not for security
      logger.error('Password reset with generated password request failed:', error);
      return res.success(null, 'Password reset email sent if account exists');
    }
  }

  async resetPassword(req, res) {
    try {
      const { token, password } = req.body;

      const result = await this.resetPasswordUseCase.execute({
        token,
        newPassword: password,
      });

      return res.success(result.user, result.message);
    } catch (error) {
      // Handle domain exceptions
      if (error instanceof ValidationException || error instanceof ResourceNotFoundException) {
        return res.status(error.statusCode).json(error.toResponse());
      }

      logger.error('Password reset error:', error);
      return sendErrorResponse(res, 'INVALID_RESET_TOKEN');
    }
  }
}
