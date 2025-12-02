import { httpClient } from '@/infrastructure/api/client';
import {
  ApiResponse,
  UserProfileDto,
  CreateUserRequestDto,
  CreateUserResponseDto,
  UpdateUserRequestDto,
  UpdateUserResponseDto,
  UsersListResponseDto,
  GetUsersQueryParamsDto,
  UserStatsResponseDto
} from '@/application/dto/api-dto';

/**
 * User Management API service
 */
export class UserApiService {
  /**
   * Get users with pagination and filtering
   */
  static async getUsers(params: GetUsersQueryParamsDto = {}): Promise<UsersListResponseDto> {
    try {
      const queryParams = new URLSearchParams();

      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });

      const url = `/users${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await httpClient.get<{
        success: boolean;
        data: UserProfileDto[];
        meta: { pagination: UsersListResponseDto['pagination'] };
      }>(url);

      if (!response.success || !response.data) {
        throw new Error('Get users response missing data');
      }

      return {
        users: response.data,
        pagination: response.meta?.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get user statistics
   */
  static async getUserStats(): Promise<UserStatsResponseDto> {
    try {
      const response = await httpClient.get<ApiResponse<UserStatsResponseDto>>('/users/stats');

      if (!response.data) {
        throw new Error('Get user stats response missing data');
      }

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get single user by ID
   */
  static async getUser(id: string): Promise<UserProfileDto> {
    try {
      const response = await httpClient.get<ApiResponse<{ user: UserProfileDto }>>(`/users/${id}`);

      if (!response.data?.user) {
        throw new Error('Get user response missing data');
      }

      return response.data.user;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create a new user
   */
  static async createUser(userData: CreateUserRequestDto): Promise<CreateUserResponseDto> {
    try {
      const response = await httpClient.post<ApiResponse<CreateUserResponseDto>>('/users', userData);

      if (!response.data) {
        throw new Error('Create user response missing data');
      }

      // Ensure the response has the expected structure
      if (!response.data.user) {
        throw new Error('Create user response missing user data');
      }

      // Ensure user has required fields
      if (!response.data.user.id) {
        throw new Error('Create user response: user missing id field');
      }

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update user by ID
   */
  static async updateUser(id: string, updates: UpdateUserRequestDto): Promise<UpdateUserResponseDto> {
    try {
      const response = await httpClient.patch<ApiResponse<UpdateUserResponseDto>>(`/users/${id}`, updates);

      if (!response.data) {
        throw new Error('Update user response missing data');
      }

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete user by ID
   */
  static async deleteUser(id: string): Promise<{ message: string }> {
    try {
      const response = await httpClient.delete<ApiResponse<any>>(`/users/${id}`);

      // For delete operations, the message might be in data or at the top level
      if (response.data) {
        // If data is a string, wrap it in an object
        if (typeof response.data === 'string') {
          return { message: response.data };
        }
        // If data has a message property
        if (response.data.message) {
          return { message: response.data.message };
        }
        // If data is an object with message
        return response.data as { message: string };
      }

      // Fallback to top-level message
      if (response.message) {
        return { message: response.message };
      }

      // Default message
      return { message: 'User deleted successfully' };
    } catch (error) {
      throw error;
    }
  }
}

// Export singleton instance methods for convenience
export const userApi = {
  getUsers: UserApiService.getUsers,
  getUserStats: UserApiService.getUserStats,
  getUser: UserApiService.getUser,
  createUser: UserApiService.createUser,
  updateUser: UserApiService.updateUser,
  deleteUser: UserApiService.deleteUser,
};
