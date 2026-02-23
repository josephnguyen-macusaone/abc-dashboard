/**
 * Change Password Use Case Unit Tests
 */
import { jest } from '@jest/globals';
import { ChangePasswordUseCase } from '../../../src/application/use-cases/auth/change-password-use-case.js';
import { ValidationException } from '../../../src/domain/exceptions/domain.exception.js';

describe('ChangePasswordUseCase', () => {
  let changePasswordUseCase;
  let mockUserRepository;
  let mockAuthService;
  let mockEmailService;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    displayName: 'Test User',
    hashedPassword: 'old-hashed-password',
    isFirstLogin: false,
  };

  beforeEach(() => {
    // Suppress logger output during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    mockUserRepository = {
      findById: jest.fn(),
      update: jest.fn(),
    };

    mockAuthService = {
      verifyPassword: jest.fn(),
      hashPassword: jest.fn().mockResolvedValue('new-hashed-password'),
    };

    mockEmailService = {
      sendEmail: jest.fn().mockResolvedValue(true),
    };

    changePasswordUseCase = new ChangePasswordUseCase(
      mockUserRepository,
      mockAuthService,
      mockEmailService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('execute', () => {
    it('should change password successfully', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockAuthService.verifyPassword.mockResolvedValue(true);
      mockUserRepository.update.mockResolvedValue({
        ...mockUser,
        hashedPassword: 'new-hashed-password',
      });

      const result = await changePasswordUseCase.execute('user-123', {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
      });

      expect(result.message).toBe('Password changed successfully');
      expect(mockAuthService.verifyPassword).toHaveBeenCalledWith(
        'OldPassword123!',
        'old-hashed-password'
      );
      expect(mockAuthService.hashPassword).toHaveBeenCalledWith('NewPassword123!');
      expect(mockUserRepository.update).toHaveBeenCalledWith('user-123', {
        hashedPassword: 'new-hashed-password',
      });
    });

    it('should throw ValidationException when userId is missing', async () => {
      await expect(
        changePasswordUseCase.execute(null, {
          currentPassword: 'OldPassword123!',
          newPassword: 'NewPassword123!',
        })
      ).rejects.toThrow(ValidationException);
      await expect(
        changePasswordUseCase.execute(null, {
          currentPassword: 'OldPassword123!',
          newPassword: 'NewPassword123!',
        })
      ).rejects.toThrow('User ID is required');
    });

    it('should throw ValidationException when newPassword is missing', async () => {
      await expect(
        changePasswordUseCase.execute('user-123', {
          currentPassword: 'OldPassword123!',
          newPassword: '',
        })
      ).rejects.toThrow(ValidationException);
    });

    it('should throw ValidationException when currentPassword is missing (not first login)', async () => {
      await expect(
        changePasswordUseCase.execute('user-123', {
          currentPassword: '',
          newPassword: 'NewPassword123!',
        })
      ).rejects.toThrow(ValidationException);
      await expect(
        changePasswordUseCase.execute('user-123', {
          currentPassword: '',
          newPassword: 'NewPassword123!',
        })
      ).rejects.toThrow('Current password is required');
    });

    it('should throw ValidationException when new password is too short', async () => {
      await expect(
        changePasswordUseCase.execute('user-123', {
          currentPassword: 'OldPassword123!',
          newPassword: 'short',
        })
      ).rejects.toThrow(ValidationException);
      await expect(
        changePasswordUseCase.execute('user-123', {
          currentPassword: 'OldPassword123!',
          newPassword: 'short',
        })
      ).rejects.toThrow('New password must be at least 8 characters long');
    });

    it('should throw error when user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(
        changePasswordUseCase.execute('nonexistent-user', {
          currentPassword: 'OldPassword123!',
          newPassword: 'NewPassword123!',
        })
      ).rejects.toThrow();
    });

    it('should throw ValidationException when current password is incorrect', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockAuthService.verifyPassword.mockResolvedValue(false);

      await expect(
        changePasswordUseCase.execute('user-123', {
          currentPassword: 'WrongPassword!',
          newPassword: 'NewPassword123!',
        })
      ).rejects.toThrow(ValidationException);
      await expect(
        changePasswordUseCase.execute('user-123', {
          currentPassword: 'WrongPassword!',
          newPassword: 'NewPassword123!',
        })
      ).rejects.toThrow('Current password is incorrect');
    });

    it('should skip current password verification for first login change', async () => {
      const firstLoginUser = { ...mockUser, isFirstLogin: true };
      mockUserRepository.findById.mockResolvedValue(firstLoginUser);
      mockUserRepository.update.mockResolvedValue({ ...firstLoginUser, isFirstLogin: false });

      const result = await changePasswordUseCase.execute('user-123', {
        newPassword: 'NewPassword123!',
        isFirstLoginChange: true,
      });

      expect(result.isFirstLoginChange).toBe(true);
      expect(result.message).toContain('Welcome');
      expect(mockAuthService.verifyPassword).not.toHaveBeenCalled();
      expect(mockUserRepository.update).toHaveBeenCalledWith('user-123', {
        hashedPassword: 'new-hashed-password',
        isFirstLogin: false,
      });
    });

    it('should send notification email after password change', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockAuthService.verifyPassword.mockResolvedValue(true);
      mockUserRepository.update.mockResolvedValue(mockUser);

      await changePasswordUseCase.execute('user-123', {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
      });

      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        mockUser.email,
        'Password Changed Successfully',
        expect.any(String),
        { displayName: mockUser.displayName }
      );
    });

    it('should not fail if email sending fails', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockAuthService.verifyPassword.mockResolvedValue(true);
      mockUserRepository.update.mockResolvedValue(mockUser);
      mockEmailService.sendEmail.mockRejectedValue(new Error('Email failed'));

      const result = await changePasswordUseCase.execute('user-123', {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
      });

      expect(result.message).toBe('Password changed successfully');
    });
  });
});
