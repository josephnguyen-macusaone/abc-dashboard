/**
 * Auth Controller
 * Handles HTTP requests for authentication
 */
import { BaseController } from './base-controller.js';
import logger from '../config/logger.js';
import { AuthValidator } from '../../application/validators/index.js';
import {
  InvalidCredentialsException,
  ValidationException,
  ResourceNotFoundException,
} from '../../domain/exceptions/domain.exception.js';

export class AuthController extends BaseController {
  constructor(
    loginUseCase,
    registerUseCase,
    refreshTokenUseCase,
    verifyEmailUseCase,
    markEmailVerifiedUseCase,
    changePasswordUseCase,
    requestPasswordResetUseCase,
    resetPasswordUseCase,
    tokenService
  ) {
    super();
    this.loginUseCase = loginUseCase;
    this.registerUseCase = registerUseCase;
    this.refreshTokenUseCase = refreshTokenUseCase;
    this.verifyEmailUseCase = verifyEmailUseCase;
    this.markEmailVerifiedUseCase = markEmailVerifiedUseCase;
    this.changePasswordUseCase = changePasswordUseCase;
    this.requestPasswordResetUseCase = requestPasswordResetUseCase;
    this.resetPasswordUseCase = resetPasswordUseCase;
    this.tokenService = tokenService;
  }

  async register(req, res) {
    try {
      const { username, email, password, firstName, lastName, avatarUrl, bio, phone } = req.body;

      // Use comprehensive AuthValidator for registration
      AuthValidator.validateRegister({
        username,
        email,
        password,
        displayName: firstName && lastName ? `${firstName} ${lastName}` : undefined,
      });

      const result = await this.executeUseCase(
        this.registerUseCase,
        {
          username,
          email,
          password,
          firstName,
          lastName,
          avatarUrl,
          bio,
          phone,
        },
        { operation: 'register', email, username }
      );

      // Generate tokens for immediate login (skip email verification requirement)
      const tokens = await this.tokenService.generateTokens({
        id: result.user.id,
        email: result.user.email,
        username: result.user.username,
      });

      return res.created(
        {
          user: result.user,
          tokens: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
          },
        },
        result.message
      );
    } catch (error) {
      return this.handleError(error, req, res, {
        operation: 'register',
        requestBody: { ...req.body, password: '[REDACTED]' },
      });
    }
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

      return res.success(result, 'Login successful');
    } catch (error) {
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

      // Check if user is authenticated (user attached by optional auth middleware)
      if (!req.user) {
        // Not authenticated - return status only
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

      // Get user profile for additional data
      const { container } = await import('../../shared/kernel/container.js');
      const userProfileRepository = container.getUserProfileRepository();
      const profile = await userProfileRepository.findByUserId(user.id);

      return res.success(
        {
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
            emailVerified: profile?.emailVerified ?? false,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          },
          isAuthenticated: true,
        },
        'Profile retrieved successfully'
      );
    } catch (error) {
      logger.error('Get profile error:', error);
      return res.error(
        'Failed to get profile',
        500,
        process.env.NODE_ENV === 'development' ? { details: error.message } : {}
      );
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
      if (error instanceof InvalidCredentialsException || error instanceof ValidationException) {
        return res.status(error.statusCode).json(error.toResponse());
      }

      // Handle unexpected errors
      logger.error('Refresh token error:', error);
      return res.error('An unexpected error occurred during token refresh', 500);
    }
  }

  async verifyEmail(req, res) {
    try {
      const { token, action } = req.body;

      // Determine flow type
      if (token) {
        // Registration verification flow - requires token
        const result = await this.verifyEmailUseCase.execute({ token });

        return res.success({ user: result.user }, result.message);
      } else if (action === 'confirm') {
        // Authenticated user confirmation flow - requires authentication
        if (!req.user) {
          return res.error('Authentication required for email confirmation', 401);
        }

        const userId = req.user.id || req.user._id?.toString();
        if (!userId) {
          return res.error('User authentication failed', 401);
        }

        // Use the mark email verified use case
        const result = await this.markEmailVerifiedUseCase.execute(userId);

        return res.success({ profile: result.profile }, result.message);
      } else {
        return res.error(
          'Either token (for verification) or action (for confirmation) must be provided',
          400
        );
      }
    } catch (error) {
      // Handle domain exceptions
      if (error instanceof ValidationException || error instanceof ResourceNotFoundException) {
        return res.status(error.statusCode).json(error.toResponse());
      }

      // Handle unexpected errors
      logger.error('Email verification/confirmation error:', error);
      return res.error('An unexpected error occurred during email verification', 500);
    }
  }

  async changePassword(req, res) {
    let userId;
    try {
      if (!req.user) {
        return res.error('User authentication required', 401);
      }

      userId = req.user.id || (req.user._id ? req.user._id?.toString() : null);
      if (!userId) {
        return res.error('User authentication failed', 401);
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
        stack: error.stack,
        userId: userId || 'undefined',
        hasUser: !!req.user,
        email: req.user?.email,
      });
      return res.error('An unexpected error occurred during password change', 500);
    }
  }

  async logout(req, res) {
    try {
      // In a stateless JWT system, logout is handled client-side
      // by removing the token. We could implement token blacklisting here.
      return res.success(null, 'Logout successful');
    } catch (error) {
      return res.error('Logout failed', 500);
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
      logger.error('Password reset request error:', error);
      return res.success(null, 'Password reset email sent if account exists');
    }
  }

  async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;

      const result = await this.resetPasswordUseCase.execute({
        token,
        newPassword,
      });

      return res.success(result.user, result.message);
    } catch (error) {
      // Handle domain exceptions
      if (error instanceof ValidationException || error instanceof ResourceNotFoundException) {
        return res.status(error.statusCode).json(error.toResponse());
      }

      logger.error('Password reset error:', error);
      return res.error('Invalid or expired reset token', 400);
    }
  }
}
