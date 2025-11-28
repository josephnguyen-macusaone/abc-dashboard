// Export everything from the API layer
export * from '@/infrastructure/api/types';
export * from '@/infrastructure/api/errors';
export { httpClient, HttpClient } from '@/infrastructure/api/client';
export { AuthApiService, authApi } from '@/infrastructure/api/auth';
export { UserApiService, userApi } from '@/infrastructure/api/users';

// Re-export commonly used types and utilities
export type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
} from '@/infrastructure/api/types';

export {
  handleApiError,
  isRetryableError,
  getErrorMessage,
  createErrorResponse,
  logApiError,
} from '@/infrastructure/api/errors';
