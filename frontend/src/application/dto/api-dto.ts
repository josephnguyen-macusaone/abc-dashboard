import { UserRole } from '@/domain/entities/user-entity';
import { SortBy, SortOrder } from '@/shared/types';

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

// Auth API DTOs
export interface UserDto {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  requiresPasswordChange?: boolean;
  managedBy?: string;
}

export interface AuthTokensDto {
  accessToken: string;
  refreshToken?: string;
}

export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface LoginResponseDto {
  user: UserDto;
  tokens: AuthTokensDto;
}


export interface AuthStatusResponseDto {
  user: UserDto;
  isAuthenticated: boolean;
}

// User Management API DTOs
export interface UserProfileDto {
  id: string;
  username: string;
  email: string;
  displayName: string;
  role: UserRole;
  avatarUrl?: string;
  phone?: string;
  bio?: string;
  isActive: boolean;
  isFirstLogin: boolean;
  langKey: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  lastModifiedBy?: string;
}

export interface CreateUserRequestDto {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
  avatarUrl?: string;
  phone?: string;
  managerId?: string;
}

export interface CreateUserResponseDto {
  user: UserProfileDto;
  message: string;
  temporaryPassword?: string;
}

export interface UpdateUserRequestDto {
  displayName?: string;
  avatarUrl?: string;
  phone?: string;
  role?: UserRole;
  isActive?: boolean;
  managerId?: string;
}

export interface UpdateUserResponseDto {
  user: UserProfileDto;
  message: string;
}

export interface UsersListResponseDto {
  users: UserProfileDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface GetUsersQueryParamsDto {
  page?: number;
  limit?: number;
  email?: string;
  username?: string;
  displayName?: string;
  hasAvatar?: boolean;
  hasBio?: boolean;
  sortBy?: SortBy;
  sortOrder?: SortOrder;
}

export interface UserStatsResponseDto {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  usersByRole: {
    admin: number;
    manager: number;
    staff: number;
  };
  recentUsers: number;
}

// Profile Update API DTOs
export interface ProfileUpdateRequestDto {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  bio?: string;
  phone?: string;
  avatarUrl?: string;
}

export interface ProfileUpdateResponseDto {
  user: UserDto;
}

export interface ChangePasswordRequestDto {
  currentPassword: string;
  newPassword: string;
  confirmPassword?: string; // Optional for API calls
}

export interface ChangePasswordResponseDto {
  message: string;
}

// API Error Types
export interface ApiErrorDto {
  message: string;
  code?: string;
  status?: number;
  details?: any;
}

export class ApiExceptionDto extends Error {
  public readonly code?: string;
  public readonly status?: number;
  public readonly details?: any;

  constructor(message: string, code?: string, status?: number, details?: any) {
    super(message);
    this.name = 'ApiException';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}
