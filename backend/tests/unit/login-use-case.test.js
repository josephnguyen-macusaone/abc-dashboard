/**
 * Login Use Case Unit Tests
 */
import { jest } from '@jest/globals';
import { LoginUseCase } from '../../src/application/use-cases/auth/login-use-case.js';
import {
  InvalidCredentialsException,
  ValidationException,
} from '../../src/domain/exceptions/domain.exception.js';

describe('LoginUseCase', () => {
  let loginUseCase;
  let mockUserRepository;
  let mockAuthService;
  let mockTokenService;

  const mockUser = {
    id: 'user-123',
    username: 'testuser',
    email: 'test@example.com',
    displayName: 'Test User',
    role: 'staff',
    hashedPassword: 'hashed-password-123',
    avatarUrl: null,
    phone: null,
    isActive: true,
    isFirstLogin: false,
    createdAt: new Date('2024-01-01'),
  };

  beforeEach(() => {
    mockUserRepository = {
      findByEmail: jest.fn(),
    };

    mockAuthService = {
      verifyPassword: jest.fn(),
    };

    mockTokenService = {
      generateAccessToken: jest.fn().mockReturnValue('access-token-123'),
      generateRefreshToken: jest.fn().mockReturnValue('refresh-token-123'),
    };

    loginUseCase = new LoginUseCase(mockUserRepository, mockAuthService, mockTokenService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should login successfully with valid credentials', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockAuthService.verifyPassword.mockResolvedValue(true);

      const result = await loginUseCase.execute({
        email: 'test@example.com',
        password: 'ValidPassword123',
      });

      // Check user DTO properties
      expect(result.user.id).toBe(mockUser.id);
      expect(result.user.username).toBe(mockUser.username);
      expect(result.user.email).toBe(mockUser.email);
      expect(result.user.displayName).toBe(mockUser.displayName);
      expect(result.user.role).toBe(mockUser.role);
      expect(result.user.isActive).toBe(mockUser.isActive);

      // Check tokens DTO
      expect(result.tokens.accessToken).toBe('access-token-123');
      expect(result.tokens.refreshToken).toBe('refresh-token-123');

      // Check other properties
      expect(result.requiresPasswordChange).toBe(false);

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockAuthService.verifyPassword).toHaveBeenCalledWith(
        'ValidPassword123',
        'hashed-password-123'
      );
    });

    it('should throw ValidationException when email is missing', async () => {
      await expect(loginUseCase.execute({ password: 'password123' })).rejects.toThrow(
        ValidationException
      );
      await expect(loginUseCase.execute({ password: 'password123' })).rejects.toThrow(
        'Email and password are required'
      );
    });

    it('should throw ValidationException when password is missing', async () => {
      await expect(loginUseCase.execute({ email: 'test@example.com' })).rejects.toThrow(
        ValidationException
      );
    });

    it('should throw InvalidCredentialsException when user not found', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(
        loginUseCase.execute({ email: 'nonexistent@example.com', password: 'password123' })
      ).rejects.toThrow(InvalidCredentialsException);
    });

    it('should throw ValidationException when account is not active', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      mockUserRepository.findByEmail.mockResolvedValue(inactiveUser);

      await expect(
        loginUseCase.execute({ email: 'test@example.com', password: 'password123' })
      ).rejects.toThrow(ValidationException);
      await expect(
        loginUseCase.execute({ email: 'test@example.com', password: 'password123' })
      ).rejects.toThrow('Your account has been deactivated. Please contact your administrator.');
    });

    it('should throw InvalidCredentialsException when password is invalid', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockAuthService.verifyPassword.mockResolvedValue(false);

      await expect(
        loginUseCase.execute({ email: 'test@example.com', password: 'wrongpassword' })
      ).rejects.toThrow(InvalidCredentialsException);
    });

    it('should set requiresPasswordChange to true for first login', async () => {
      const firstLoginUser = { ...mockUser, isFirstLogin: true };
      mockUserRepository.findByEmail.mockResolvedValue(firstLoginUser);
      mockAuthService.verifyPassword.mockResolvedValue(true);

      const result = await loginUseCase.execute({
        email: 'test@example.com',
        password: 'ValidPassword123',
      });

      expect(result.requiresPasswordChange).toBe(true);
      expect(mockTokenService.generateAccessToken).toHaveBeenCalledWith(
        expect.objectContaining({ requiresPasswordChange: true })
      );
    });

    it('should generate tokens with correct payload', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockAuthService.verifyPassword.mockResolvedValue(true);

      await loginUseCase.execute({
        email: 'test@example.com',
        password: 'ValidPassword123',
      });

      expect(mockTokenService.generateAccessToken).toHaveBeenCalledWith({
        userId: mockUser.id,
        email: mockUser.email,
        requiresPasswordChange: false,
      });

      expect(mockTokenService.generateRefreshToken).toHaveBeenCalledWith({
        userId: mockUser.id,
      });
    });
  });
});
