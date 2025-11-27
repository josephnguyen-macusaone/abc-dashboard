/**
 * Auth Controller
 * Handles HTTP requests for authentication
 */
import { BaseController } from './base-controller.js';
import logger from '../config/logger.js';

export class AuthController extends BaseController {
  constructor(loginUseCase, registerUseCase, refreshTokenUseCase, verifyEmailUseCase, changePasswordUseCase, requestPasswordResetUseCase, resetPasswordUseCase, tokenService) {
    super();
    this.loginUseCase = loginUseCase;
    this.registerUseCase = registerUseCase;
    this.refreshTokenUseCase = refreshTokenUseCase;
    this.verifyEmailUseCase = verifyEmailUseCase;
    this.changePasswordUseCase = changePasswordUseCase;
    this.requestPasswordResetUseCase = requestPasswordResetUseCase;
    this.resetPasswordUseCase = resetPasswordUseCase;
    this.tokenService = tokenService;
  }

  async register(req, res) {
    try {
      this.validateRequired(req, ['username', 'email', 'password']);

      const { username, email, password, firstName, lastName, avatarUrl, bio, phone } = req.body;

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
          phone
        },
        { operation: 'register', email, username }
      );

      // Generate tokens for immediate login (skip email verification requirement)
      const tokens = await this.tokenService.generateTokens({
        id: result.user.id,
        email: result.user.email,
        username: result.user.username
      });

      res.status(201).json({
        success: true,
        message: result.message,
        data: {
          user: result.user,
          tokens: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken
          }
        }
      });
    } catch (error) {
      return this.handleError(error, req, res, {
        operation: 'register',
        requestBody: { ...req.body, password: '[REDACTED]' }
      });
    }
  }

  async login(req, res) {
    let email, password;

    try {
      this.validateRequired(req, ['email', 'password']);

      ({ email, password } = req.body);

      const result = await this.executeUseCase(
        this.loginUseCase,
        { email, password },
        { operation: 'login', email }
      );

      res.json({
        success: true,
        message: 'Login successful',
        data: result
      });
    } catch (error) {
      return this.handleError(error, req, res, {
        operation: 'login',
        requestBody: {
          email: email || 'undefined',
          password: '[REDACTED]'
        }
      });
    }
  }

  async getStatus(req, res) {
    try {
      // Prevent caching for auth status - always return fresh data
      res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      // Debug: Log authorization header (only in development)
      if (process.env.NODE_ENV === 'development') {
        const authHeader = req.headers.authorization || req.headers.Authorization;
        logger.debug('Auth status check', {
          hasAuthHeader: !!authHeader,
          hasUser: !!req.user,
          authHeaderPrefix: authHeader ? authHeader.substring(0, 20) : null
        });
      }

      // Check if user is authenticated (user attached by optional auth middleware)
      if (req.user) {
        // Use getProfile() method if available (User entity), otherwise extract properties
        let userData;
        if (typeof req.user.getProfile === 'function') {
          userData = req.user.getProfile();
        } else {
        // Get user profile for bio
        const { container } = await import('../../shared/kernel/container.js');
        const userProfileRepository = container.getUserProfileRepository();
        const profile = await userProfileRepository.findByUserId(req.user.id);

        // Fallback: extract properties manually
        userData = {
          id: req.user.id || req.user._id?.toString(),
          username: req.user.username || null,
          email: req.user.email || null,
          displayName: req.user.displayName || null,
          role: req.user.role || null,
          avatarUrl: req.user.avatarUrl || null,
          bio: profile?.bio || null,
          phone: req.user.phone || null,
          createdAt: req.user.createdAt || null,
          updatedAt: req.user.updatedAt || null
        };
        }

        res.status(200).json({
          success: true,
          data: {
            user: userData,
            isAuthenticated: true
          }
        });
      } else {
        // Check if token was provided but invalid
        const authHeader = req.headers.authorization || req.headers.Authorization;
        const hasToken = authHeader && authHeader.startsWith('Bearer ');

        res.status(200).json({
          success: true,
          data: {
            user: null,
            isAuthenticated: false,
            // Include debug info in development
            ...(process.env.NODE_ENV === 'development' && {
              debug: {
                hasAuthHeader: !!authHeader,
                hasToken: hasToken,
                tokenPrefix: authHeader ? authHeader.substring(0, 20) + '...' : null
              }
            })
          }
        });
      }
    } catch (error) {
      logger.error('Auth status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get auth status',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async getProfile(req, res) {
    try {
      // User info is already attached by auth middleware
      const user = req.user;

      // Get user profile for bio
      const { container } = await import('../../shared/kernel/container.js');
      const userProfileRepository = container.getUserProfileRepository();
      const profile = await userProfileRepository.findByUserId(user.id);

      res.json({
        success: true,
        data: {
          id: user.id || user._id?.toString(),
          username: user.username,
          email: user.email,
          displayName: user.displayName,
          role: user.role,
          avatarUrl: user.avatarUrl || null,
          bio: profile?.bio,
          phone: user.phone || null,
          isActive: user.isActive,
          emailVerified: profile?.emailVerified ?? false,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get profile'
      });
    }
  }

  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      const result = await this.refreshTokenUseCase.execute({ refreshToken });

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: result
      });
    } catch (error) {
      // Handle domain exceptions
      if (error instanceof InvalidCredentialsException ||
          error instanceof ValidationException) {
        return res.status(error.statusCode).json(error.toResponse());
      }

      // Handle unexpected errors
      logger.error('Refresh token error:', error);
      res.status(500).json({
        success: false,
        message: 'An unexpected error occurred during token refresh'
      });
    }
  }


  async verifyEmail(req, res) {
    try {
      const { token } = req.body;

      const result = await this.verifyEmailUseCase.execute({
        token
      });

      res.json({
        success: true,
        message: result.message,
        data: {
          user: result.user
        }
      });
    } catch (error) {
      // Handle domain exceptions
      if (error instanceof ValidationException ||
          error instanceof ResourceNotFoundException) {
        return res.status(error.statusCode).json(error.toResponse());
      }

      // Handle unexpected errors
      logger.error('Email verification error:', error);
      res.status(500).json({
        success: false,
        message: 'An unexpected error occurred during email verification'
      });
    }
  }

  async changePassword(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User authentication required'
        });
      }

      const userId = req.user.id || (req.user._id ? req.user._id.toString() : null);
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User authentication failed'
        });
      }
      const { currentPassword, newPassword } = req.body;

      const result = await this.changePasswordUseCase.execute(userId, {
        currentPassword,
        newPassword
      });

      res.json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (error) {
      // Handle domain exceptions
      if (error instanceof ValidationException || error instanceof ResourceNotFoundException) {
        return res.status(error.statusCode).json(error.toResponse());
      }

      // Handle unexpected errors
      logger.error('Password change error:', {
        error: error.message,
        stack: error.stack,
        userId: typeof userId !== 'undefined' ? userId : 'undefined',
        hasUser: !!req.user,
        email: req.user?.email
      });
      res.status(500).json({
        success: false,
        message: 'An unexpected error occurred during password change'
      });
    }
  }

  async logout(req, res) {
    try {
      // In a stateless JWT system, logout is handled client-side
      // by removing the token. We could implement token blacklisting here.
      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Logout failed'
      });
    }
  }

  async requestPasswordReset(req, res) {
    try {
      const { email } = req.body;

      const result = await this.requestPasswordResetUseCase.execute({ email });

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      // Handle domain exceptions
      if (error instanceof ValidationException) {
        return res.status(error.statusCode).json(error.toResponse());
      }

      // Don't reveal if email exists or not for security
      logger.error('Password reset request error:', error);
      res.json({
        success: true,
        message: 'Password reset email sent if account exists'
      });
    }
  }

  async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;

      const result = await this.resetPasswordUseCase.execute({
        token,
        newPassword
      });

      res.json({
        success: true,
        message: result.message,
        data: result.user
      });
    } catch (error) {
      // Handle domain exceptions
      if (error instanceof ValidationException || error instanceof ResourceNotFoundException) {
        return res.status(error.statusCode).json(error.toResponse());
      }

      logger.error('Password reset error:', error);
      res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }
  }
}
