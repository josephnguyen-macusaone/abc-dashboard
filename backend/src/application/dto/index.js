/**
 * Application DTOs
 * Central export for all data transfer objects
 */

// Common DTOs
export { BaseDto, PaginationDto } from './common/index.js';

// Auth DTOs
export {
  TokensDto,
  UserAuthDto,
  LoginResponseDto,
  RegisterResponseDto,
  LoginRequestDto,
  RegisterRequestDto,
  ChangePasswordRequestDto,
  RefreshTokenRequestDto,
} from './auth/index.js';

// User DTOs
export { UserResponseDto, UserListResponseDto, CreateUserRequestDto } from './user/index.js';

// Profile DTOs
export { ProfileDto, UpdateProfileRequestDto } from './profile/index.js';
