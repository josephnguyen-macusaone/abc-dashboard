/**
 * Token Service Unit Tests
 */
import { jest } from '@jest/globals';
import { TokenService } from '../../../src/shared/services/token-service.js';
import {
  ValidationException,
  InvalidTokenException,
} from '../../../src/domain/exceptions/domain.exception.js';

describe('TokenService', () => {
  let tokenService;

  beforeEach(() => {
    // Suppress logger output
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'debug').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    tokenService = new TokenService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('generateAccessToken', () => {
    it('should generate a valid access token', () => {
      const payload = { userId: 'user-123', email: 'test@example.com' };
      const token = tokenService.generateAccessToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should throw ValidationException for invalid payload', () => {
      expect(() => tokenService.generateAccessToken(null)).toThrow(ValidationException);
      expect(() => tokenService.generateAccessToken('string')).toThrow(ValidationException);
    });

    it('should throw ValidationException for payload without userId', () => {
      expect(() => tokenService.generateAccessToken({ email: 'test@example.com' })).toThrow(
        ValidationException
      );
      expect(() => tokenService.generateAccessToken({ email: 'test@example.com' })).toThrow(
        'Token payload must contain userId or id'
      );
    });

    it('should accept payload with id instead of userId', () => {
      const token = tokenService.generateAccessToken({ id: 'user-123', email: 'test@example.com' });

      expect(token).toBeDefined();
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const payload = { userId: 'user-123' };
      const token = tokenService.generateRefreshToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });
  });

  describe('generateTokens', () => {
    it('should generate both access and refresh tokens', () => {
      const payload = { userId: 'user-123', email: 'test@example.com' };
      const tokens = tokenService.generateTokens(payload);

      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(tokens.accessToken).not.toBe(tokens.refreshToken);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const payload = { userId: 'user-123', email: 'test@example.com' };
      const token = tokenService.generateAccessToken(payload);

      const decoded = tokenService.verifyToken(token);

      expect(decoded.userId).toBe('user-123');
      expect(decoded.email).toBe('test@example.com');
    });

    it('should throw ValidationException for empty token', () => {
      expect(() => tokenService.verifyToken('')).toThrow(ValidationException);
      expect(() => tokenService.verifyToken(null)).toThrow(ValidationException);
    });

    it('should throw InvalidTokenException for malformed token', () => {
      expect(() => tokenService.verifyToken('invalid-token')).toThrow(InvalidTokenException);
    });

    it('should throw InvalidTokenException for token with wrong signature', () => {
      const validToken = tokenService.generateAccessToken({ userId: 'user-123' });
      const tamperedToken = `${validToken.slice(0, -5)}xxxxx`;

      expect(() => tokenService.verifyToken(tamperedToken)).toThrow(InvalidTokenException);
    });
  });

  describe('generateEmailVerificationToken', () => {
    it('should generate email verification token', () => {
      const token = tokenService.generateEmailVerificationToken('user-123', 'test@example.com');

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });
  });

  describe('verifyEmailVerificationToken', () => {
    it('should verify valid email verification token', () => {
      const token = tokenService.generateEmailVerificationToken('user-123', 'test@example.com');
      const decoded = tokenService.verifyEmailVerificationToken(token);

      expect(decoded.userId).toBe('user-123');
      expect(decoded.email).toBe('test@example.com');
      expect(decoded.type).toBe('email_verification');
    });

    it('should throw error for invalid token', () => {
      expect(() => tokenService.verifyEmailVerificationToken('invalid-token')).toThrow(
        'Invalid email verification token'
      );
    });
  });

  describe('generatePasswordResetToken', () => {
    it('should generate password reset token', () => {
      const token = tokenService.generatePasswordResetToken('user-123', 'test@example.com');

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });
  });

  describe('verifyPasswordResetToken', () => {
    it('should verify valid password reset token', () => {
      const token = tokenService.generatePasswordResetToken('user-123', 'test@example.com');
      const decoded = tokenService.verifyPasswordResetToken(token);

      expect(decoded.userId).toBe('user-123');
      expect(decoded.email).toBe('test@example.com');
      expect(decoded.type).toBe('password_reset');
    });

    it('should throw error for invalid token', () => {
      expect(() => tokenService.verifyPasswordResetToken('invalid-token')).toThrow(
        'Invalid password reset token'
      );
    });
  });

  describe('hashToken', () => {
    it('should hash a token', () => {
      const token = 'some-token-value';
      const hash = tokenService.hashToken(token);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(token);
      expect(hash.length).toBe(64); // SHA256 produces 64 hex characters
    });

    it('should produce consistent hashes', () => {
      const token = 'some-token-value';
      const hash1 = tokenService.hashToken(token);
      const hash2 = tokenService.hashToken(token);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different tokens', () => {
      const hash1 = tokenService.hashToken('token-1');
      const hash2 = tokenService.hashToken('token-2');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('constructor', () => {
    it('should have null correlationId by default', () => {
      const service = new TokenService();

      expect(service.correlationId).toBeNull();
    });
  });
});
