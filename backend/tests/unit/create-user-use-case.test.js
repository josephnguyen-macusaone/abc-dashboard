/**
 * Create User Use Case Unit Tests
 */
import { jest } from '@jest/globals';

// Mock logger so email-failure path doesn't throw (logger.error is a no-op)
jest.unstable_mockModule('../../src/infrastructure/config/logger.js', () => ({
  default: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    security: jest.fn(),
  },
}));

const { CreateUserUseCase } =
  await import('../../src/application/use-cases/users/create-user-use-case.js');

describe('CreateUserUseCase', () => {
  let createUserUseCase;
  let mockUserRepository;
  let mockAuthService;
  let mockEmailService;

  const validInput = {
    username: 'newuser',
    email: 'newuser@example.com',
    displayName: 'New User',
    role: 'staff',
  };

  const mockCreatedUser = {
    id: 'user-123',
    username: 'newuser',
    email: 'newuser@example.com',
    displayName: 'New User',
    role: 'staff',
    avatarUrl: null,
    phone: null,
    isFirstLogin: true,
    createdAt: new Date('2024-01-01'),
  };

  beforeEach(() => {
    // Suppress logger output
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    mockUserRepository = {
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      save: jest.fn(),
    };

    mockAuthService = {
      hashPassword: jest.fn().mockResolvedValue('hashed-temp-password'),
    };

    mockEmailService = {
      sendWelcomeWithPassword: jest.fn().mockResolvedValue(true),
    };

    createUserUseCase = new CreateUserUseCase(
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
    it('should create user successfully', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.findByUsername.mockResolvedValue(null);
      mockUserRepository.save.mockResolvedValue(mockCreatedUser);

      const result = await createUserUseCase.execute(validInput, 'admin-user');

      // Check UserResponseDto properties
      expect(result.user.id).toBe(mockCreatedUser.id);
      expect(result.user.username).toBe(mockCreatedUser.username);
      expect(result.user.email).toBe(mockCreatedUser.email);
      expect(result.user.displayName).toBe(mockCreatedUser.displayName);
      expect(result.user.role).toBe(mockCreatedUser.role);
      expect(result.message).toContain('User created successfully');
    });

    // Note: Validation now happens in controller/DTO creation, so use case only receives valid DTOs

    it('should throw error when email already exists', async () => {
      mockUserRepository.findByEmail.mockResolvedValue({ id: 'existing-user' });

      await expect(
        createUserUseCase.execute(validInput, { id: 'admin', role: 'admin' })
      ).rejects.toThrow('An account with this email already exists');
    });

    it('should throw error when username already exists', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.findByUsername.mockResolvedValue({ id: 'existing-user' });

      await expect(createUserUseCase.execute(validInput, 'admin')).rejects.toThrow(
        'Username already taken'
      );
    });

    it('should generate and hash temporary password', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.findByUsername.mockResolvedValue(null);
      mockUserRepository.save.mockResolvedValue(mockCreatedUser);

      await createUserUseCase.execute(validInput, 'admin');

      expect(mockAuthService.hashPassword).toHaveBeenCalledWith(expect.any(String));
      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          hashedPassword: 'hashed-temp-password',
          isFirstLogin: true,
        })
      );
    });

    it('should send welcome email with temporary password', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.findByUsername.mockResolvedValue(null);
      mockUserRepository.save.mockResolvedValue(mockCreatedUser);

      await createUserUseCase.execute(validInput, 'admin');

      expect(mockEmailService.sendWelcomeWithPassword).toHaveBeenCalledWith(
        mockCreatedUser.email,
        expect.objectContaining({
          displayName: mockCreatedUser.displayName,
          username: mockCreatedUser.username,
          password: expect.any(String),
          loginUrl: expect.any(String),
        })
      );
    });

    it('should not fail user creation if email sending fails', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.findByUsername.mockResolvedValue(null);
      mockUserRepository.save.mockResolvedValue(mockCreatedUser);
      mockEmailService.sendWelcomeWithPassword.mockRejectedValue(new Error('Email failed'));

      const creatorUser = { id: 'admin-id', role: 'admin' };
      const result = await createUserUseCase.execute(validInput, creatorUser);

      expect(result.user.id).toBe(mockCreatedUser.id);
      expect(result.message).toContain('User created successfully');
    });

    it('should use default role when not provided', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.findByUsername.mockResolvedValue(null);
      mockUserRepository.save.mockResolvedValue(mockCreatedUser);

      const inputWithoutRole = {
        username: 'newuser',
        email: 'newuser@example.com',
        displayName: 'New User',
      };

      await createUserUseCase.execute(inputWithoutRole, 'admin');

      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'staff',
        })
      );
    });

    it('should include optional fields when provided', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.findByUsername.mockResolvedValue(null);
      mockUserRepository.save.mockResolvedValue({
        ...mockCreatedUser,
        avatarUrl: 'https://example.com/avatar.png',
        phone: '+1234567890',
      });

      const inputWithOptionalFields = {
        ...validInput,
        avatarUrl: 'https://example.com/avatar.png',
        phone: '+1234567890',
      };

      await createUserUseCase.execute(inputWithOptionalFields, 'admin');

      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          avatarUrl: 'https://example.com/avatar.png',
          phone: '+1234567890',
        })
      );
    });
  });
});
