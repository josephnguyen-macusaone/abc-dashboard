import { UserRepository } from '../../infrastructure/repositories/user-repository.js';
import UserModel from '../../infrastructure/models/user-model.js';
import { AuthController } from '../../infrastructure/controllers/auth-controller.js';
import { UserController } from '../../infrastructure/controllers/user-controller.js';
import { LoginUseCase } from '../../application/use-cases/auth/login-use-case.js';
import { RegisterUseCase } from '../../application/use-cases/auth/register-use-case.js';
import { RefreshTokenUseCase } from '../../application/use-cases/auth/refresh-token-use-case.js';
import { VerifyEmailUseCase } from '../../application/use-cases/auth/verify-email-use-case.js';
import { UpdateProfileUseCase } from '../../application/use-cases/auth/update-profile-use-case.js';
import { ChangePasswordUseCase } from '../../application/use-cases/auth/change-password-use-case.js';
import { GetUsersUseCase } from '../../application/use-cases/users/get-users-use-case.js';
import { CreateUserUseCase } from '../../application/use-cases/users/create-user-use-case.js';
import { UpdateUserUseCase } from '../../application/use-cases/users/update-user-use-case.js';
import { DeleteUserUseCase } from '../../application/use-cases/users/delete-user-use-case.js';
import { GetUserStatsUseCase } from '../../application/use-cases/users/get-user-stats-use-case.js';
import { AuthService } from '../services/auth-service.js';
import { TokenService } from '../services/token-service.js';
import { EmailService } from '../services/email-service.js';
import { config } from '../../infrastructure/config/config.js';
import { AuthMiddleware } from '../../infrastructure/middleware/auth-middleware.js';

/**
 * Dependency Injection Container
 * Manages the creation and wiring of all dependencies
 */
class Container {
  constructor() {
    this.instances = new Map();
  }

  // Singleton pattern for repositories
  getUserRepository() {
    if (!this.instances.has('userRepository')) {
      // Currently only supports MongoDB
      this.instances.set('userRepository', new UserRepository(UserModel));
    }
    return this.instances.get('userRepository');
  }

  getAuthService() {
    if (!this.instances.has('authService')) {
      this.instances.set('authService', new AuthService());
    }
    return this.instances.get('authService');
  }

  getTokenService() {
    if (!this.instances.has('tokenService')) {
      this.instances.set('tokenService', new TokenService());
    }
    return this.instances.get('tokenService');
  }

  getEmailService() {
    if (!this.instances.has('emailService')) {
      this.instances.set('emailService', new EmailService());
    }
    return this.instances.get('emailService');
  }

  // Use cases
  getLoginUseCase() {
    return new LoginUseCase(
      this.getUserRepository(),
      this.getAuthService(),
      this.getTokenService()
    );
  }

  getRegisterUseCase() {
    return new RegisterUseCase(
      this.getUserRepository(),
      this.getAuthService(),
      this.getTokenService(),
      this.getEmailService()
    );
  }

  getRefreshTokenUseCase() {
    return new RefreshTokenUseCase(
      this.getUserRepository(),
      this.getTokenService()
    );
  }

  getVerifyEmailUseCase() {
    return new VerifyEmailUseCase(
      this.getUserRepository(),
      this.getEmailService()
    );
  }

  getUpdateProfileUseCase() {
    return new UpdateProfileUseCase(
      this.getUserRepository()
    );
  }

  getChangePasswordUseCase() {
    return new ChangePasswordUseCase(
      this.getUserRepository(),
      this.getAuthService(),
      this.getEmailService()
    );
  }

  // User use cases
  getGetUsersUseCase() {
    return new GetUsersUseCase(this.getUserRepository());
  }

  getCreateUserUseCase() {
    return new CreateUserUseCase(
      this.getUserRepository(),
      this.getAuthService()
    );
  }

  getUpdateUserUseCase() {
    return new UpdateUserUseCase(this.getUserRepository());
  }

  getDeleteUserUseCase() {
    return new DeleteUserUseCase(this.getUserRepository());
  }

  getGetUserStatsUseCase() {
    return new GetUserStatsUseCase(this.getUserRepository());
  }

  // Controllers
  getAuthController() {
    return new AuthController(
      this.getLoginUseCase(),
      this.getRegisterUseCase(),
      this.getRefreshTokenUseCase(),
      this.getVerifyEmailUseCase(),
      this.getUpdateProfileUseCase(),
      this.getChangePasswordUseCase()
    );
  }

  getUserController() {
    return new UserController(
      this.getGetUsersUseCase(),
      this.getCreateUserUseCase(),
      this.getUpdateUserUseCase(),
      this.getDeleteUserUseCase(),
      this.getGetUserStatsUseCase()
    );
  }

  // Middleware
  getAuthMiddleware() {
    if (!this.instances.has('authMiddleware')) {
      this.instances.set('authMiddleware', new AuthMiddleware(
        this.getTokenService(),
        this.getUserRepository()
      ));
    }
    return this.instances.get('authMiddleware');
  }

  // Middleware functions (convenience methods)
  getAuthenticateMiddleware() {
    return this.getAuthMiddleware().authenticate;
  }

  getAuthorizeSelfMiddleware() {
    return this.getAuthMiddleware().authorizeSelf;
  }

  getOptionalAuthMiddleware() {
    return this.getAuthMiddleware().optionalAuth;
  }
}

// Export singleton instance
export const container = new Container();
