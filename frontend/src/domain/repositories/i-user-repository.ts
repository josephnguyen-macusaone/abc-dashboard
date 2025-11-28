import { User } from '@/domain/entities/user-entity';
import {
  CreateUserDTO,
  UpdateUserDTO,
  UserListParams,
  UserStats,
  PaginatedUserList
} from '@/application/dto/user-dto';

/**
 * Domain Repository Interface: User Management
 * Defines the contract for user data operations
 */
export interface IUserRepository {
  /**
   * Get user by ID
   */
  getUserById(id: string): Promise<User | null>;

  /**
   * Get users by role
   */
  getUsersByRole(role: string): Promise<User[]>;

  /**
   * Search users
   */
  searchUsers(query: string): Promise<User[]>;

  /**
   * Create new user (Admin only)
   */
  createUser(userData: CreateUserDTO): Promise<User>;

  /**
   * Update user information
   */
  updateUser(id: string, updates: UpdateUserDTO): Promise<User>;

  /**
   * Delete user account (Admin only)
   */
  deleteUser(id: string): Promise<void>;

  /**
   * Get paginated list of users
   */
  getUsers(params: UserListParams): Promise<PaginatedUserList>;

  /**
   * Get user statistics
   */
  getUserStats(): Promise<UserStats>;

  /**
   * Get current authenticated user
   */
  getCurrentUser(): Promise<User | null>;
}
