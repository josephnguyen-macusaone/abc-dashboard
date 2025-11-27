/**
 * User Entity Unit Tests
 */
import { describe, it, expect, beforeEach } from '@jest/globals';
import { User } from '../../src/domain/entities/user-entity.js';
import { ROLES } from '../../src/shared/constants/roles.js';

describe('User Entity', () => {
  let validUserData;

  beforeEach(() => {
    validUserData = {
      id: '507f1f77bcf86cd799439011',
      username: 'testuser',
      hashedPassword: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj8iSyGnU8',
      email: 'test@example.com',
      displayName: 'Test User',
      role: ROLES.STAFF,
      avatarUrl: 'https://example.com/avatar.jpg',
      phone: '+1234567890',
      isActive: true,
      isFirstLogin: true,
      langKey: 'en',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: null,
      lastModifiedBy: null
    };
  });

  describe('Constructor and Validation', () => {
    it('should create a valid user', () => {
      const user = new User(validUserData);
      expect(user.id).toBe(validUserData.id);
      expect(user.username).toBe(validUserData.username);
      expect(user.email).toBe(validUserData.email);
      expect(user.displayName).toBe(validUserData.displayName);
      expect(user.role).toBe(validUserData.role);
    });

    it('should throw error for invalid email', () => {
      const invalidData = { ...validUserData, email: 'invalid-email' };
      expect(() => new User(invalidData)).toThrow('Invalid email format');
    });

    it('should throw error for invalid username', () => {
      const invalidData = { ...validUserData, username: 'user@name' };
      expect(() => new User(invalidData)).toThrow('Username can only contain letters, numbers, and underscores');
    });

    it('should throw error for invalid role', () => {
      const invalidData = { ...validUserData, role: 'invalid-role' };
      expect(() => new User(invalidData)).toThrow('Invalid role specified');
    });

    it('should throw error for username too short', () => {
      const invalidData = { ...validUserData, username: 'ab' };
      expect(() => new User(invalidData)).toThrow('Username must be at least 3 characters long');
    });
  });

  describe('getProfile Method', () => {
    it('should return complete profile data', () => {
      const user = new User(validUserData);
      const profile = user.getProfile();

      expect(profile).toEqual({
        id: validUserData.id,
        username: validUserData.username,
        email: validUserData.email,
        displayName: validUserData.displayName,
        role: validUserData.role,
        avatarUrl: validUserData.avatarUrl,
        phone: validUserData.phone,
        isActive: validUserData.isActive,
        isFirstLogin: validUserData.isFirstLogin,
        createdAt: validUserData.createdAt,
        updatedAt: validUserData.updatedAt
      });
    });

    it('should handle null avatarUrl', () => {
      const dataWithoutAvatar = { ...validUserData, avatarUrl: null };
      const user = new User(dataWithoutAvatar);
      const profile = user.getProfile();
      expect(profile.avatarUrl).toBeNull();
    });
  });

  describe('updateProfile Method', () => {
    it('should update allowed fields', () => {
      const user = new User(validUserData);
      const updates = {
        displayName: 'Updated Name',
        avatarUrl: 'https://example.com/new-avatar.jpg',
        phone: '+0987654321'
      };

      const event = user.updateProfile(updates);

      expect(user.displayName).toBe('Updated Name');
      expect(user.avatarUrl).toBe('https://example.com/new-avatar.jpg');
      expect(user.phone).toBe('+0987654321');

      expect(event.type).toBe('UserProfileUpdated');
      expect(event.userId).toBe(validUserData.id);
      expect(event.updates).toEqual(updates);
      expect(event.occurredAt).toBeInstanceOf(Date);
    });

    it('should throw error for invalid updates', () => {
      const user = new User(validUserData);
      const invalidUpdates = {
        username: 'newusername' // Not allowed
      };

      expect(() => user.updateProfile(invalidUpdates)).toThrow();
    });
  });

  describe('updateAvatar Method', () => {
    it('should update avatar URL', () => {
      const user = new User(validUserData);
      const newAvatarUrl = 'https://example.com/updated-avatar.jpg';

      const event = user.updateAvatar(newAvatarUrl);

      expect(user.avatarUrl).toBe(newAvatarUrl);
      expect(event.type).toBe('UserAvatarUpdated');
      expect(event.userId).toBe(validUserData.id);
      expect(event.avatarUrl).toBe(newAvatarUrl);
      expect(event.occurredAt).toBeInstanceOf(Date);
    });
  });

  describe('changePassword Method', () => {
    it('should return password change event', () => {
      const user = new User(validUserData);
      const newHashedPassword = '$2a$12$newHashedPassword123456789012345678901234567890';

      const event = user.changePassword(newHashedPassword);

      expect(user.hashedPassword).toBe(newHashedPassword);
      expect(event.type).toBe('UserPasswordChanged');
      expect(event.userId).toBe(validUserData.id);
      expect(event.occurredAt).toBeInstanceOf(Date);
    });
  });
});
