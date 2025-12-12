import { User } from '@/domain/entities/user-entity';
import { AuthDomainService } from '@/domain/services/auth-domain-service';
import { IUserRepository } from '@/domain/repositories/i-user-repository';
import {
  CreateUserDTO,
  UpdateUserDTO,
  UserListParams,
  UserStats,
  PaginatedUserList
} from '@/application/dto/user-dto';
import {
  UpdateUserResponseDto,
  UsersListResponseDto,
  UserStatsResponseDto,
  UserProfileDto,
  CreateUserResponseDto
} from '@/application/dto/api-dto';
import { userApi } from '@/infrastructure/api/users';
import logger, { generateCorrelationId } from '@/shared/utils/logger';
import { SortBy } from '@/shared/types';

/**
 * Infrastructure Repository: User Management
 * Concrete implementation of IUserRepository for user management operations
 */
export class UserRepository implements IUserRepository {
  private readonly logger = logger.createChild({
    component: 'UserRepository',
  });

  // Simple in-memory cache for frequently accessed data
  private userCache = new Map<string, { data: User; timestamp: number }>();
  private statsCache: { data: UserStats; timestamp: number } | null = null;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

  /**
   * Get cached user data if still valid
   */
  private getCachedUser(userId: string): User | null {
    const cached = this.userCache.get(userId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    // Remove expired cache entry
    if (cached) {
      this.userCache.delete(userId);
    }
    return null;
  }

  /**
   * Cache user data
   */
  private setCachedUser(userId: string, user: User): void {
    this.userCache.set(userId, { data: user, timestamp: Date.now() });

    // Limit cache size to prevent memory leaks
    if (this.userCache.size > 100) {
      const oldestKey = this.userCache.keys().next().value;
      if (oldestKey) {
        this.userCache.delete(oldestKey);
      }
    }
  }

  /**
   * Get cached stats if still valid
   */
  private getCachedStats(): UserStats | null {
    if (this.statsCache && Date.now() - this.statsCache.timestamp < this.CACHE_TTL) {
      return this.statsCache.data;
    }
    this.statsCache = null;
    return null;
  }

  /**
   * Cache stats data
   */
  private setCachedStats(stats: UserStats): void {
    this.statsCache = { data: stats, timestamp: Date.now() };
  }

  /**
   * Clear user cache for a specific user (used after updates)
   */
  private clearUserCache(userId: string): void {
    this.userCache.delete(userId);
  }

  /**
   * Maps a UserProfileDto from the API to a User domain entity
   */
  private mapUserProfileToDomain(userProfile: UserProfileDto): User {
    // Validate that required fields are present
    if (!userProfile.id) {
      throw new Error('User profile missing required id field');
    }
    if (!userProfile.email) {
      throw new Error('User profile missing required email field');
    }
    if (!userProfile.role) {
      throw new Error('User profile missing required role field');
    }

    const normalizedRole = AuthDomainService.getDefaultRole(userProfile.role);

    return User.fromObject({
      id: String(userProfile.id), // Ensure id is always a string
      name: userProfile.displayName || userProfile.username || '',
      email: userProfile.email,
      role: normalizedRole,
      isActive: userProfile.isActive ?? true,
      username: userProfile.username,
      avatar: userProfile.avatarUrl,
      displayName: userProfile.displayName,
      phone: userProfile.phone,
      lastLogin: undefined, // UserProfile doesn't include lastLogin
      updatedAt: userProfile.updatedAt ? new Date(userProfile.updatedAt) : undefined,
      createdAt: userProfile.createdAt ? new Date(userProfile.createdAt) : undefined,
    });
  }

  /**
   * Maps multiple UserProfileDtos to User domain entities
   */
  private mapUserProfilesToDomain(userProfiles: UserProfileDto[]): User[] {
    return userProfiles.map(profile => this.mapUserProfileToDomain(profile));
  }

  /**
   * Validates API response structure
   */
  private validateApiResponse<T>(response: unknown, operation: string): T {
    if (!response) {
      throw new Error(`${operation}: API response is empty`);
    }

    if (typeof response === 'object' && response !== null) {
      const responseObj = response as { success?: boolean; message?: string };
      if (responseObj.success === false) {
        throw new Error(`${operation}: API request failed - ${responseObj.message || 'Unknown error'}`);
      }
    }

    return response as T;
  }

  /**
   * Validates input parameters before making API calls
   */
  private validateInputParams(params: Record<string, unknown>, operation: string): void {
    // Validate user ID format (should be string, not empty)
    if (params.userId !== undefined && (typeof params.userId !== 'string' || params.userId.trim() === '')) {
      throw new Error(`${operation}: Invalid user ID format`);
    }

    // Validate pagination parameters
    if (params.page !== undefined && (typeof params.page !== 'number' || params.page < 1)) {
      throw new Error(`${operation}: Invalid page number`);
    }

    if (params.limit !== undefined && (typeof params.limit !== 'number' || params.limit < 1 || params.limit > 100)) {
      throw new Error(`${operation}: Invalid limit (must be 1-100)`);
    }

    // Validate role parameter
    if (params.role && typeof params.role === 'string') {
      const validRoles = ['admin', 'manager', 'staff'];
      if (!validRoles.includes(params.role)) {
        throw new Error(`${operation}: Invalid role`);
      }
    }
  }

  /**
   * Standardized logging utilities for consistent operation tracking
   */
  private createOperationLogger(operation: string) {
    return {
      start: (correlationId: string, metadata?: Record<string, unknown>) =>
        this.logger.http(`Starting ${operation}`, {
          correlationId,
          operation: `${operation}_start`,
          ...metadata,
        }),

      success: (correlationId: string, duration: number, metadata?: Record<string, unknown>) =>
        this.logger.http(`${operation} completed`, {
          correlationId,
          duration,
          operation: `${operation}_success`,
          ...metadata,
        }),

      notFound: (correlationId: string, metadata?: Record<string, unknown>) =>
        this.logger.http(`${operation} - Resource not found`, {
          correlationId,
          operation: `${operation}_not_found`,
          ...metadata,
        }),

      error: (correlationId: string, error: string, metadata?: Record<string, unknown>) =>
        this.logger.http(`${operation} - API call failed`, {
          correlationId,
          operation: `${operation}_error`,
          error,
          ...metadata,
        }),
    };
  }

  /**
   * Handles API errors consistently across all methods
   */
  private handleApiError(error: unknown, operation: string, correlationId: string): Error {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const logger = this.createOperationLogger(operation);

    // Handle "not found" errors (should return null, not throw)
    if (errorMessage.includes('404') || errorMessage.includes('not found') || errorMessage.includes('missing data')) {
      logger.notFound(correlationId);
      // Return a special error that indicates "not found"
      const notFoundError = new Error('NOT_FOUND');
      notFoundError.name = 'NotFoundError';
      return notFoundError;
    }

    // Handle other errors
    logger.error(correlationId, errorMessage);
    return error instanceof Error ? error : new Error(errorMessage);
  }


  // User Management methods
  async getUserById(id: string): Promise<User | null> {
    // Validate input parameters
    this.validateInputParams({ userId: id }, 'getUserById');

    const correlationId = generateCorrelationId();
    const logger = this.createOperationLogger('get_user_by_id');

    try {
      // Skip cache for fresh data - cache can cause stale role data
      // const cachedUser = this.getCachedUser(id);
      // if (cachedUser) {
      //   logger.start(correlationId, { userId: id, cached: true });
      //   logger.success(correlationId, 0, { userId: cachedUser.id, source: 'cache' });
      //   return cachedUser;
      // }

      logger.start(correlationId, { userId: id });

      const startTime = Date.now();
      const response = await userApi.getUser(id);

      // Debug: Log raw API response
      console.log('getUserById API response for ID:', id, response);

      const userData = this.validateApiResponse<UserProfileDto>(response, 'getUser');

      // Debug: Log validated user data
      console.log('getUserById validated userData:', {
        id: userData.id,
        email: userData.email,
        role: userData.role,
      });

      const duration = Date.now() - startTime;

      const user = this.mapUserProfileToDomain(userData);

      // Debug: Log mapped user
      console.log('getUserById mapped user:', {
        id: user.id,
        email: user.email,
        role: user.role,
      });

      // Cache the result
      this.setCachedUser(id, user);

      logger.success(correlationId, duration, { userId: user.id, userRole: user.role });

      return user;
    } catch (error) {
      const handledError = this.handleApiError(error, 'get_user_by_id', correlationId);
      if (handledError.name === 'NotFoundError') {
        return null;
      }
      throw handledError;
    }
  }


  async updateUser(id: string, updates: UpdateUserDTO): Promise<User> {
    // Validate input parameters
    this.validateInputParams({ userId: id, ...updates }, 'updateUser');

    const correlationId = generateCorrelationId();
    const logger = this.createOperationLogger('update_user');

    try {
      logger.start(correlationId, { userId: id, updates: Object.keys(updates) });

      const startTime = Date.now();
      const apiResponse = await userApi.updateUser(id, updates);
      const response = this.validateApiResponse<UpdateUserResponseDto>(apiResponse, 'updateUser');
      const duration = Date.now() - startTime;

      const user = this.mapUserProfileToDomain(response.user);

      // Clear user cache after update
      this.clearUserCache(id);
      // Clear stats cache as user counts might have changed
      this.statsCache = null;

      logger.success(correlationId, duration, { userId: user.id, updates: Object.keys(updates) });

      return user;
    } catch (error) {
      throw this.handleApiError(error, 'update_user', correlationId);
    }
  }

  async deleteUser(id: string): Promise<void> {
    // Validate input parameters
    this.validateInputParams({ userId: id }, 'deleteUser');

    const correlationId = generateCorrelationId();
    const logger = this.createOperationLogger('delete_user');

    try {
      logger.start(correlationId, { userId: id });

      const startTime = Date.now();
      const response = await userApi.deleteUser(id);
      this.validateApiResponse(response, 'deleteUser');
      const duration = Date.now() - startTime;

      // Clear caches after deletion
      this.clearUserCache(id);
      this.statsCache = null;

      logger.success(correlationId, duration, { userId: id });
    } catch (error) {
      throw this.handleApiError(error, 'delete_user', correlationId);
    }
  }

  async getUsersByRole(role: string): Promise<User[]> {
    // Validate input parameters
    this.validateInputParams({ role }, 'getUsersByRole');

    const correlationId = generateCorrelationId();
    const logger = this.createOperationLogger('get_users_by_role');

    try {
      logger.start(correlationId, { role });

      const startTime = Date.now();
      const apiResponse = await userApi.getUsers({}); // API doesn't support role filtering directly
      const response = this.validateApiResponse<UsersListResponseDto>(apiResponse, 'getUsersByRole');
      const duration = Date.now() - startTime;

      const users = this.mapUserProfilesToDomain(response.users);
      logger.success(correlationId, duration, { role, count: users.length });

      return users;
    } catch (error) {
      throw this.handleApiError(error, 'get_users_by_role', correlationId);
    }
  }

  async searchUsers(query: string): Promise<User[]> {
    // Validate input parameters
    this.validateInputParams({ email: query }, 'searchUsers');

    const correlationId = generateCorrelationId();
    const logger = this.createOperationLogger('search_users');

    try {
      logger.start(correlationId, { query });

      const startTime = Date.now();
      // Use getUsers with email filter as basic search implementation
      const apiResponse = await userApi.getUsers({ email: query });
      const response = this.validateApiResponse<UsersListResponseDto>(apiResponse, 'searchUsers');
      const duration = Date.now() - startTime;

      const users = this.mapUserProfilesToDomain(response.users);
      logger.success(correlationId, duration, { query, resultCount: users.length });

      return users;
    } catch (error) {
      throw this.handleApiError(error, 'search_users', correlationId);
    }
  }

  async getCurrentUser(): Promise<User | null> {
    const correlationId = generateCorrelationId();
    const logger = this.createOperationLogger('get_current_user');

    try {
      logger.start(correlationId);

      // Use auth repository to get current user profile from /auth/profile endpoint
      const authRepository = new (await import('../repositories/auth-repository')).AuthRepository();
      const user = await authRepository.getProfile();

      // Cache the user data
      this.setCachedUser(user.id, user);

      logger.success(correlationId, 0, { userId: user.id });
      return user;

    } catch (error) {
      throw this.handleApiError(error, 'get_current_user', correlationId);
    }
  }

  async createUser(userData: CreateUserDTO): Promise<User> {
    // Validate input parameters
    this.validateInputParams({ ...userData }, 'createUser');

    const correlationId = generateCorrelationId();
    const logger = this.createOperationLogger('create_user');

    try {
      logger.start(correlationId, {
        email: userData.email,
        username: userData.username,
        role: userData.role
      });

      const startTime = Date.now();
      const apiResponse = await userApi.createUser({
        username: userData.username,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        avatarUrl: userData.avatarUrl,
        phone: userData.phone,
        managerId: userData.managerId,
      });
      const response = this.validateApiResponse<CreateUserResponseDto>(apiResponse, 'createUser');
      const duration = Date.now() - startTime;

      const user = this.mapUserProfileToDomain(response.user);

      // Cache the new user and clear stats cache
      this.setCachedUser(user.id, user);
      this.statsCache = null;

      logger.success(correlationId, duration, { userId: user.id });

      return user;
    } catch (error) {
      throw this.handleApiError(error, 'create_user', correlationId);
    }
  }

  async getUsers(params: UserListParams): Promise<PaginatedUserList> {
    // Validate input parameters
    this.validateInputParams({ ...params }, 'getUsers');

    const correlationId = generateCorrelationId();
    const logger = this.createOperationLogger('get_users');

    try {
      logger.start(correlationId, {
        page: params.page,
        limit: params.limit,
        filters: Object.keys(params)
      });

      const startTime = Date.now();
      const apiResponse = await userApi.getUsers({
        page: params.page,
        limit: params.limit,
        search: params.search,
        email: params.email,
        username: params.username,
        displayName: params.displayName,
        role: params.role,
        isActive: params.isActive !== undefined ? String(params.isActive) : undefined,
        hasAvatar: params.hasAvatar,
        sortBy: params.sortBy === 'role' ? SortBy.CREATED_AT : (params.sortBy as any), // Map 'role' to 'createdAt' as fallback
        sortOrder: params.sortOrder,
      });
      const response = this.validateApiResponse<UsersListResponseDto>(apiResponse, 'getUsers');
      const duration = Date.now() - startTime;

      const users = this.mapUserProfilesToDomain(response.users);

      const result: PaginatedUserList = {
        users,
        pagination: {
          page: response.pagination.page,
          limit: response.pagination.limit,
          total: response.pagination.total,
          totalPages: response.pagination.totalPages,
          hasNext: response.pagination.page < response.pagination.totalPages,
          hasPrev: response.pagination.page > 1,
        },
      };

      logger.success(correlationId, duration, {
        count: users.length,
        total: response.pagination.total,
        page: response.pagination.page
      });

      return result;
    } catch (error) {
      throw this.handleApiError(error, 'get_users', correlationId);
    }
  }

  async getUserStats(): Promise<UserStats> {
    const correlationId = generateCorrelationId();
    const logger = this.createOperationLogger('get_user_stats');

    try {
      // Check cache first
      const cachedStats = this.getCachedStats();
      if (cachedStats) {
        logger.start(correlationId, { cached: true });
        logger.success(correlationId, 0, {
          totalUsers: cachedStats.totalUsers,
          admin: cachedStats.admin,
          manager: cachedStats.manager,
          staff: cachedStats.staff,
          source: 'cache'
        });
        return cachedStats;
      }

      logger.start(correlationId);

      const startTime = Date.now();
      const apiResponse = await userApi.getUserStats();
      const response = this.validateApiResponse<UserStatsResponseDto>(apiResponse, 'getUserStats');
      const duration = Date.now() - startTime;

      const stats: UserStats = {
        totalUsers: response.totalUsers,
        admin: response.admin,
        manager: response.manager,
        staff: response.staff,
      };

      // Cache the result
      this.setCachedStats(stats);

      logger.success(correlationId, duration, {
        totalUsers: stats.totalUsers,
        admin: stats.admin,
        manager: stats.manager,
        staff: stats.staff
      });

      return stats;
    } catch (error) {
      throw this.handleApiError(error, 'get_user_stats', correlationId);
    }
  }
}
