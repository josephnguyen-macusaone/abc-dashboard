import { User, UserRole } from '@/domain/entities/user-entity';
import { SortBy, SortOrder } from '@/shared/types';

/**
 * Application DTOs: User Management
 * Domain-level data transfer objects for user operations
 * Independent of infrastructure layer types
 */

/**
 * Create User DTO
 * Used for creating new users
 */
export interface CreateUserDTO {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
  avatarUrl?: string;
  phone?: string;
  managerId?: string;
}

/**
 * Update User DTO
 * Used for updating existing users
 */
export interface UpdateUserDTO {
  displayName?: string;
  avatarUrl?: string;
  phone?: string;
  role?: UserRole;
  isActive?: boolean;
}

/**
 * User List Parameters DTO
 * Used for querying users with pagination and filters
 */
export interface UserListParams {
  page?: number;
  limit?: number;
  email?: string;
  username?: string;
  displayName?: string;
  role?: UserRole;
  isActive?: boolean;
  hasAvatar?: boolean;
  hasPhone?: boolean;
  sortBy?: SortBy;
  sortOrder?: SortOrder;
}

/**
 * User Search Query DTO
 * Used for searching users
 */
export interface UserSearchQuery {
  query: string;
  limit?: number;
}

/**
 * User Statistics DTO
 * Used for user statistics and analytics
 */
export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  usersByRole: {
    admin: number;
    manager: number;
    staff: number;
  };
  recentUsers: number; // Users created in last 30 days
}

/**
 * Paginated User List DTO
 * Used for paginated user responses
 */
export interface PaginatedUserList {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Re-export User and UserRole from domain for convenience
export { User, UserRole } from '@/domain/entities/user-entity';
