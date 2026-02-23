/**
 * Validators Unit Tests
 */
import { AuthValidator } from '../../../src/application/validators/auth-validator.js';
import { UserValidator } from '../../../src/application/validators/user-validator.js';
import { ProfileValidator } from '../../../src/application/validators/profile-validator.js';
import { ValidationException } from '../../../src/domain/exceptions/domain.exception.js';

describe('AuthValidator', () => {
  describe('validateLogin', () => {
    it('should pass for valid login input', () => {
      expect(AuthValidator.validateLogin({ email: 'test@example.com', password: 'pass123' })).toBe(
        true
      );
    });

    it('should throw for missing email', () => {
      expect(() => AuthValidator.validateLogin({ password: 'pass123' })).toThrow(
        ValidationException
      );
    });

    it('should throw for invalid email format', () => {
      expect(() => AuthValidator.validateLogin({ email: 'invalid', password: 'pass123' })).toThrow(
        ValidationException
      );
    });

    it('should throw for missing password', () => {
      expect(() => AuthValidator.validateLogin({ email: 'test@example.com' })).toThrow(
        ValidationException
      );
    });
  });

  describe('validatePasswordChange', () => {
    it('should pass for valid password change', () => {
      expect(
        AuthValidator.validatePasswordChange({
          currentPassword: 'OldPass123',
          newPassword: 'NewPass456',
        })
      ).toBe(true);
    });

    it('should throw when passwords are the same', () => {
      expect(() =>
        AuthValidator.validatePasswordChange({
          currentPassword: 'SamePass123',
          newPassword: 'SamePass123',
        })
      ).toThrow(ValidationException);
    });
  });

  describe('validateRefreshToken', () => {
    it('should pass for valid refresh token', () => {
      expect(AuthValidator.validateRefreshToken({ refreshToken: 'valid-token' })).toBe(true);
    });

    it('should throw for missing refresh token', () => {
      expect(() => AuthValidator.validateRefreshToken({})).toThrow(ValidationException);
    });
  });

  describe('validatePassword', () => {
    it('should return valid for strong password', () => {
      const result = AuthValidator.validatePassword('ValidPass123');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for weak password', () => {
      const result = AuthValidator.validatePassword('weak');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('isValidEmail', () => {
    it('should return true for valid email', () => {
      expect(AuthValidator.isValidEmail('test@example.com')).toBe(true);
      expect(AuthValidator.isValidEmail('user.name@domain.co')).toBe(true);
    });

    it('should return false for invalid email', () => {
      expect(AuthValidator.isValidEmail('invalid')).toBe(false);
      expect(AuthValidator.isValidEmail('test@')).toBe(false);
      expect(AuthValidator.isValidEmail('@example.com')).toBe(false);
    });
  });
});

describe('UserValidator', () => {
  describe('validateCreateUser', () => {
    it('should pass for valid user input', () => {
      expect(
        UserValidator.validateCreateUser({
          username: 'newuser',
          email: 'new@example.com',
          displayName: 'New User',
        })
      ).toBe(true);
    });

    it('should throw for missing required fields', () => {
      expect(() =>
        UserValidator.validateCreateUser({ username: '', email: '', displayName: '' })
      ).toThrow(ValidationException);
    });

    it('should throw for invalid role', () => {
      expect(() =>
        UserValidator.validateCreateUser({
          username: 'newuser',
          email: 'new@example.com',
          displayName: 'New User',
          role: 'invalid-role',
        })
      ).toThrow(ValidationException);
    });
  });

  describe('validateUpdateUser', () => {
    it('should pass for valid update input', () => {
      expect(UserValidator.validateUpdateUser({ displayName: 'Updated Name' })).toBe(true);
    });

    it('should pass for empty update (no changes)', () => {
      expect(UserValidator.validateUpdateUser({})).toBe(true);
    });

    it('should throw for invalid isActive type', () => {
      expect(() => UserValidator.validateUpdateUser({ isActive: 'yes' })).toThrow(
        ValidationException
      );
    });
  });

  describe('validateUserId', () => {
    it('should pass for valid MongoDB ObjectId', () => {
      expect(UserValidator.validateUserId('507f1f77bcf86cd799439011')).toBe(true);
    });

    it('should throw for invalid ObjectId format', () => {
      expect(() => UserValidator.validateUserId('invalid-id')).toThrow(ValidationException);
    });

    it('should throw for missing id', () => {
      expect(() => UserValidator.validateUserId('')).toThrow(ValidationException);
    });
  });

  describe('validateListQuery', () => {
    it('should return sanitized query with defaults', () => {
      const result = UserValidator.validateListQuery({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.sortBy).toBe('createdAt');
      expect(result.sortOrder).toBe('desc');
    });

    it('should sanitize invalid page number', () => {
      const result = UserValidator.validateListQuery({ page: -5 });
      expect(result.page).toBe(1);
    });

    it('should cap limit at 100', () => {
      const result = UserValidator.validateListQuery({ limit: 500 });
      expect(result.limit).toBe(100);
    });

    it('should add filters when provided', () => {
      const result = UserValidator.validateListQuery({ email: 'test@example.com', role: 'admin' });
      expect(result.filters.email).toBe('test@example.com');
      expect(result.filters.role).toBe('admin');
    });
  });
});

describe('ProfileValidator', () => {
  describe('validateUpdateProfile', () => {
    it('should pass for valid profile update', () => {
      expect(
        ProfileValidator.validateUpdateProfile({
          displayName: 'New Name',
          bio: 'New bio',
        })
      ).toBe(true);
    });

    it('should throw for empty displayName', () => {
      expect(() => ProfileValidator.validateUpdateProfile({ displayName: '' })).toThrow(
        ValidationException
      );
    });

    it('should throw for bio too long', () => {
      const longBio = 'x'.repeat(501);
      expect(() => ProfileValidator.validateUpdateProfile({ bio: longBio })).toThrow(
        ValidationException
      );
    });
  });

  describe('hasValidUpdates', () => {
    it('should return true when valid fields present', () => {
      expect(ProfileValidator.hasValidUpdates({ displayName: 'Name' })).toBe(true);
      expect(ProfileValidator.hasValidUpdates({ bio: 'Bio' })).toBe(true);
    });

    it('should return false when no valid fields present', () => {
      expect(ProfileValidator.hasValidUpdates({})).toBe(false);
      expect(ProfileValidator.hasValidUpdates({ invalidField: 'value' })).toBe(false);
    });
  });

  describe('sanitizeUpdateInput', () => {
    it('should only include allowed fields', () => {
      const input = {
        displayName: 'Name',
        bio: 'Bio',
        invalidField: 'should be removed',
        hashedPassword: 'should be removed',
      };
      const result = ProfileValidator.sanitizeUpdateInput(input);

      expect(result).toEqual({ displayName: 'Name', bio: 'Bio' });
      expect(result).not.toHaveProperty('invalidField');
      expect(result).not.toHaveProperty('hashedPassword');
    });
  });

  describe('isValidUrl', () => {
    it('should return true for valid URLs', () => {
      expect(ProfileValidator.isValidUrl('https://example.com')).toBe(true);
      expect(ProfileValidator.isValidUrl('http://example.com/path')).toBe(true);
    });

    it('should return false for invalid URLs', () => {
      expect(ProfileValidator.isValidUrl('not-a-url')).toBe(false);
      expect(ProfileValidator.isValidUrl('ftp://example.com')).toBe(false);
    });
  });
});
