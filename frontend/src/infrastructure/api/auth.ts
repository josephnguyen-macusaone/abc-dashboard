import { httpClient } from '@/infrastructure/api/client';
import {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  AuthStatusResponse,
  ApiResponse,
  AuthTokens
} from '@/infrastructure/api/types';
import logger from '@/shared/utils/logger';

/**
 * Authentication API service
 */
export class AuthApiService {
  /**
   * Login user
   */
  static async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await httpClient.post<ApiResponse<LoginResponse>>('/auth/login', credentials);
      if (!response.data) {
        throw new Error('Login response missing data');
      }
      return response.data;
    } catch (error) {
      throw error; // Error handling is done in the HTTP client
    }
  }

  /**
   * Register new user
   */
  static async register(userData: RegisterRequest): Promise<RegisterResponse> {
    try {
      const response = await httpClient.post<ApiResponse<RegisterResponse>>('/auth/register', userData);
      if (!response.data) {
        throw new Error('Register response missing data');
      }
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get current user status
   */
  static async getStatus(): Promise<AuthStatusResponse> {
    try {
      const response = await httpClient.get<ApiResponse<AuthStatusResponse>>('/auth/status');
      if (!response.data) {
        throw new Error('Auth status response missing data');
      }
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Refresh authentication token
   */
  static async refreshToken(): Promise<{ tokens: AuthTokens }> {
    try {
      const response = await httpClient.post<ApiResponse<{ tokens: AuthTokens }>>('/auth/refresh');
      if (!response.data) {
        throw new Error('Refresh token response missing data');
      }
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Logout user
   */
  static async logout(): Promise<void> {
    try {
      await httpClient.post('/auth/logout');
    } catch (error) {
      // Logout should not fail the operation
      logger.api('HTTP logout call failed, continuing with local logout', {
        operation: 'http_logout_error',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Verify email
   */
  static async verifyEmail(token: string): Promise<void> {
    try {
      await httpClient.post('/auth/verify-email', { token });
    } catch (error) {
      throw error;
    }
  }


  /**
   * Reset password
   */
  static async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      await httpClient.post('/auth/reset-password', { token, password: newPassword });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Change password (authenticated)
   */
  static async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      await httpClient.post('/auth/change-password', {
        currentPassword,
        newPassword
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get user profile
   */
  static async getProfile(): Promise<any> {
    try {
      const response = await httpClient.get<ApiResponse<any>>('/auth/profile');
      if (!response.data) {
        throw new Error('Get profile response missing data');
      }
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(updates: Partial<{
    firstName: string;
    lastName: string;
    displayName: string;
    bio: string;
    phone: string;
    avatarUrl: string;
  }>): Promise<ProfileUpdateResponse> {
    try {
      const response = await httpClient.put<ApiResponse<ProfileUpdateResponse>>('/auth/profile', updates);
      if (!response.data) {
        throw new Error('Update profile response missing data');
      }
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Change user password
   */
  static async changePassword(data: ChangePasswordRequest): Promise<ChangePasswordResponse> {
    try {
      const response = await httpClient.post<ApiResponse<ChangePasswordResponse>>('/auth/change-password', data);
      if (!response.data) {
        throw new Error('Change password response missing data');
      }
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}

// Export singleton instance methods for convenience
export const authApi = {
  login: AuthApiService.login,
  register: AuthApiService.register,
  getStatus: AuthApiService.getStatus,
  refreshToken: AuthApiService.refreshToken,
  logout: AuthApiService.logout,
  verifyEmail: AuthApiService.verifyEmail,
  resetPassword: AuthApiService.resetPassword,
  changePassword: AuthApiService.changePassword,
  getProfile: AuthApiService.getProfile,
  updateProfile: AuthApiService.updateProfile,
};
