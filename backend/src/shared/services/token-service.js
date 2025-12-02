import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../../infrastructure/config/config.js';
import logger from '../../infrastructure/config/logger.js';
import {
  ValidationException,
  TokenExpiredException,
  InvalidTokenException,
} from '../../domain/exceptions/domain.exception.js';

/**
 * Token Service
 * Handles JWT token generation and verification with comprehensive error handling
 */
export class TokenService {
  constructor() {
    this.correlationId = null;
    this.operationId = null;
    this.jwtSecret = config.JWT_SECRET;
    this.jwtExpiresIn = config.JWT_EXPIRES_IN;
    this.refreshTokenExpiresIn = config.JWT_REFRESH_EXPIRES_IN;
    this.jwtIssuer = config.JWT_ISSUER;
    this.emailVerificationExpiresIn = config.JWT_EMAIL_VERIFICATION_EXPIRES_IN;
    this.passwordResetExpiresIn = config.JWT_PASSWORD_RESET_EXPIRES_IN;

    // Validate configuration
    if (!this.jwtSecret) {
      throw new Error('JWT_SECRET is required for token service');
    }
  }

  /**
   * Generate access token with validation and error handling
   * @param {Object} payload - Token payload
   * @returns {string} JWT access token
   */
  generateAccessToken(payload) {
    try {
      if (!payload || typeof payload !== 'object') {
        throw new ValidationException('Token payload must be a valid object');
      }

      if (!payload.userId && !payload.id) {
        throw new ValidationException('Token payload must contain userId or id');
      }

      const token = jwt.sign(payload, this.jwtSecret, {
        expiresIn: this.jwtExpiresIn,
        issuer: this.jwtIssuer,
        audience: payload.email || 'user',
      });

      return token;
    } catch (error) {
      if (error instanceof ValidationException) {
        throw error;
      }

      logger.error('Failed to generate access token', {
        correlationId: this.correlationId,
        error: error.message,
        payloadKeys: payload ? Object.keys(payload) : null,
      });

      throw new Error(`Failed to generate access token: ${error.message}`);
    }
  }

  /**
   * Generate refresh token
   * @param {Object} payload - Token payload
   * @returns {string} JWT refresh token
   */
  generateRefreshToken(payload) {
    try {
      return jwt.sign(payload, this.jwtSecret, {
        expiresIn: this.refreshTokenExpiresIn,
        issuer: this.jwtIssuer,
      });
    } catch (error) {
      throw new Error(`Failed to generate refresh token: ${error.message}`);
    }
  }

  /**
   * Verify JWT token
   * @param {string} token - JWT token
   * @returns {Object} Decoded payload
   */
  verifyToken(token) {
    try {
      if (!token || typeof token !== 'string') {
        throw new ValidationException('Token must be a non-empty string');
      }

      const decoded = jwt.verify(token, this.jwtSecret, {
        issuer: this.jwtIssuer,
      });

      return decoded;
    } catch (error) {
      if (error instanceof ValidationException) {
        throw error;
      }

      if (error.name === 'TokenExpiredError') {
        logger.warn('Token verification failed - expired token', {
          correlationId: this.correlationId,
          expiredAt: error.expiredAt,
        });
        throw new TokenExpiredException();
      }

      if (error.name === 'JsonWebTokenError') {
        logger.warn('Token verification failed - invalid token', {
          correlationId: this.correlationId,
          error: error.message,
        });
        throw new InvalidTokenException();
      }

      logger.error('Token verification failed - unexpected error', {
        correlationId: this.correlationId,
        error: error.message,
        errorName: error.name,
      });

      throw new InvalidTokenException();
    }
  }

  /**
   * Generate email verification JWT token
   * @param {string} userId - User ID
   * @param {string} email - User email
   * @returns {string} JWT verification token
   */
  generateEmailVerificationToken(userId, email) {
    try {
      return jwt.sign(
        {
          userId,
          email,
          type: 'email_verification',
        },
        this.jwtSecret,
        {
          expiresIn: this.emailVerificationExpiresIn,
          issuer: this.jwtIssuer,
        }
      );
    } catch (error) {
      throw new Error(`Failed to generate email verification token: ${error.message}`);
    }
  }

  /**
   * Verify email verification JWT token
   * @param {string} token - JWT verification token
   * @returns {Object} Decoded payload
   */
  verifyEmailVerificationToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret, {
        issuer: this.jwtIssuer,
      });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Email verification token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid email verification token');
      } else {
        throw new Error(`Email verification token verification failed: ${error.message}`);
      }
    }
  }

  /**
   * Generate password reset JWT token
   * @param {string} userId - User ID
   * @param {string} email - User email
   * @returns {string} JWT password reset token
   */
  generatePasswordResetToken(userId, email) {
    try {
      return jwt.sign(
        {
          userId,
          email,
          type: 'password_reset',
        },
        this.jwtSecret,
        {
          expiresIn: this.passwordResetExpiresIn,
          issuer: this.jwtIssuer,
        }
      );
    } catch (error) {
      throw new Error(`Failed to generate password reset token: ${error.message}`);
    }
  }

  /**
   * Verify password reset JWT token
   * @param {string} token - JWT password reset token
   * @returns {Object} Decoded payload
   */
  verifyPasswordResetToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret, {
        issuer: this.jwtIssuer,
      });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Password reset token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid password reset token');
      } else {
        throw new Error(`Password reset token verification failed: ${error.message}`);
      }
    }
  }

  /**
   * Generate both access and refresh tokens
   * @param {Object} payload - Token payload (user data)
   * @returns {Object} Object containing accessToken and refreshToken
   */
  generateTokens(payload) {
    try {
      const accessToken = this.generateAccessToken(payload);
      const refreshToken = this.generateRefreshToken(payload);

      return {
        accessToken,
        refreshToken,
      };
    } catch (error) {
      throw new Error(`Failed to generate tokens: ${error.message}`);
    }
  }

  /**
   * Hash token for storage
   * @param {string} token - Plain token
   * @returns {string} Hashed token
   */
  hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Set correlation ID for request tracking (used by DI container)
   * @param {string} correlationId - Request correlation ID
   */
  setCorrelationId(correlationId) {
    this.correlationId = correlationId;
    this.operationId = correlationId ? `${correlationId}_token` : null;
  }
}
