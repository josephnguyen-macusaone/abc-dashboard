import { UserRepository } from '../../infrastructure/repositories/user-repository.js';
import { UserProfileRepository } from '../../infrastructure/repositories/user-profile-repository.js';
import { LicenseRepository } from '../../infrastructure/repositories/license-repository.js';
import { ExternalLicenseRepository } from '../../infrastructure/repositories/external-license-repository.js';
import connectDB, { getDB } from '../../infrastructure/config/database.js';
import logger from '../utils/logger.js';
import { AuthController } from '../../infrastructure/controllers/auth-controller.js';
import { UserController } from '../../infrastructure/controllers/user-controller.js';
import { ProfileController } from '../../infrastructure/controllers/profile-controller.js';
import { LicenseController } from '../../infrastructure/controllers/license-controller.js';
import { LicenseLifecycleController } from '../../infrastructure/controllers/license-lifecycle-controller.js';
import { ExternalLicenseController } from '../../infrastructure/controllers/external-license-controller.js';
import { LicenseService } from '../services/license-service.js';
import { LicenseLifecycleService } from '../../infrastructure/services/license-lifecycle-service.js';
import { LicenseNotificationService } from '../../infrastructure/services/license-notification-service.js';
import { LicenseLifecycleScheduler } from '../../infrastructure/jobs/license-lifecycle-scheduler.js';
import { LicenseSyncScheduler } from '../../infrastructure/jobs/license-sync-scheduler.js';
import { LicenseRealtimeService } from '../../infrastructure/realtime/license-realtime-service.js';
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
import { GetProfileUseCase } from '../../application/use-cases/profiles/get-profile-use-case.js';
import { UpdateProfileUseCase as ProfileUpdateProfileUseCase } from '../../application/use-cases/profiles/update-profile-use-case.js';
import { RecordLoginUseCase } from '../../application/use-cases/profiles/record-login-use-case.js';
import { SyncExternalLicensesUseCase } from '../../application/use-cases/external-licenses/sync-external-licenses-use-case.js';
import { ManageExternalLicensesUseCase } from '../../application/use-cases/external-licenses/manage-external-licenses-use-case.js';
import { RenewLicenseUseCase } from '../../application/use-cases/licenses/renew-license-use-case.js';
import { ExpireLicenseUseCase } from '../../application/use-cases/licenses/expire-license-use-case.js';
import { AuthService } from '../services/auth-service.js';
import { TokenService } from '../services/token-service.js';
import { EmailService } from '../services/email-service.js';
import { ExternalLicenseApiService } from '../services/external-license-api-service.js';
import { AuthMiddleware } from '../../infrastructure/middleware/auth-middleware.js';

/**
 * Dependency Injection Container
 *
 * Two helpers collapse the repetitive boilerplate:
 *   _singleton(key, factory)       – synchronous singleton
 *   _asyncSingleton(key, factory)  – async singleton (awaits DB / external init)
 *
 * setCorrelationId is kept but its concurrency hazard is noted in MASTER-PLAN.md;
 * the full AsyncLocalStorage migration is tracked as Phase 4.2.
 */
class Container {
  constructor() {
    this.instances = new Map();
  }

  /** Return cached instance or call sync factory once. */
  _singleton(key, factory) {
    if (!this.instances.has(key)) {
      this.instances.set(key, factory());
    }
    return this.instances.get(key);
  }

  /** Return cached instance or call async factory once. */
  async _asyncSingleton(key, factory) {
    if (!this.instances.has(key)) {
      this.instances.set(key, await factory());
    }
    return this.instances.get(key);
  }

  /** Resolve the Knex DB handle, initialising the connection if needed. */
  async _db() {
    try {
      return getDB();
    } catch (err) {
      if (err.message === 'Database not initialized. Call connectDB first.') {
        await connectDB();
        return getDB();
      }
      throw err;
    }
  }

  // ── Set correlation ID on all live singletons ────────────────────────────
  setCorrelationId(correlationId) {
    const set = (key, prop = null) => {
      const inst = this.instances.get(key);
      if (!inst) {
        return;
      }
      if (prop) {
        inst[prop] = correlationId;
      } else if (typeof inst.setCorrelationId === 'function') {
        inst.setCorrelationId(correlationId);
      }
    };

    set('userRepository');
    set('userProfileRepository');
    set('licenseRepository');
    set('externalLicenseRepository');
    set('authService', 'correlationId');
    set('tokenService', 'correlationId');
    set('emailService', 'correlationId');
    set('externalLicenseApiService');
    set('authMiddleware');
  }

  // ── Repositories ─────────────────────────────────────────────────────────

  getUserRepository() {
    return this._asyncSingleton('userRepository', async () => new UserRepository(await this._db()));
  }

  getUserProfileRepository() {
    return this._asyncSingleton(
      'userProfileRepository',
      async () => new UserProfileRepository(await this._db())
    );
  }

  getLicenseRepository() {
    return this._asyncSingleton(
      'licenseRepository',
      async () => new LicenseRepository(await this._db())
    );
  }

  getExternalLicenseRepository() {
    return this._asyncSingleton(
      'externalLicenseRepository',
      async () => new ExternalLicenseRepository(await this._db())
    );
  }

  // ── Services ─────────────────────────────────────────────────────────────

  getAuthService() {
    return this._singleton('authService', () => new AuthService());
  }

  getTokenService() {
    return this._singleton('tokenService', () => new TokenService());
  }

  getEmailService() {
    return this._singleton('emailService', () => {
      try {
        return new EmailService();
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          logger.warn('Email service not available, creating mock service for development');
          return {
            sendEmail: async () => ({ success: false, message: 'Email service not configured' }),
            sendTemplatedEmail: async () => ({
              success: false,
              message: 'Email service not configured',
            }),
            correlationId: null,
            setCorrelationId: () => {},
          };
        }
        throw error;
      }
    });
  }

  getExternalLicenseApiService() {
    return this._singleton('externalLicenseApiService', () => new ExternalLicenseApiService());
  }

  getLicenseService() {
    return this._asyncSingleton(
      'licenseService',
      async () =>
        new LicenseService(
          await this.getLicenseRepository(),
          await this.getUserRepository(),
          await this.getExternalLicenseRepository()
        )
    );
  }

  getLicenseLifecycleService() {
    return this._asyncSingleton(
      'licenseLifecycleService',
      async () =>
        new LicenseLifecycleService(
          await this.getLicenseRepository(),
          await this.getLicenseNotificationService()
        )
    );
  }

  getLicenseNotificationService() {
    return this._asyncSingleton(
      'licenseNotificationService',
      async () => new LicenseNotificationService()
    );
  }

  getLicenseRealtimeService() {
    return this._singleton('licenseRealtimeService', () => new LicenseRealtimeService());
  }

  // ── Schedulers ───────────────────────────────────────────────────────────

  getLicenseLifecycleScheduler() {
    return this._asyncSingleton(
      'licenseLifecycleScheduler',
      async () => new LicenseLifecycleScheduler(await this.getLicenseLifecycleService())
    );
  }

  getLicenseSyncScheduler() {
    return this._asyncSingleton('licenseSyncScheduler', async () => {
      const syncUseCase = await this.getSyncExternalLicensesUseCase();
      const realtimeService = this.getLicenseRealtimeService();
      const cfg = {
        enabled: process.env.LICENSE_SYNC_ENABLED !== 'false',
        syncSchedule: process.env.LICENSE_SYNC_SCHEDULE || '0 2,3 * * *',
        timezone: process.env.LICENSE_SYNC_TIMEZONE || 'America/Chicago',
      };
      return new LicenseSyncScheduler(syncUseCase, cfg, realtimeService);
    });
  }

  // ── Use cases (transient — new instance per call unless noted) ───────────

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

  async getGetProfileUseCase() {
    return new GetProfileUseCase(await this.getUserProfileRepository());
  }

  async getProfileUpdateProfileUseCase() {
    return new ProfileUpdateProfileUseCase(await this.getUserProfileRepository());
  }

  async getRecordLoginUseCase() {
    return new RecordLoginUseCase(await this.getUserProfileRepository());
  }

  getSyncExternalLicensesUseCase() {
    return this._asyncSingleton(
      'syncExternalLicensesUseCase',
      async () =>
        new SyncExternalLicensesUseCase(
          await this.getExternalLicenseRepository(),
          this.getExternalLicenseApiService(),
          await this.getLicenseRepository()
        )
    );
  }

  getManageExternalLicensesUseCase() {
    return this._asyncSingleton(
      'manageExternalLicensesUseCase',
      async () => new ManageExternalLicensesUseCase(await this.getExternalLicenseRepository())
    );
  }

  getRenewLicenseUseCase() {
    return this._asyncSingleton(
      'renewLicenseUseCase',
      async () =>
        new RenewLicenseUseCase(
          await this.getLicenseRepository(),
          await this.getLicenseLifecycleService()
        )
    );
  }

  getExpireLicenseUseCase() {
    return this._asyncSingleton(
      'expireLicenseUseCase',
      async () =>
        new ExpireLicenseUseCase(
          await this.getLicenseRepository(),
          await this.getLicenseLifecycleService()
        )
    );
  }

  // ── Controllers ──────────────────────────────────────────────────────────

  async getAuthController() {
    return new AuthController(
      await this.getLoginUseCase(),
      await this.getRefreshTokenUseCase(),
      await this.getChangePasswordUseCase(),
      await this.getRequestPasswordResetUseCase(),
      await this.getRequestPasswordResetWithGeneratedPasswordUseCase(),
      await this.getResetPasswordUseCase(),
      this.getTokenService(),
      await this.getUserProfileRepository(),
      await this.getUserRepository()
    );
  }

  async getUserController() {
    return new UserController(
      await this.getGetUsersUseCase(),
      await this.getCreateUserUseCase(),
      await this.getUpdateUserUseCase(),
      await this.getDeleteUserUseCase(),
      await this.getUserRepository()
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

  getLicenseController() {
    return this._asyncSingleton('licenseController', async () => {
      logger.info('Container: Creating license controller');
      return new LicenseController(
        await this.getLicenseService(),
        await this.getLicenseSyncScheduler(),
        this.getLicenseRealtimeService()
      );
    });
  }

  getLicenseLifecycleController() {
    return this._asyncSingleton('licenseLifecycleController', async () => {
      logger.info('Container: Creating license lifecycle controller');
      const ctrl = new LicenseLifecycleController(
        await this.getLicenseLifecycleService(),
        await this.getRenewLicenseUseCase(),
        await this.getExpireLicenseUseCase(),
        await this.getLicenseRepository()
      );
      logger.info('Container: License lifecycle controller created successfully');
      return ctrl;
    });
  }

  getExternalLicenseController() {
    return this._asyncSingleton(
      'externalLicenseController',
      async () =>
        new ExternalLicenseController(
          await this.getSyncExternalLicensesUseCase(),
          await this.getManageExternalLicensesUseCase()
        )
    );
  }

  // ── Middleware ────────────────────────────────────────────────────────────

  getAuthMiddleware() {
    return this._asyncSingleton(
      'authMiddleware',
      async () => new AuthMiddleware(this.getTokenService(), await this.getUserRepository())
    );
  }

  // ── Utilities ─────────────────────────────────────────────────────────────

  reset() {
    this.instances.clear();
  }
}

export const awilixContainer = new Container();
