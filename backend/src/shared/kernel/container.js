import { UserRepository } from '../../infrastructure/repositories/user-repository.js';
import { UserProfileRepository } from '../../infrastructure/repositories/user-profile-repository.js';
import { LicenseRepository } from '../../infrastructure/repositories/license-repository.js';
import connectDB, { getDB } from '../../infrastructure/config/database.js';
import { AuthController } from '../../infrastructure/controllers/auth-controller.js';
import { UserController } from '../../infrastructure/controllers/user-controller.js';
import { ProfileController } from '../../infrastructure/controllers/profile-controller.js';
import { LicenseController } from '../../infrastructure/controllers/license-controller.js';
import { LicenseService } from '../services/license-service.js';
import { LoginUseCase } from '../../application/use-cases/auth/login-use-case.js';
import { RefreshTokenUseCase } from '../../application/use-cases/auth/refresh-token-use-case.js';
import { UpdateProfileUseCase as AuthUpdateProfileUseCase } from '../../application/use-cases/auth/update-profile-use-case.js';
import { ChangePasswordUseCase } from '../../application/use-cases/auth/change-password-use-case.js';
import { RequestPasswordResetUseCase } from '../../application/use-cases/auth/request-password-reset-use-case.js';
import { RequestPasswordResetWithGeneratedPasswordUseCase } from '../../application/use-cases/auth/request-password-reset-with-generated-password-use-case.js';
import { ResetPasswordUseCase } from '../../application/use-cases/auth/reset-password-use-case.js';
import { GetUsersUseCase } from '../../application/use-cases/users/get-users-use-case.js';
import { CreateUserUseCase } from '../../application/use-cases/users/create-user-use-case.js';
import { UpdateUserUseCase } from '../../application/use-cases/users/update-user-use-case.js';
import { DeleteUserUseCase } from '../../application/use-cases/users/delete-user-use-case.js';
import { GetUserStatsUseCase } from '../../application/use-cases/users/get-user-stats-use-case.js';
import { GetProfileUseCase } from '../../application/use-cases/profiles/get-profile-use-case.js';
import { UpdateProfileUseCase as ProfileUpdateProfileUseCase } from '../../application/use-cases/profiles/update-profile-use-case.js';
import { RecordLoginUseCase } from '../../application/use-cases/profiles/record-login-use-case.js';
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
  async getUserRepository() {
    if (!this.instances.has('userRepository')) {
      try {
        let db = getDB();
        this.instances.set('userRepository', new UserRepository(db));
      } catch (error) {
        if (error.message === 'Database not initialized. Call connectDB first.') {
          // Initialize database connection if not already done
          await connectDB();
          const db = getDB();
          this.instances.set('userRepository', new UserRepository(db));
        } else {
          throw error;
        }
      }
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

    const licenseRepo = this.instances.get('licenseRepository');
    if (licenseRepo && licenseRepo.setCorrelationId) {
      licenseRepo.setCorrelationId(correlationId);
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

  async getUserProfileRepository() {
    if (!this.instances.has('userProfileRepository')) {
      try {
        let db = getDB();
        this.instances.set('userProfileRepository', new UserProfileRepository(db));
      } catch (error) {
        if (error.message === 'Database not initialized. Call connectDB first.') {
          // Initialize database connection if not already done
          await connectDB();
          const db = getDB();
          this.instances.set('userProfileRepository', new UserProfileRepository(db));
        } else {
          throw error;
        }
      }
    }
    return this.instances.get('userProfileRepository');
  }

  async getLicenseRepository() {
    if (!this.instances.has('licenseRepository')) {
      try {
        let db = getDB();
        this.instances.set('licenseRepository', new LicenseRepository(db));
      } catch (error) {
        if (error.message === 'Database not initialized. Call connectDB first.') {
          // Initialize database connection if not already done
          await connectDB();
          const db = getDB();
          this.instances.set('licenseRepository', new LicenseRepository(db));
        } else {
          throw error;
        }
      }
    }
    return this.instances.get('licenseRepository');
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
      try {
        this.instances.set('emailService', new EmailService());
      } catch (error) {
        // In development, allow server to start without email service
        if (process.env.NODE_ENV === 'development') {
          console.warn('Email service not available, creating mock service for development');
          this.instances.set('emailService', {
            sendEmail: async () => ({ success: false, message: 'Email service not configured' }),
            sendTemplatedEmail: async () => ({
              success: false,
              message: 'Email service not configured',
            }),
            correlationId: null,
            setCorrelationId: () => {},
          });
        } else {
          throw error; // Re-throw in production
        }
      }
    }
    return this.instances.get('emailService');
  }

  async getLicenseService() {
    if (!this.instances.has('licenseService')) {
      const licenseRepository = await this.getLicenseRepository();
      const userRepository = await this.getUserRepository();
      this.instances.set('licenseService', new LicenseService(licenseRepository, userRepository));
    }
    return this.instances.get('licenseService');
  }

  // Use cases
  async getLoginUseCase() {
    return new LoginUseCase(
      await this.getUserRepository(),
      this.getAuthService(),
      this.getTokenService()
    );
  }

  async getRefreshTokenUseCase() {
    return new RefreshTokenUseCase(await this.getUserRepository(), this.getTokenService());
  }

  async getAuthUpdateProfileUseCase() {
    return new AuthUpdateProfileUseCase(
      await this.getUserRepository(),
      await this.getUserProfileRepository()
    );
  }

  async getChangePasswordUseCase() {
    return new ChangePasswordUseCase(
      await this.getUserRepository(),
      this.getAuthService(),
      this.getEmailService()
    );
  }

  async getRequestPasswordResetUseCase() {
    return new RequestPasswordResetUseCase(
      await this.getUserRepository(),
      this.getTokenService(),
      this.getEmailService()
    );
  }

  async getRequestPasswordResetWithGeneratedPasswordUseCase() {
    return new RequestPasswordResetWithGeneratedPasswordUseCase(
      await this.getUserRepository(),
      this.getAuthService(),
      this.getEmailService()
    );
  }

  async getResetPasswordUseCase() {
    return new ResetPasswordUseCase(
      await this.getUserRepository(),
      this.getTokenService(),
      this.getAuthService(),
      this.getEmailService()
    );
  }

  // User use cases
  async getGetUsersUseCase() {
    return new GetUsersUseCase(await this.getUserRepository());
  }

  async getCreateUserUseCase() {
    return new CreateUserUseCase(
      await this.getUserRepository(),
      this.getAuthService(),
      this.getEmailService()
    );
  }

  async getUpdateUserUseCase() {
    return new UpdateUserUseCase(await this.getUserRepository());
  }

  async getDeleteUserUseCase() {
    return new DeleteUserUseCase(await this.getUserRepository());
  }

  async getGetUserStatsUseCase() {
    return new GetUserStatsUseCase(await this.getUserRepository());
  }

  // Profile Use Cases
  async getGetProfileUseCase() {
    return new GetProfileUseCase(await this.getUserProfileRepository());
  }

  async getProfileUpdateProfileUseCase() {
    return new ProfileUpdateProfileUseCase(await this.getUserProfileRepository());
  }

  async getRecordLoginUseCase() {
    return new RecordLoginUseCase(await this.getUserProfileRepository());
  }

  // Controllers
  async getAuthController() {
    return new AuthController(
      await this.getLoginUseCase(),
      await this.getRefreshTokenUseCase(),
      await this.getChangePasswordUseCase(),
      await this.getRequestPasswordResetUseCase(),
      await this.getRequestPasswordResetWithGeneratedPasswordUseCase(),
      await this.getResetPasswordUseCase(),
      this.getTokenService(),
      await this.getUserProfileRepository()
    );
  }

  async getUserController() {
    return new UserController(
      await this.getGetUsersUseCase(),
      await this.getCreateUserUseCase(),
      await this.getUpdateUserUseCase(),
      await this.getDeleteUserUseCase(),
      await this.getGetUserStatsUseCase()
    );
  }

  async getProfileController() {
    return new ProfileController(
      await this.getGetProfileUseCase(),
      await this.getProfileUpdateProfileUseCase(),
      await this.getAuthUpdateProfileUseCase(),
      await this.getRecordLoginUseCase()
    );
  }

  async getLicenseController() {
    if (!this.instances.has('licenseController')) {
      const licenseService = await this.getLicenseService();
      this.instances.set('licenseController', new LicenseController(licenseService));
    }
    return this.instances.get('licenseController');
  }

  // Middleware
  async getAuthMiddleware() {
    if (!this.instances.has('authMiddleware')) {
      this.instances.set(
        'authMiddleware',
        new AuthMiddleware(this.getTokenService(), await this.getUserRepository())
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

  // Reset instances (useful for testing or reconfiguration)
  reset() {
    this.instances.clear();
  }
}

// Export singleton instance
export const awilixContainer = new Container();
