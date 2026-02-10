/**
 * Get Users Use Case Unit Tests
 */
import { jest } from '@jest/globals';
import { GetUsersUseCase } from '../../src/application/use-cases/users/get-users-use-case.js';

describe('GetUsersUseCase', () => {
  let getUsersUseCase;
  let mockUserRepository;

  const mockUsers = [
    {
      id: 'user-1',
      username: 'user1',
      email: 'user1@example.com',
      displayName: 'User One',
      role: 'staff',
      avatarUrl: null,
      phone: null,
      isActive: true,
      isFirstLogin: false,
      langKey: 'en',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      createdBy: 'admin',
      lastModifiedBy: 'admin',
    },
    {
      id: 'user-2',
      username: 'user2',
      email: 'user2@example.com',
      displayName: 'User Two',
      role: 'admin',
      avatarUrl: 'https://example.com/avatar.png',
      phone: '+1234567890',
      isActive: true,
      isFirstLogin: false,
      langKey: 'en',
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02'),
      createdBy: 'admin',
      lastModifiedBy: 'admin',
    },
  ];

  beforeEach(() => {
    mockUserRepository = {
      findUsers: jest.fn(),
    };

    getUsersUseCase = new GetUsersUseCase(mockUserRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should return users with pagination', async () => {
      mockUserRepository.findUsers.mockResolvedValue({
        users: mockUsers,
        page: 1,
        limit: 10,
        totalPages: 1,
        stats: { total: 2 },
      });

      const result = await getUsersUseCase.execute({ page: 1, limit: 10 });

      expect(result.users).toHaveLength(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.totalPages).toBe(1);
      expect(result.stats?.total).toBe(2);
      expect(mockUserRepository.findUsers).toHaveBeenCalledWith({ page: 1, limit: 10 });
    });

    it('should return mapped user data without sensitive fields', async () => {
      mockUserRepository.findUsers.mockResolvedValue({
        users: mockUsers,
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      });

      const result = await getUsersUseCase.execute();

      // Check UserResponseDto properties
      expect(result.users[0].id).toBe('user-1');
      expect(result.users[0].username).toBe('user1');
      expect(result.users[0].email).toBe('user1@example.com');
      expect(result.users[0].displayName).toBe('User One');
      expect(result.users[0].role).toBe('staff');
      expect(result.users[0].isActive).toBe(true);

      // Ensure no hashedPassword is returned
      expect(result.users[0]).not.toHaveProperty('hashedPassword');
    });

    it('should use default options when none provided', async () => {
      mockUserRepository.findUsers.mockResolvedValue({
        users: [],
        page: 1,
        total: 0,
        totalPages: 0,
      });

      const result = await getUsersUseCase.execute();

      expect(result.pagination.limit).toBe(10);
      expect(mockUserRepository.findUsers).toHaveBeenCalledWith({});
    });

    it('should pass filter options to repository', async () => {
      mockUserRepository.findUsers.mockResolvedValue({
        users: [mockUsers[1]],
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      });

      const options = {
        page: 1,
        limit: 10,
        filters: { role: 'admin' },
      };

      const result = await getUsersUseCase.execute(options);

      expect(result.users).toHaveLength(1);
      expect(result.users[0].role).toBe('admin');
      expect(mockUserRepository.findUsers).toHaveBeenCalledWith(options);
    });

    it('should throw error when repository fails', async () => {
      mockUserRepository.findUsers.mockRejectedValue(new Error('Database error'));

      await expect(getUsersUseCase.execute()).rejects.toThrow(
        'Failed to get users: Database error'
      );
    });

    it('should handle empty result set', async () => {
      mockUserRepository.findUsers.mockResolvedValue({
        users: [],
        page: 1,
        limit: 10,
        totalPages: 0,
        stats: { total: 0 },
      });

      const result = await getUsersUseCase.execute();

      expect(result.users).toHaveLength(0);
      expect(result.pagination.totalPages).toBe(0);
      expect(result.stats?.total).toBe(0);
    });
  });
});
