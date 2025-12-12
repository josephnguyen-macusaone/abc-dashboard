// Barrel exports for all application use cases
// This provides a single import point for all use case classes

// Authentication use cases
export {
  LoginUseCase,
  createLoginUseCase,
  type LoginUseCaseContract,
} from './auth/login-usecase';
export {
  LogoutUseCase,
  createLogoutUseCase,
  type LogoutUseCaseContract,
} from './auth/logout-usecase';
export {
  UpdateProfileUseCase,
  createUpdateProfileUseCase,
  type UpdateProfileUseCaseContract,
  type UpdateProfileDTO,
} from './auth/update-profile-usecase';
export {
  GetProfileUseCase,
  createGetProfileUseCase,
  type GetProfileUseCaseContract,
} from './auth/get-profile-usecase';

// User management use cases
export { CreateUserUseCase } from './user/create-user-usecase';
export { UpdateUserUseCase } from './user/update-user-usecase';
export { DeleteUserUseCase } from './user/delete-user-usecase';
export {
  GetUsersUseCase,
  createGetUsersUseCase,
  type GetUsersUseCaseContract,
} from './user/get-users-usecase';
export {
  SearchUsersUseCase,
  createSearchUsersUseCase,
  type SearchUsersUseCaseContract,
} from './user/search-users-usecase';
export { GetUserStatsUseCase } from './user/get-user-stats-usecase';

// License management use cases
export {
  GetLicensesUseCase,
  createGetLicensesUseCase,
  type GetLicensesUseCaseContract,
} from './license/get-licenses-usecase';

export {
  CreateLicenseUseCase,
  createCreateLicenseUseCase,
  type CreateLicenseUseCaseContract,
} from './license/create-license-usecase';

export {
  UpdateLicenseUseCase,
  createUpdateLicenseUseCase,
  type UpdateLicenseUseCaseContract,
} from './license/update-license-usecase';

export {
  DeleteLicenseUseCase,
  createDeleteLicenseUseCase,
  type DeleteLicenseUseCaseContract,
} from './license/delete-license-usecase';

export {
  BulkUpdateLicensesUseCase,
  createBulkUpdateLicensesUseCase,
  type BulkUpdateLicensesUseCaseContract,
} from './license/bulk-update-licenses-usecase';