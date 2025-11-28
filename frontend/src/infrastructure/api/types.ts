// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

// Auth API Types
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'staff';
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

// User Management Types
export interface UserProfile {
  id: string;
  username: string;
  email: string;
  displayName: string;
  role: 'admin' | 'manager' | 'staff';
  avatarUrl?: string;
  phone?: string;
  isActive: boolean;
  isFirstLogin: boolean;
  langKey: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  lastModifiedBy?: string;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  displayName: string;
  role?: 'admin' | 'manager' | 'staff';
  avatarUrl?: string;
  phone?: string;
}

export interface CreateUserResponse {
  user: UserProfile;
  message: string;
  temporaryPassword?: string;
}

export interface UpdateUserRequest {
  displayName?: string;
  avatarUrl?: string;
  phone?: string;
  role?: 'admin' | 'manager' | 'staff';
  isActive?: boolean;
}

export interface UpdateUserResponse {
  user: UserProfile;
  message: string;
}

export interface UsersListResponse {
  users: UserProfile[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface GetUsersQueryParams {
  page?: number;
  limit?: number;
  email?: string;
  username?: string;
  displayName?: string;
  hasAvatar?: boolean;
  hasBio?: boolean;
  sortBy?: 'createdAt' | 'email' | 'username' | 'displayName';
  sortOrder?: 'asc' | 'desc';
}

export interface UserStatsResponse {
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

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: 'admin' | 'manager' | 'staff';
}

export interface RegisterResponse {
  user: User;
  tokens: AuthTokens;
}

export interface AuthStatusResponse {
  user: User;
  isAuthenticated: boolean;
}

// Profile Update Types
export interface ProfileUpdateRequest {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  bio?: string;
  phone?: string;
  avatarUrl?: string;
}

export interface ProfileUpdateResponse {
  user: User;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword?: string; // Optional for API calls
}

export interface ChangePasswordResponse {
  message: string;
}

// API Error Types
export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: any;
}

export class ApiException extends Error {
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

// HTTP Client Types
export interface RequestConfig {
  timeout?: number;
  headers?: Record<string, string>;
  retries?: number;
}

export interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  retryCondition?: (error: any) => boolean;
}
