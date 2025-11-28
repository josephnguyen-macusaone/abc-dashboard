/**
 * UserProfile Entity Unit Tests
 */
import { describe, it, expect, beforeEach } from '@jest/globals';
import { UserProfile } from '../../src/domain/entities/user-profile-entity.js';

describe('UserProfile Entity', () => {
  let validProfileData;

  beforeEach(() => {
    validProfileData = {
      id: '507f1f77bcf86cd799439012',
      userId: '507f1f77bcf86cd799439011',
      bio: 'Software developer with 5 years experience',
      emailVerified: true,
      lastLoginAt: new Date('2024-01-15T10:30:00Z'),
      lastActivityAt: new Date('2024-01-15T11:45:00Z'),
      emailVerifiedAt: new Date('2024-01-10T09:00:00Z'),
    };
  });

  describe('Constructor and Validation', () => {
    it('should create a valid user profile', () => {
      const profile = new UserProfile(validProfileData);
      expect(profile.id).toBe(validProfileData.id);
      expect(profile.userId).toBe(validProfileData.userId);
      expect(profile.bio).toBe(validProfileData.bio);
      expect(profile.emailVerified).toBe(validProfileData.emailVerified);
      expect(profile.lastLoginAt).toBe(validProfileData.lastLoginAt);
      expect(profile.lastActivityAt).toBe(validProfileData.lastActivityAt);
      expect(profile.emailVerifiedAt).toBe(validProfileData.emailVerifiedAt);
    });

    it('should throw error for missing userId', () => {
      const invalidData = { ...validProfileData };
      delete invalidData.userId;
      expect(() => new UserProfile(invalidData)).toThrow('UserId is required');
    });

    it('should throw error for bio too long', () => {
      const invalidData = {
        ...validProfileData,
        bio: 'a'.repeat(501), // 501 characters
      };
      expect(() => new UserProfile(invalidData)).toThrow('Bio cannot exceed 500 characters');
    });

    it('should throw error if emailVerified is true but emailVerifiedAt is missing', () => {
      const invalidData = {
        ...validProfileData,
        emailVerified: true,
        emailVerifiedAt: null,
      };
      expect(() => new UserProfile(invalidData)).toThrow(
        'Email verification timestamp required when email is verified'
      );
    });

    it('should throw error if emailVerifiedAt is set but emailVerified is false', () => {
      const invalidData = {
        ...validProfileData,
        emailVerified: false,
        emailVerifiedAt: new Date(),
      };
      expect(() => new UserProfile(invalidData)).toThrow(
        'Email cannot be marked verified without verification timestamp'
      );
    });

    it('should allow null bio', () => {
      const dataWithNullBio = { ...validProfileData, bio: null };
      const profile = new UserProfile(dataWithNullBio);
      expect(profile.bio).toBeNull();
    });

    it('should allow empty bio', () => {
      const dataWithEmptyBio = { ...validProfileData, bio: '' };
      const profile = new UserProfile(dataWithEmptyBio);
      expect(profile.bio).toBe('');
    });

    it('should default emailVerified to false', () => {
      const dataWithoutEmailVerified = {
        ...validProfileData,
        emailVerified: undefined,
        emailVerifiedAt: undefined,
      };
      const profile = new UserProfile(dataWithoutEmailVerified);
      expect(profile.emailVerified).toBe(false);
    });
  });

  describe('getProfile Method', () => {
    it('should return complete profile data', () => {
      const profile = new UserProfile(validProfileData);
      const profileData = profile.getProfile();

      expect(profileData).toEqual({
        id: validProfileData.id,
        userId: validProfileData.userId,
        bio: validProfileData.bio,
        emailVerified: validProfileData.emailVerified,
        lastLoginAt: validProfileData.lastLoginAt,
        lastActivityAt: validProfileData.lastActivityAt,
        emailVerifiedAt: validProfileData.emailVerifiedAt,
        createdAt: undefined,
        updatedAt: undefined,
      });
    });

    it('should return null for missing bio', () => {
      const dataWithoutBio = { ...validProfileData, bio: undefined };
      const profile = new UserProfile(dataWithoutBio);
      const profileData = profile.getProfile();
      expect(profileData.bio).toBeNull();
    });
  });

  describe('updateProfile Method', () => {
    it('should update bio successfully', () => {
      const profile = new UserProfile(validProfileData);
      const newBio = 'Updated bio with new information';

      const event = profile.updateProfile({ bio: newBio });

      expect(profile.bio).toBe(newBio);
      expect(event.type).toBe('UserProfileUpdated');
      expect(event.userId).toBe(validProfileData.userId);
      expect(event.profileId).toBe(validProfileData.id);
      expect(event.updates).toEqual({ bio: newBio });
      expect(event.occurredAt).toBeInstanceOf(Date);
    });

    it('should allow updating bio to null', () => {
      const profile = new UserProfile(validProfileData);
      profile.updateProfile({ bio: null });
      expect(profile.bio).toBeNull();
    });

    it('should validate bio length on update', () => {
      const profile = new UserProfile(validProfileData);
      const tooLongBio = 'a'.repeat(501);
      expect(() => profile.updateProfile({ bio: tooLongBio })).toThrow(
        'Bio cannot exceed 500 characters'
      );
    });
  });

  describe('recordLogin Method', () => {
    it('should record login and update last activity', () => {
      const profile = new UserProfile(validProfileData);
      const beforeLogin = new Date();

      const event = profile.recordLogin();

      expect(profile.lastLoginAt).toBeInstanceOf(Date);
      expect(profile.lastLoginAt.getTime()).toBeGreaterThanOrEqual(beforeLogin.getTime());
      expect(profile.lastActivityAt).toBeInstanceOf(Date);
      expect(profile.lastActivityAt.getTime()).toBeGreaterThanOrEqual(beforeLogin.getTime());

      expect(event.type).toBe('UserLoginRecorded');
      expect(event.userId).toBe(validProfileData.userId);
      expect(event.profileId).toBe(validProfileData.id);
      expect(event.loginAt).toBe(profile.lastLoginAt);
      expect(event.occurredAt).toBeInstanceOf(Date);
    });
  });

  describe('recordActivity Method', () => {
    it('should update last activity timestamp', () => {
      const profile = new UserProfile(validProfileData);
      const beforeActivity = new Date();

      const event = profile.recordActivity();

      expect(profile.lastActivityAt).toBeInstanceOf(Date);
      expect(profile.lastActivityAt.getTime()).toBeGreaterThanOrEqual(beforeActivity.getTime());

      expect(event.type).toBe('UserActivityRecorded');
      expect(event.userId).toBe(validProfileData.userId);
      expect(event.profileId).toBe(validProfileData.id);
      expect(event.activityAt).toBe(profile.lastActivityAt);
      expect(event.occurredAt).toBeInstanceOf(Date);
    });
  });

  describe('verifyEmail Method', () => {
    it('should verify email successfully', () => {
      const unverifiedProfile = {
        ...validProfileData,
        emailVerified: false,
        emailVerifiedAt: null,
      };
      const profile = new UserProfile(unverifiedProfile);

      const event = profile.verifyEmail();

      expect(profile.emailVerified).toBe(true);
      expect(profile.emailVerifiedAt).toBeInstanceOf(Date);

      expect(event.type).toBe('UserEmailVerified');
      expect(event.userId).toBe(validProfileData.userId);
      expect(event.profileId).toBe(validProfileData.id);
      expect(event.verifiedAt).toBe(profile.emailVerifiedAt);
      expect(event.occurredAt).toBeInstanceOf(Date);
    });

    it('should throw error if email already verified', () => {
      const profile = new UserProfile(validProfileData);
      expect(() => profile.verifyEmail()).toThrow('Email already verified');
    });
  });
});
