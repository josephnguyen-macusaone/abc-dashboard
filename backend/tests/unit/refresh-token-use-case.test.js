/**
 * Refresh Token Use Case Unit Tests
 */
import { jest } from '@jest/globals';
import { RefreshTokenUseCase } from '../../src/application/use-cases/auth/refresh-token-use-case.js';
import {
  InvalidCredentialsException,
  ValidationException,
} from '../../src/domain/exceptions/domain.exception.js';

describe('RefreshTokenUseCase', () => {
  let refreshTokenUseCase;
  let mockUserRepository;
  let mockTokenService;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
  };

  beforeEach(() => {
    mockUserRepository = {
      findById: jest.fn(),
    };

    mockTokenService = {
      verifyToken: jest.fn(),
      generateAccessToken: jest.fn().mockReturnValue('new-access-token'),
      generateRefreshToken: jest.fn().mockReturnValue('new-refresh-token'),
    };

    refreshTokenUseCase = new RefreshTokenUseCase(mockUserRepository, mockTokenService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should refresh tokens successfully with valid refresh token', async () => {
      mockTokenService.verifyToken.mockReturnValue({ userId: 'user-123' });
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await refreshTokenUseCase.execute({
        refreshToken: 'valid-refresh-token',
      });

      expect(result).toEqual({
        tokens: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
        },
      });

      expect(mockTokenService.verifyToken).toHaveBeenCalledWith('valid-refresh-token');
      expect(mockUserRepository.findById).toHaveBeenCalledWith('user-123');
    });

    it('should throw ValidationException when refresh token is missing', async () => {
      await expect(refreshTokenUseCase.execute({})).rejects.toThrow(ValidationException);
      await expect(refreshTokenUseCase.execute({})).rejects.toThrow('Refresh token is required');
    });

    it('should throw InvalidCredentialsException when refresh token is invalid', async () => {
      mockTokenService.verifyToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(refreshTokenUseCase.execute({ refreshToken: 'invalid-token' })).rejects.toThrow(
        InvalidCredentialsException
      );
    });

    it('should throw InvalidCredentialsException when user not found', async () => {
      mockTokenService.verifyToken.mockReturnValue({ userId: 'nonexistent-user' });
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(
        refreshTokenUseCase.execute({ refreshToken: 'valid-refresh-token' })
      ).rejects.toThrow(InvalidCredentialsException);
    });

    it('should generate new tokens with correct payload', async () => {
      mockTokenService.verifyToken.mockReturnValue({ userId: 'user-123' });
      mockUserRepository.findById.mockResolvedValue(mockUser);

      await refreshTokenUseCase.execute({ refreshToken: 'valid-refresh-token' });

      expect(mockTokenService.generateAccessToken).toHaveBeenCalledWith({
        userId: mockUser.id,
        email: mockUser.email,
      });

      expect(mockTokenService.generateRefreshToken).toHaveBeenCalledWith({
        userId: mockUser.id,
      });
    });
  });
});
