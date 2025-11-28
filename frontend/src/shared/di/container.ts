import { AuthService } from '@/application/services/auth-service';
import { UserManagementService } from '@/application/services/user-management-service';

// Repositories
import { AuthRepository } from '@/infrastructure/repositories/auth-repository';
import { UserRepository } from '@/infrastructure/repositories/user-repository';

// Use Cases
import {
  LoginUseCase,
  RegisterUseCase,
  LogoutUseCase,
  UpdateProfileUseCase,
  GetProfileUseCase
} from '@/application/use-cases/auth';
import {
  CreateUserUseCase,
  UpdateUserUseCase,
  DeleteUserUseCase,
  GetUsersUseCase,
  SearchUsersUseCase,
  GetUserStatsUseCase
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
  private _loginUseCase?: LoginUseCase;
  private _registerUseCase?: RegisterUseCase;
  private _logoutUseCase?: LogoutUseCase;
  private _updateProfileUseCase?: UpdateProfileUseCase;
  private _getProfileUseCase?: GetProfileUseCase;

  private _createUserUseCase?: CreateUserUseCase;
  private _updateUserUseCase?: UpdateUserUseCase;
  private _deleteUserUseCase?: DeleteUserUseCase;
  private _getUsersUseCase?: GetUsersUseCase;
  private _searchUsersUseCase?: SearchUsersUseCase;
  private _getUserStatsUseCase?: GetUserStatsUseCase;

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
  get loginUseCase(): LoginUseCase {
    if (!this._loginUseCase) {
      this._loginUseCase = new LoginUseCase(this.authRepository);
    }
    return this._loginUseCase;
  }

  get registerUseCase(): RegisterUseCase {
    if (!this._registerUseCase) {
      this._registerUseCase = new RegisterUseCase(this.authRepository);
    }
    return this._registerUseCase;
  }

  get logoutUseCase(): LogoutUseCase {
    if (!this._logoutUseCase) {
      this._logoutUseCase = new LogoutUseCase(this.authRepository);
    }
    return this._logoutUseCase;
  }

  get updateProfileUseCase(): UpdateProfileUseCase {
    if (!this._updateProfileUseCase) {
      this._updateProfileUseCase = new UpdateProfileUseCase(this.authRepository);
    }
    return this._updateProfileUseCase;
  }

  get getProfileUseCase(): GetProfileUseCase {
    if (!this._getProfileUseCase) {
      this._getProfileUseCase = new GetProfileUseCase(this.authRepository);
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

  get getUsersUseCase(): GetUsersUseCase {
    if (!this._getUsersUseCase) {
      this._getUsersUseCase = new GetUsersUseCase(this.userRepository);
    }
    return this._getUsersUseCase;
  }

  get searchUsersUseCase(): SearchUsersUseCase {
    if (!this._searchUsersUseCase) {
      this._searchUsersUseCase = new SearchUsersUseCase(this.userRepository);
    }
    return this._searchUsersUseCase;
  }

  get getUserStatsUseCase(): GetUserStatsUseCase {
    if (!this._getUserStatsUseCase) {
      this._getUserStatsUseCase = new GetUserStatsUseCase(this.userRepository);
    }
    return this._getUserStatsUseCase;
  }

  // Service getters
  get authService(): AuthService {
    if (!this._authService) {
      this._authService = new AuthService(
        this.authRepository,
        this.loginUseCase,
        this.registerUseCase,
        this.logoutUseCase,
        this.updateProfileUseCase,
        this.getProfileUseCase
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
        this.searchUsersUseCase,
        this.getUserStatsUseCase
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
    this._registerUseCase = undefined;
    this._logoutUseCase = undefined;
    this._updateProfileUseCase = undefined;
    this._getProfileUseCase = undefined;

    this._createUserUseCase = undefined;
    this._updateUserUseCase = undefined;
    this._deleteUserUseCase = undefined;
    this._getUsersUseCase = undefined;
    this._searchUsersUseCase = undefined;
    this._getUserStatsUseCase = undefined;

    this._authService = undefined;
    this._userManagementService = undefined;
  }
}

// Export singleton instance
export const container = new DependencyContainer();
