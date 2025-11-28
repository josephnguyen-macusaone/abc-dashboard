import { httpClient } from '@/infrastructure/api/client';
import {
  ApiResponse,
  UserProfile,
  CreateUserRequest,
  CreateUserResponse,
  UpdateUserRequest,
  UpdateUserResponse,
  UsersListResponse,
  GetUsersQueryParams,
  UserStatsResponse
} from '@/infrastructure/api/types';

/**
 * User Management API service
 */
export class UserApiService {
  /**
   * Get users with pagination and filtering
   */
  static async getUsers(params: GetUsersQueryParams = {}): Promise<UsersListResponse> {
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
        data: UserProfile[];
        meta: { pagination: UsersListResponse['pagination'] };
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
  static async getUserStats(): Promise<UserStatsResponse> {
    try {
      const response = await httpClient.get<ApiResponse<UserStatsResponse>>('/users/stats');

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
  static async getUser(id: string): Promise<UserProfile> {
    try {
      const response = await httpClient.get<ApiResponse<{ user: UserProfile }>>(`/users/${id}`);

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
  static async createUser(userData: CreateUserRequest): Promise<CreateUserResponse> {
    try {
      const response = await httpClient.post<ApiResponse<CreateUserResponse>>('/users', userData);

      if (!response.data) {
        throw new Error('Create user response missing data');
      }

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update user by ID
   */
  static async updateUser(id: string, updates: UpdateUserRequest): Promise<UpdateUserResponse> {
    try {
      const response = await httpClient.put<ApiResponse<UpdateUserResponse>>(`/users/${id}`, updates);

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
      const response = await httpClient.delete<ApiResponse<{ message: string }>>(`/users/${id}`);

      if (!response.data) {
        throw new Error('Delete user response missing data');
      }

      return response.data;
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
