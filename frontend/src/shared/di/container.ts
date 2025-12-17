import { AuthService } from '@/application/services/auth-service';
import { UserManagementService } from '@/application/services/user-management-service';

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

  private _createUserUseCase?: CreateUserUseCase;
  private _updateUserUseCase?: UpdateUserUseCase;
  private _deleteUserUseCase?: DeleteUserUseCase;
  private _getUsersUseCase?: GetUsersUseCaseContract;
  private _searchUsersUseCase?: SearchUsersUseCaseContract;

  // Services (Application Layer)
  private _authService?: AuthService;
  private _userManagementService?: UserManagementService;

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


  // Service getters
  get authService(): AuthService {
    if (!this._authService) {
      const logoutPort = this.logoutUseCase;
      const updateProfilePort = this.updateProfileUseCase;
      const getProfilePort = this.getProfileUseCase;
      this._authService = new AuthService(
        this.authRepository,
        {
          login: this.loginUseCase,
          logout: logoutPort,
          updateProfile: updateProfilePort,
          getProfile: getProfilePort,
        }
      );
    }
    return this._authService;
  }

  get userManagementService(): UserManagementService {
    if (!this._userManagementService) {
      this._userManagementService = new UserManagementService(
        this.createUserUseCase,
        this.updateUserUseCase,
        this.deleteUserUseCase,
        this.getUsersUseCase,
        this.searchUsersUseCase
      );
    }
    return this._userManagementService;
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

    this._createUserUseCase = undefined;
    this._updateUserUseCase = undefined;
    this._deleteUserUseCase = undefined;
    this._getUsersUseCase = undefined;
    this._searchUsersUseCase = undefined;

    this._authService = undefined;
    this._userManagementService = undefined;
  }
}

// Export singleton instance
export const container = new DependencyContainer();
