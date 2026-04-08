/**
 * Create User Use Case Unit Tests
 */
import { jest } from '@jest/globals';

jest.unstable_mockModule('../../../src/infrastructure/config/logger.js', () => ({
  default: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    security: jest.fn(),
  },
}));

const { CreateUserUseCase } =
  await import('../../../src/application/use-cases/users/create-user-use-case.js');

describe('CreateUserUseCase', () => {
  let createUserUseCase;
  let mockUserRepository;
  let mockAuthService;

  const creatorUser = { id: 'admin-id', role: 'admin' };

  const validInput = {
    username: 'newuser',
    email: 'newuser@example.com',
    displayName: 'New User',
    role: 'agent',
    password: 'SecurePass1',
  };

  const mockCreatedUser = {
    id: 'user-123',
    username: 'newuser',
    email: 'newuser@example.com',
    displayName: 'New User',
    role: 'agent',
    avatarUrl: null,
    phone: null,
    isFirstLogin: false,
    createdAt: new Date('2024-01-01'),
  };

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    mockUserRepository = {
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      save: jest.fn(),
    };

    mockAuthService = {
      hashPassword: jest.fn().mockResolvedValue('hashed-password'),
    };

    createUserUseCase = new CreateUserUseCase(mockUserRepository, mockAuthService);
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

      const result = await createUserUseCase.execute(validInput, creatorUser);

      expect(result.user.id).toBe(mockCreatedUser.id);
      expect(result.user.username).toBe(mockCreatedUser.username);
      expect(result.message).toContain('User created successfully');
    });

    it('should throw error when email already exists', async () => {
      mockUserRepository.findByEmail.mockResolvedValue({ id: 'existing-user' });

      await expect(createUserUseCase.execute(validInput, creatorUser)).rejects.toThrow(
        'An account with this email already exists'
      );
    });

    it('should throw error when username already exists', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.findByUsername.mockResolvedValue({ id: 'existing-user' });

      await expect(createUserUseCase.execute(validInput, creatorUser)).rejects.toThrow(
        'Username already taken'
      );
    });

    it('should hash provided password and provision an active, verified account', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.findByUsername.mockResolvedValue(null);
      mockUserRepository.save.mockResolvedValue(mockCreatedUser);

      await createUserUseCase.execute(validInput, creatorUser);

      expect(mockAuthService.hashPassword).toHaveBeenCalledWith('SecurePass1');
      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          hashedPassword: 'hashed-password',
          isActive: true,
          emailVerified: true,
          isFirstLogin: false,
          requiresPasswordChange: false,
        })
      );
    });

    it('should not send welcome email', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.findByUsername.mockResolvedValue(null);
      mockUserRepository.save.mockResolvedValue(mockCreatedUser);

      const result = await createUserUseCase.execute(validInput, creatorUser);

      expect(result.emailSent).toBe(false);
    });

    it('should use default role when not provided', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.findByUsername.mockResolvedValue(null);
      mockUserRepository.save.mockResolvedValue(mockCreatedUser);

      const inputWithoutRole = {
        username: 'newuser',
        email: 'newuser@example.com',
        displayName: 'New User',
        password: 'SecurePass1',
      };

      await createUserUseCase.execute(inputWithoutRole, creatorUser);

      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'agent',
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

      await createUserUseCase.execute(inputWithOptionalFields, creatorUser);

      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          avatarUrl: 'https://example.com/avatar.png',
          phone: '+1234567890',
        })
      );
    });
  });
});
