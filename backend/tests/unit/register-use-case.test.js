/**
 * Register Use Case Unit Tests
 */
import { jest } from '@jest/globals';
import { RegisterUseCase } from '../../src/application/use-cases/auth/register-use-case.js';
import {
  ValidationException,
  EmailAlreadyExistsException,
} from '../../src/domain/exceptions/domain.exception.js';

describe('RegisterUseCase', () => {
  let registerUseCase;
  let mockUserRepository;
  let mockAuthService;
  let mockTokenService;
  let mockEmailService;

  const validInput = {
    email: 'newuser@example.com',
    password: 'ValidPass123!',
    firstName: 'New',
    lastName: 'User',
  };

  const mockCreatedUser = {
    id: 'user-123',
    username: 'newuser',
    email: 'newuser@example.com',
    displayName: 'New User',
    role: 'staff',
    isActive: false,
    createdAt: new Date('2024-01-01'),
  };

  beforeEach(() => {
    mockUserRepository = {
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      save: jest.fn(),
    };

    mockAuthService = {
      hashPassword: jest.fn().mockResolvedValue('hashed-password'),
    };

    mockTokenService = {
      generateEmailVerificationToken: jest.fn().mockReturnValue('verification-token'),
      generateAccessToken: jest.fn().mockReturnValue('access-token'),
      generateRefreshToken: jest.fn().mockReturnValue('refresh-token'),
    };

    mockEmailService = {
      sendEmailVerification: jest.fn().mockResolvedValue(true),
    };

    registerUseCase = new RegisterUseCase(
      mockUserRepository,
      mockAuthService,
      mockTokenService,
      mockEmailService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should register a new user successfully', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.findByUsername.mockResolvedValue(null);
      mockUserRepository.save.mockResolvedValue(mockCreatedUser);

      const result = await registerUseCase.execute(validInput);

      expect(result.user.id).toBe(mockCreatedUser.id);
      expect(result.user.email).toBe(mockCreatedUser.email);
      expect(result.user.displayName).toBe(mockCreatedUser.displayName);
      expect(result.message).toContain('Registration successful');

      expect(mockAuthService.hashPassword).toHaveBeenCalledWith(validInput.password);
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('should throw ValidationException when email is missing', async () => {
      const input = { ...validInput, email: '' };

      await expect(registerUseCase.execute(input)).rejects.toThrow(ValidationException);
    });

    it('should throw ValidationException when password is missing', async () => {
      const input = { ...validInput, password: '' };

      await expect(registerUseCase.execute(input)).rejects.toThrow(ValidationException);
    });

    it('should throw ValidationException when firstName is missing', async () => {
      const input = { ...validInput, firstName: '' };

      await expect(registerUseCase.execute(input)).rejects.toThrow(ValidationException);
    });

    it('should throw EmailAlreadyExistsException when email already exists', async () => {
      mockUserRepository.findByEmail.mockResolvedValue({ id: 'existing-user' });

      await expect(registerUseCase.execute(validInput)).rejects.toThrow(
        EmailAlreadyExistsException
      );
    });

    it('should throw ValidationException when provided username already exists', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.findByUsername.mockResolvedValue({ id: 'existing-user' });

      const inputWithUsername = { ...validInput, username: 'takenusername' };
      await expect(registerUseCase.execute(inputWithUsername)).rejects.toThrow(ValidationException);
    });

    it('should send email verification after successful registration', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.findByUsername.mockResolvedValue(null);
      mockUserRepository.save.mockResolvedValue(mockCreatedUser);

      await registerUseCase.execute(validInput);

      expect(mockTokenService.generateEmailVerificationToken).toHaveBeenCalledWith(
        mockCreatedUser.id,
        mockCreatedUser.email
      );
    });

    it('should auto-generate username from firstName and lastName', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.findByUsername.mockResolvedValue(null);
      mockUserRepository.save.mockResolvedValue(mockCreatedUser);

      await registerUseCase.execute(validInput);

      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          displayName: 'New User',
        })
      );
    });

    it('should hash the password before storing', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.findByUsername.mockResolvedValue(null);
      mockUserRepository.save.mockResolvedValue(mockCreatedUser);

      await registerUseCase.execute(validInput);

      expect(mockAuthService.hashPassword).toHaveBeenCalledWith(validInput.password);
      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          hashedPassword: 'hashed-password',
        })
      );
    });
  });
});
