import { AuthService } from '@/application/services/auth-service';
import { UserService } from '@/application/services/user-service';
import { LicenseManagementService, licenseApiService } from '@/application/services/license-services';

// Repositories
import { AuthRepository } from '@/infrastructure/repositories/auth-repository';
import { UserRepository } from '@/infrastructure/repositories/user-repository';

// Use Cases
import {
  createLoginUseCase,
  type LoginUseCaseContract,
  createLogoutUseCase,
  type LogoutUseCaseContract,
  createUpdateProfileUseCase,
  type UpdateProfileUseCaseContract,
  createGetProfileUseCase,
  type GetProfileUseCaseContract,
  createChangePasswordUseCase,
  type ChangePasswordUseCaseContract,
} from '@/application/use-cases/auth';
import {
  CreateUserUseCase,
  UpdateUserUseCase,
  DeleteUserUseCase,
  createGetUsersUseCase,
  type GetUsersUseCaseContract,
  createSearchUsersUseCase,
  type SearchUsersUseCaseContract
} from '@/application/use-cases/user';
import {
  GetLicensesUseCase,
  CreateLicenseUseCase,
  UpdateLicenseUseCase,
  DeleteLicenseUseCase,
  BulkUpdateLicensesUseCase,
  BulkCreateLicensesUseCase,
} from '@/application/use-cases/license';

/**
 * Dependency Injection Container
 * Manages all service dependencies and provides centralized instantiation
 */
class DependencyContainer {
  // Repositories (Infrastructure Layer)
  private _authRepository?: AuthRepository;
  private _userRepository?: UserRepository;

  // Use Cases (Application Layer)
  private _loginUseCase?: LoginUseCaseContract;
  private _logoutUseCase?: LogoutUseCaseContract;
  private _updateProfileUseCase?: UpdateProfileUseCaseContract;
  private _getProfileUseCase?: GetProfileUseCaseContract;
  private _changePasswordUseCase?: ChangePasswordUseCaseContract;

  private _createUserUseCase?: CreateUserUseCase;
  private _updateUserUseCase?: UpdateUserUseCase;
  private _deleteUserUseCase?: DeleteUserUseCase;
  private _getUsersUseCase?: GetUsersUseCaseContract;
  private _searchUsersUseCase?: SearchUsersUseCaseContract;

  private _getLicensesUseCase?: GetLicensesUseCase;
  private _createLicenseUseCase?: CreateLicenseUseCase;
  private _updateLicenseUseCase?: UpdateLicenseUseCase;
  private _deleteLicenseUseCase?: DeleteLicenseUseCase;
  private _bulkUpdateLicensesUseCase?: BulkUpdateLicensesUseCase;
  private _bulkCreateLicensesUseCase?: BulkCreateLicensesUseCase;

  // Services (Application Layer)
  private _authService?: AuthService;
  private _userService?: UserService;
  private _licenseManagementService?: LicenseManagementService;

  // Repository getters
  get authRepository(): AuthRepository {
    if (!this._authRepository) {
      this._authRepository = new AuthRepository();
    }
    return this._authRepository;
  }

  get userRepository(): UserRepository {
    if (!this._userRepository) {
      this._userRepository = new UserRepository();
    }
    return this._userRepository;
  }

  // Use Case getters
  get loginUseCase(): LoginUseCaseContract {
    if (!this._loginUseCase) {
      this._loginUseCase = createLoginUseCase(this.authRepository);
    }
    return this._loginUseCase;
  }

  get logoutUseCase(): LogoutUseCaseContract {
    if (!this._logoutUseCase) {
      this._logoutUseCase = createLogoutUseCase(this.authRepository);
    }
    return this._logoutUseCase;
  }

  get updateProfileUseCase(): UpdateProfileUseCaseContract {
    if (!this._updateProfileUseCase) {
      this._updateProfileUseCase = createUpdateProfileUseCase(this.authRepository);
    }
    return this._updateProfileUseCase;
  }

  get getProfileUseCase(): GetProfileUseCaseContract {
    if (!this._getProfileUseCase) {
      this._getProfileUseCase = createGetProfileUseCase(this.authRepository);
    }
    return this._getProfileUseCase;
  }

  get changePasswordUseCase(): ChangePasswordUseCaseContract {
    if (!this._changePasswordUseCase) {
      this._changePasswordUseCase = createChangePasswordUseCase(this.authRepository);
    }
    return this._changePasswordUseCase;
  }

  get createUserUseCase(): CreateUserUseCase {
    if (!this._createUserUseCase) {
      this._createUserUseCase = new CreateUserUseCase(this.userRepository);
    }
    return this._createUserUseCase;
  }

  get updateUserUseCase(): UpdateUserUseCase {
    if (!this._updateUserUseCase) {
      this._updateUserUseCase = new UpdateUserUseCase(this.userRepository);
    }
    return this._updateUserUseCase;
  }

  get deleteUserUseCase(): DeleteUserUseCase {
    if (!this._deleteUserUseCase) {
      this._deleteUserUseCase = new DeleteUserUseCase(this.userRepository);
    }
    return this._deleteUserUseCase;
  }

  get getUsersUseCase(): GetUsersUseCaseContract {
    if (!this._getUsersUseCase) {
      this._getUsersUseCase = createGetUsersUseCase(this.userRepository);
    }
    return this._getUsersUseCase;
  }

  get searchUsersUseCase(): SearchUsersUseCaseContract {
    if (!this._searchUsersUseCase) {
      this._searchUsersUseCase = createSearchUsersUseCase(this.userRepository);
    }
    return this._searchUsersUseCase;
  }

  get getLicensesUseCase(): GetLicensesUseCase {
    if (!this._getLicensesUseCase) {
      this._getLicensesUseCase = new GetLicensesUseCase(licenseApiService);
    }
    return this._getLicensesUseCase;
  }

  get createLicenseUseCase(): CreateLicenseUseCase {
    if (!this._createLicenseUseCase) {
      this._createLicenseUseCase = new CreateLicenseUseCase(licenseApiService);
    }
    return this._createLicenseUseCase;
  }

  get updateLicenseUseCase(): UpdateLicenseUseCase {
    if (!this._updateLicenseUseCase) {
      this._updateLicenseUseCase = new UpdateLicenseUseCase(licenseApiService);
    }
    return this._updateLicenseUseCase;
  }

  get deleteLicenseUseCase(): DeleteLicenseUseCase {
    if (!this._deleteLicenseUseCase) {
      this._deleteLicenseUseCase = new DeleteLicenseUseCase(licenseApiService);
    }
    return this._deleteLicenseUseCase;
  }

  get bulkUpdateLicensesUseCase(): BulkUpdateLicensesUseCase {
    if (!this._bulkUpdateLicensesUseCase) {
      this._bulkUpdateLicensesUseCase = new BulkUpdateLicensesUseCase(licenseApiService);
    }
    return this._bulkUpdateLicensesUseCase;
  }

  get bulkCreateLicensesUseCase(): BulkCreateLicensesUseCase {
    if (!this._bulkCreateLicensesUseCase) {
      this._bulkCreateLicensesUseCase = new BulkCreateLicensesUseCase(licenseApiService);
    }
    return this._bulkCreateLicensesUseCase;
  }


  // Service getters
  get authService(): AuthService {
    if (!this._authService) {
      const logoutPort = this.logoutUseCase;
      const updateProfilePort = this.updateProfileUseCase;
      const getProfilePort = this.getProfileUseCase;
      const changePasswordPort = this.changePasswordUseCase;
      this._authService = new AuthService(
        this.authRepository,
        {
          login: this.loginUseCase,
          logout: logoutPort,
          updateProfile: updateProfilePort,
          getProfile: getProfilePort,
          changePassword: changePasswordPort,
        }
      );
    }
    return this._authService;
  }

  get userService(): UserService {
    if (!this._userService) {
      this._userService = new UserService(
        this.createUserUseCase,
        this.updateUserUseCase,
        this.deleteUserUseCase,
        this.getUsersUseCase,
        this.searchUsersUseCase
      );
    }
    return this._userService;
  }

  get licenseManagementService(): LicenseManagementService {
    if (!this._licenseManagementService) {
      this._licenseManagementService = new LicenseManagementService(
        this.getLicensesUseCase,
        this.createLicenseUseCase,
        this.updateLicenseUseCase,
        this.deleteLicenseUseCase,
        this.bulkUpdateLicensesUseCase,
        this.bulkCreateLicensesUseCase
      );
    }
    return this._licenseManagementService;
  }

  /**
   * Reset all dependencies (useful for testing)
   */
  reset(): void {
    this._authRepository = undefined;
    this._userRepository = undefined;

    this._loginUseCase = undefined;
    this._logoutUseCase = undefined;
    this._updateProfileUseCase = undefined;
    this._getProfileUseCase = undefined;
    this._changePasswordUseCase = undefined;

    this._createUserUseCase = undefined;
    this._updateUserUseCase = undefined;
    this._deleteUserUseCase = undefined;
    this._getUsersUseCase = undefined;
    this._searchUsersUseCase = undefined;

    this._getLicensesUseCase = undefined;
    this._createLicenseUseCase = undefined;
    this._updateLicenseUseCase = undefined;
    this._deleteLicenseUseCase = undefined;
    this._bulkUpdateLicensesUseCase = undefined;
    this._bulkCreateLicensesUseCase = undefined;

    this._authService = undefined;
    this._userService = undefined;
    this._licenseManagementService = undefined;
  }
}

// Export singleton instance
export const container = new DependencyContainer();
