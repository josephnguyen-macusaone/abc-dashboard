import { httpClient } from '@/infrastructure/api/client';
import {
  LoginRequestDto,
  LoginResponseDto,
  RegisterRequestDto,
  RegisterResponseDto,
  AuthStatusResponseDto,
  ApiResponse,
  AuthTokensDto,
  ProfileUpdateRequestDto,
  ProfileUpdateResponseDto,
  ChangePasswordRequestDto,
  ChangePasswordResponseDto,
  UserDto,
  UserProfileDto
} from '@/application/dto/api-dto';
import logger from '@/shared/utils/logger';

/**
 * Authentication API service
 */
export class AuthApiService {
  /**
   * Login user
   */
  static async login(credentials: LoginRequestDto): Promise<LoginResponseDto> {
    try {
      const response = await httpClient.post<ApiResponse<LoginResponseDto>>('/auth/login', credentials);

      if (!response.data) {
        throw new Error('Login response missing data');
      }

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Register new user
   */
  static async register(userData: RegisterRequestDto): Promise<RegisterResponseDto> {
    try {
      const response = await httpClient.post<ApiResponse<RegisterResponseDto>>('/auth/register', userData);

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
  static async getStatus(): Promise<AuthStatusResponseDto> {
    try {
      const response = await httpClient.get<ApiResponse<AuthStatusResponseDto>>('/auth/profile');

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
  static async refreshToken(): Promise<{ tokens: AuthTokensDto }> {
    try {
      const response = await httpClient.post<ApiResponse<{ tokens: AuthTokensDto }>>('/auth/refresh');

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
   * Verify email with JWT token
   */
  static async verifyEmail(token: string): Promise<{ user: UserDto; message: string }> {
    try {
      const response = await httpClient.post<ApiResponse<{ user: UserDto; message: string }>>('/auth/verify-email', { token });

      if (!response.data) {
        throw new Error('Email verification response missing data');
      }

      return response.data;
    } catch (error) {
      throw error;
    }
  }


  /**
   * Request password reset
   */
  static async forgotPassword(email: string): Promise<void> {
    try {
      await httpClient.post('/auth/forgot-password', { email });
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
   * Get user profile (complete profile data from auth endpoint)
   */
  static async getProfile(): Promise<UserProfileDto> {
    try {
      const response = await httpClient.get<ApiResponse<{ user: any; isAuthenticated: boolean }>>('/auth/profile');
      if (!response.data) {
        throw new Error('Get profile response missing data');
      }

      // The backend returns a wrapped response: { user: {...}, isAuthenticated: true }
      // We need to extract the user object and map it to UserProfileDto format
      const userData = response.data.user;

      // Ensure we have the required id field
      if (!userData || !userData.id) {
        throw new Error('Profile response missing user id field');
      }

      // Map backend fields to UserProfileDto format
      const userProfile: UserProfileDto = {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        displayName: userData.displayName,
        role: userData.role,
        avatarUrl: userData.avatarUrl,
        phone: userData.phone,
        bio: userData.bio,
        isActive: userData.isActive,
        isFirstLogin: userData.isFirstLogin !== undefined ? userData.isFirstLogin : false, // Default to false if not provided
        langKey: userData.langKey || 'en', // Default to 'en' if not provided
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt,
        createdBy: userData.createdBy,
        lastModifiedBy: userData.lastModifiedBy,
      };

      return userProfile;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(updates: ProfileUpdateRequestDto): Promise<ProfileUpdateResponseDto> {
    try {
      const response = await httpClient.put<ApiResponse<ProfileUpdateResponseDto>>('/profile', updates);

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
  static async changePassword(data: ChangePasswordRequestDto): Promise<ChangePasswordResponseDto> {
    try {
      const response = await httpClient.post<ApiResponse<ChangePasswordResponseDto>>('/auth/change-password', data);

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
  forgotPassword: AuthApiService.forgotPassword,
  resetPassword: AuthApiService.resetPassword,
  changePassword: AuthApiService.changePassword,
  getProfile: AuthApiService.getProfile,
  updateProfile: AuthApiService.updateProfile,
};
