import { User, AuthResult, AuthTokens } from '@/domain/entities/user-entity';

/**
 * Domain Repository Interface: Authentication
 * Defines the contract for authentication data operations
 */
export interface IAuthRepository {
  /**
   * Authenticate user with email and password
   */
  login(email: string, password: string): Promise<AuthResult>;

  /**
   * Register new user
   */
  register(username: string, firstName: string, lastName: string, email: string, password: string, role?: string): Promise<AuthResult>;

  /**
   * Logout current user
   */
  logout(): Promise<void>;

  /**
   * Refresh authentication tokens
   */
  refreshToken(): Promise<AuthTokens>;

  /**
   * Verify email with token
   */
  verifyEmail(email: string, token: string): Promise<{ user: User; message: string }>;


  /**
   * Change current user's password
   */
  changePassword(currentPassword: string, newPassword: string): Promise<void>;

  /**
   * Update user profile
   */
  updateProfile(updates: Partial<{
    firstName: string;
    lastName: string;
    displayName: string;
    bio: string;
    phone: string;
    avatarUrl: string;
  }>): Promise<User>;

  /**
   * Get complete user profile
   */
  getProfile(): Promise<User>;
}