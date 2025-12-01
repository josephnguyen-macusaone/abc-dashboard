import { UserRepository } from '../../infrastructure/repositories/user-repository.js';
import { UserProfileRepository } from '../../infrastructure/repositories/user-profile-repository.js';
import UserModel from '../../infrastructure/models/user-model.js';
import UserProfileModel from '../../infrastructure/models/user-profile-model.js';
import { AuthController } from '../../infrastructure/controllers/auth-controller.js';
import { UserController } from '../../infrastructure/controllers/user-controller.js';
import { ProfileController } from '../../infrastructure/controllers/profile-controller.js';
import { LoginUseCase } from '../../application/use-cases/auth/login-use-case.js';
import { RegisterUseCase } from '../../application/use-cases/auth/register-use-case.js';
import { RefreshTokenUseCase } from '../../application/use-cases/auth/refresh-token-use-case.js';
import { VerifyEmailUseCase as AuthVerifyEmailUseCase } from '../../application/use-cases/auth/verify-email-use-case.js';
import { UpdateProfileUseCase as AuthUpdateProfileUseCase } from '../../application/use-cases/auth/update-profile-use-case.js';
import { ChangePasswordUseCase } from '../../application/use-cases/auth/change-password-use-case.js';
import { RequestPasswordResetUseCase } from '../../application/use-cases/auth/request-password-reset-use-case.js';
import { ResetPasswordUseCase } from '../../application/use-cases/auth/reset-password-use-case.js';
import { GetUsersUseCase } from '../../application/use-cases/users/get-users-use-case.js';
import { CreateUserUseCase } from '../../application/use-cases/users/create-user-use-case.js';
import { UpdateUserUseCase } from '../../application/use-cases/users/update-user-use-case.js';
import { DeleteUserUseCase } from '../../application/use-cases/users/delete-user-use-case.js';
import { GetUserStatsUseCase } from '../../application/use-cases/users/get-user-stats-use-case.js';
import { GetProfileUseCase } from '../../application/use-cases/profiles/get-profile-use-case.js';
import { UpdateProfileUseCase as ProfileUpdateProfileUseCase } from '../../application/use-cases/profiles/update-profile-use-case.js';
import { RecordLoginUseCase } from '../../application/use-cases/profiles/record-login-use-case.js';
import { MarkEmailVerifiedUseCase } from '../../application/use-cases/profiles/mark-email-verified-use-case.js';
import { AuthService } from '../services/auth-service.js';
import { TokenService } from '../services/token-service.js';
import { EmailService } from '../services/email-service.js';
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

  // Set correlation ID on all instances for request-scoped tracking
  setCorrelationId(correlationId) {
    // Set on repositories
    const userRepo = this.instances.get('userRepository');
    if (userRepo) {
      userRepo.setCorrelationId(correlationId);
    }

    const userProfileRepo = this.instances.get('userProfileRepository');
    if (userProfileRepo && userProfileRepo.setCorrelationId) {
      userProfileRepo.setCorrelationId(correlationId);
    }

    // Set on services
    const authService = this.instances.get('authService');
    if (authService) {
      authService.correlationId = correlationId;
    }

    const tokenService = this.instances.get('tokenService');
    if (tokenService) {
      tokenService.correlationId = correlationId;
    }

    const emailService = this.instances.get('emailService');
    if (emailService) {
      emailService.correlationId = correlationId;
    }

    // Set on middleware
    const authMiddleware = this.instances.get('authMiddleware');
    if (authMiddleware && authMiddleware.setCorrelationId) {
      authMiddleware.setCorrelationId(correlationId);
    }
  }

  getUserProfileRepository() {
    if (!this.instances.has('userProfileRepository')) {
      // Currently only supports MongoDB
      this.instances.set('userProfileRepository', new UserProfileRepository(UserProfileModel));
    }
    return this.instances.get('userProfileRepository');
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
    return new RefreshTokenUseCase(this.getUserRepository(), this.getTokenService());
  }

  getAuthVerifyEmailUseCase() {
    return new AuthVerifyEmailUseCase(
      this.getUserRepository(),
      this.getTokenService(),
      this.getEmailService()
    );
  }

  getAuthUpdateProfileUseCase() {
    return new AuthUpdateProfileUseCase(this.getUserRepository());
  }

  getChangePasswordUseCase() {
    return new ChangePasswordUseCase(
      this.getUserRepository(),
      this.getAuthService(),
      this.getEmailService()
    );
  }

  getRequestPasswordResetUseCase() {
    return new RequestPasswordResetUseCase(
      this.getUserRepository(),
      this.getAuthService(),
      this.getEmailService()
    );
  }

  getResetPasswordUseCase() {
    return new ResetPasswordUseCase(
      this.getUserRepository(),
      this.getTokenService(),
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
      this.getAuthService(),
      this.getEmailService()
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

  // Profile Use Cases
  getGetProfileUseCase() {
    return new GetProfileUseCase(this.getUserProfileRepository());
  }

  getProfileUpdateProfileUseCase() {
    return new ProfileUpdateProfileUseCase(this.getUserProfileRepository());
  }

  getRecordLoginUseCase() {
    return new RecordLoginUseCase(this.getUserProfileRepository());
  }

  getMarkEmailVerifiedUseCase() {
    return new MarkEmailVerifiedUseCase(this.getUserProfileRepository());
  }

  // Controllers
  getAuthController() {
    return new AuthController(
      this.getLoginUseCase(),
      this.getRegisterUseCase(),
      this.getRefreshTokenUseCase(),
      this.getAuthVerifyEmailUseCase(),
      this.getMarkEmailVerifiedUseCase(),
      this.getChangePasswordUseCase(),
      this.getRequestPasswordResetUseCase(),
      this.getResetPasswordUseCase(),
      this.getTokenService()
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

  getProfileController() {
    return new ProfileController(
      this.getGetProfileUseCase(),
      this.getProfileUpdateProfileUseCase(),
      this.getAuthUpdateProfileUseCase(),
      this.getRecordLoginUseCase()
    );
  }

  // Middleware
  getAuthMiddleware() {
    if (!this.instances.has('authMiddleware')) {
      this.instances.set(
        'authMiddleware',
        new AuthMiddleware(this.getTokenService(), this.getUserRepository())
      );
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
