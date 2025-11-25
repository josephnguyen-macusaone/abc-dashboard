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
    this.jwtExpiresIn = config.JWT_EXPIRES_IN || '1h';
    this.refreshTokenExpiresIn = config.JWT_REFRESH_EXPIRES_IN || '7d';
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
        issuer: 'your-app',
        audience: 'your-app-users'
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
        issuer: 'your-app',
        audience: 'your-app-refresh'
      });
    } catch (error) {
      throw new Error(`Failed to generate refresh token: ${error.message}`);
    }
  }

  /**
   * Verify JWT token
   * @param {string} token - JWT token
   * @param {string} expectedAudience - Expected audience
   * @returns {Object} Decoded payload
   */
  verifyToken(token, expectedAudience = 'your-app-users') {
    try {
      return jwt.verify(token, this.jwtSecret, {
        issuer: 'your-app',
        audience: expectedAudience
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
   * Generate email verification token
   * @returns {string} Random token
   */
  generateEmailVerificationToken() {
    return crypto.randomBytes(32).toString('hex');
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
