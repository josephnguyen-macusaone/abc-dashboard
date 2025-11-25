/**
 * Auth Controller
 * Handles HTTP requests for authentication
 */
import {
  InvalidCredentialsException,
  AccountDeactivatedException,
  ValidationException,
  EmailAlreadyExistsException,
  ResourceNotFoundException
} from '../../domain/exceptions/domain.exception.js';
import logger from '../../infrastructure/config/logger.js';

export class AuthController {
  constructor(loginUseCase, registerUseCase, refreshTokenUseCase, verifyEmailUseCase, updateProfileUseCase, changePasswordUseCase) {
    this.loginUseCase = loginUseCase;
    this.registerUseCase = registerUseCase;
    this.refreshTokenUseCase = refreshTokenUseCase;
    this.verifyEmailUseCase = verifyEmailUseCase;
    this.updateProfileUseCase = updateProfileUseCase;
    this.changePasswordUseCase = changePasswordUseCase;
  }

  async register(req, res) {
    try {
      const { username, email, password, firstName, lastName, avatarUrl, avatarId, bio, phone } = req.body;

      const result = await this.registerUseCase.execute({
        username,
        email,
        password,
        firstName,
        lastName,
        avatarUrl,
        avatarId,
        bio,
        phone
      });

      res.status(201).json({
        success: true,
        message: result.message,
        data: {
          user: result.user,
          tokens: result.tokens
        }
      });
    } catch (error) {
      // Handle domain exceptions
      if (error instanceof ValidationException ||
          error instanceof EmailAlreadyExistsException) {
        return res.status(error.statusCode).json(error.toResponse());
      }

      // Handle unexpected errors
      logger.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'An unexpected error occurred during registration'
      });
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;

      const result = await this.loginUseCase.execute({ email, password });

      res.json({
        success: true,
        message: 'Login successful',
        data: result
      });
    } catch (error) {
      // Handle domain exceptions
      if (error instanceof InvalidCredentialsException ||
          error instanceof AccountDeactivatedException ||
          error instanceof ValidationException) {
        return res.status(error.statusCode).json(error.toResponse());
      }

      // Handle unexpected errors
      logger.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'An unexpected error occurred during login'
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
          // Fallback: extract properties manually
          userData = {
            id: req.user.id || req.user._id?.toString(),
            username: req.user.username || null,
            email: req.user.email || null,
            displayName: req.user.displayName || null,
            avatarUrl: req.user.avatarUrl || null,
            avatarId: req.user.avatarId || null,
            bio: req.user.bio || null,
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

      res.json({
        success: true,
        data: {
          id: user.id || user._id?.toString(),
          username: user.username,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl || null,
          avatarId: user.avatarId || null,
          bio: user.bio || null,
          phone: user.phone || null,
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

  async updateProfile(req, res) {
    try {
      const userId = req.user._id.toString();
      const updates = req.body;

      const result = await this.updateProfileUseCase.execute(userId, updates);

      res.json({
        success: true,
        message: result.message,
        data: {
          user: result.user
        }
      });
    } catch (error) {
      // Handle domain exceptions
      if (error instanceof ValidationException || error instanceof ResourceNotFoundException) {
        return res.status(error.statusCode).json(error.toResponse());
      }

      // Handle unexpected errors
      logger.error('Profile update error:', error);
      res.status(500).json({
        success: false,
        message: 'An unexpected error occurred during profile update'
      });
    }
  }

  async verifyEmail(req, res) {
    try {
      const { email, token } = req.body;

      const result = await this.verifyEmailUseCase.execute({
        email,
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
      const userId = req.user._id.toString();
      const { currentPassword, newPassword } = req.body;

      const result = await this.changePasswordUseCase.execute(userId, {
        currentPassword,
        newPassword
      });

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      // Handle domain exceptions
      if (error instanceof ValidationException || error instanceof ResourceNotFoundException) {
        return res.status(error.statusCode).json(error.toResponse());
      }

      // Handle unexpected errors
      logger.error('Password change error:', error);
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
}
