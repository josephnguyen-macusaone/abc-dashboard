import { User } from '@/domain/entities/user-entity';
import type { PaginationState, UserFilters } from './user-store-composed';

// Re-export the new composed user store for backward compatibility
export { useUserStore } from './user-store-composed';

// Re-export types for backward compatibility
export type {
  UserFilters,
  PaginationState,
  UserStats,
  CreateUserRequest,
  UpdateUserRequest
} from './user-store-composed';

// Also export UserStats from list store for consistency
export type { UserStats as UserStatsFromList } from './user-list-store';

// PaginationState is already exported above

// Legacy exports for backward compatibility - these will be removed in future versions
export interface UserListResponse {
  users: User[];
  pagination: PaginationState;
}

// Selectors to encourage consistent derived access (legacy - use composed store selectors instead)
export const selectUsers = (state: { users: User[] }) => state.users;
export const selectUserFilters = (state: { filters: UserFilters }) => state.filters;
export const selectUserPagination = (state: { pagination: PaginationState }) => state.pagination;
export const selectUserStats = (state: { stats: any }) => state.stats;
export const selectUserLoading = (state: { loading: boolean }) => state.loading;
