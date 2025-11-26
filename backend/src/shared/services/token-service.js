import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../../infrastructure/config/config.js';

/**
 * Token Service
 * Handles JWT token generation and verification
 */
export class TokenService {
  constructor() {
    this.jwtSecret = config.JWT_SECRET;
    this.jwtExpiresIn = config.JWT_EXPIRES_IN;
    this.refreshTokenExpiresIn = config.JWT_REFRESH_EXPIRES_IN;
    this.jwtIssuer = config.JWT_ISSUER;
    this.emailVerificationExpiresIn = config.JWT_EMAIL_VERIFICATION_EXPIRES_IN;
  }

  /**
   * Generate access token
   * @param {Object} payload - Token payload
   * @returns {string} JWT access token
   */
  generateAccessToken(payload) {
    try {
      return jwt.sign(payload, this.jwtSecret, {
        expiresIn: this.jwtExpiresIn,
        issuer: this.jwtIssuer
      });
    } catch (error) {
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
        issuer: this.jwtIssuer
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
      return jwt.verify(token, this.jwtSecret, {
        issuer: this.jwtIssuer
      });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      } else {
        throw new Error(`Token verification failed: ${error.message}`);
      }
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
          type: 'email_verification'
        },
        this.jwtSecret,
        {
          expiresIn: this.emailVerificationExpiresIn,
          issuer: this.jwtIssuer
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
        issuer: this.jwtIssuer
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
        refreshToken
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
}
