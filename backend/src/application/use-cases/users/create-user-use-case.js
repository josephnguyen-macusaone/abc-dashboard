/**
 * Create User Use Case
 * Handles user creation by administrators with automatic password generation and email sending
 */
import logger from '../../../shared/utils/logger.js';
import { config } from '../../../infrastructure/config/config.js';
import { generateTemporaryPassword } from '../../../shared/utils/security/crypto.js';
import { ROLES } from '../../../shared/constants/roles.js';
import { UserResponseDto } from '../../dto/user/index.js';
import {
  ValidationException,
  EmailAlreadyExistsException,
  ResourceNotFoundException,
} from '../../../domain/exceptions/domain.exception.js';

/** @typedef {import('../../../domain/repositories/interfaces/i-user-repository.js').IUserRepository} IUserRepository */
/** @typedef {import('../../interfaces/i-auth-service.js').IAuthService} IAuthService */
/** @typedef {import('../../interfaces/i-email-service.js').IEmailService} IEmailService */

export class CreateUserUseCase {
  /**
   * @param {IUserRepository} userRepository
   * @param {IAuthService} authService
   * @param {IEmailService} emailService
   */
  constructor(userRepository, authService, emailService) {
    this.userRepository = userRepository;
    this.authService = authService;
    this.emailService = emailService;
  }

  /**
   * Execute create user use case
   * @param {CreateUserRequestDto} createUserRequest - Validated request data
   * @param {Object} creatorUser - User who is creating this account
   * @returns {Promise<Object>} Created user data
   */
  async execute(createUserRequest, creatorUser) {
    try {
      const { username, email, displayName, role, managedBy } = createUserRequest;

      this._validateRequiredFields(username, email, displayName);
      await this._checkUniqueness(email, username);

      const temporaryPassword = generateTemporaryPassword(12);
      const hashedPassword = await this.authService.hashPassword(temporaryPassword);
      const userRole = this._resolveRole(role, creatorUser, username, email);

      const user = await this._saveUser(createUserRequest, hashedPassword, userRole, creatorUser);
      const managerName = await this._getManagerName(managedBy, user.id);
      const { emailSent, emailError } = await this._sendWelcomeEmail(
        user,
        temporaryPassword,
        managerName
      );

      this._logCreation(creatorUser, user, emailSent, emailError);

      const message = this._buildMessage(emailSent, emailError);
      return this._buildResponse(user, message, emailSent, temporaryPassword);
    } catch (error) {
      if (
        error instanceof ValidationException ||
        error instanceof EmailAlreadyExistsException ||
        error instanceof ResourceNotFoundException
      ) {
        throw error;
      }
      logger.error('User creation infrastructure error:', {
        error: error.message,
        stack: error.stack,
        correlationId: this.correlationId,
      });
      throw new ValidationException(`User creation failed: ${error.message}`);
    }
  }

  _validateRequiredFields(username, email, displayName) {
    if (!username || !email || !displayName) {
      logger.error('Missing required fields', { username, email, displayName });
      throw new ValidationException('Username, email, and display name are required');
    }
  }

  async _checkUniqueness(email, username) {
    logger.info('Checking uniqueness for user creation', { username, email });
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      logger.warn('Email already exists', { email, existingUserId: existingUser.id });
      throw new EmailAlreadyExistsException();
    }
    const existingUsername = await this.userRepository.findByUsername(username);
    if (existingUsername) {
      logger.warn('Username already exists', { username, existingUserId: existingUsername.id });
      throw new ValidationException('Username already taken');
    }
    logger.info('Uniqueness checks passed', { username, email });
  }

  _resolveRole(role, creatorUser, username, email) {
    const validRoles = Object.values(ROLES);
    if (!role) {
      logger.warn('No role provided in user creation, defaulting to staff', {
        username,
        email,
        creatorUserId: creatorUser.id,
        creatorUserRole: creatorUser.role,
      });
      return ROLES.STAFF;
    }
    if (!validRoles.includes(role)) {
      throw new ValidationException(
        `Invalid role '${role}'. Must be one of: ${validRoles.join(', ')}`
      );
    }
    return role;
  }

  async _saveUser(createUserRequest, hashedPassword, userRole, creatorUser) {
    const { username, email, displayName, avatarUrl, phone, managedBy, createdBy } =
      createUserRequest;
    return this.userRepository.save({
      username,
      hashedPassword,
      email,
      displayName,
      role: userRole,
      avatarUrl,
      phone,
      isActive: true,
      isFirstLogin: true,
      requiresPasswordChange: true,
      langKey: 'en',
      managedBy,
      createdBy: createdBy || creatorUser.id,
    });
  }

  async _getManagerName(managedBy, userId) {
    if (!managedBy) {
      return null;
    }
    try {
      const manager = await this.userRepository.findById(managedBy);
      return manager?.displayName ?? null;
    } catch (error) {
      logger.warn('Could not fetch manager information for email', {
        userId,
        managedBy,
        error: error.message,
      });
      return null;
    }
  }

  async _sendWelcomeEmail(user, temporaryPassword, managerName) {
    let emailSent = false;
    let emailError = null;
    try {
      const emailResult = await this.emailService.sendWelcomeWithPassword(user.email, {
        displayName: user.displayName,
        username: user.username,
        email: user.email,
        password: temporaryPassword,
        role: user.role,
        loginUrl: `${config.CLIENT_URL || 'https://portal.abcsalon.us'}/login`,
        managerName,
      });
      emailSent = emailResult && !emailResult.logged;
      if (emailSent) {
        logger.info('Welcome email sent successfully', {
          userId: user.id,
          email: user.email,
          role: user.role,
          managedBy: user.managedBy,
        });
      } else {
        logger.warn('Welcome email queued for later delivery', {
          userId: user.id,
          email: user.email,
          role: user.role,
          managedBy: user.managedBy,
          reason: 'Email service temporarily unavailable',
        });
      }
    } catch (error) {
      emailError = error;
      logger.error('Failed to send welcome email', {
        userId: user.id,
        email: user.email,
        error: error.message,
        stack: error.stack,
      });
    }
    return { emailSent, emailError };
  }

  _logCreation(creatorUser, user, emailSent, emailError) {
    logger.security('USER_CREATED', {
      action: 'create_user',
      actorId: creatorUser.id,
      actorRole: creatorUser.role,
      targetId: user.id,
      targetRole: user.role,
      targetEmail: user.email,
      managedBy: user.managedBy,
      createdAt: new Date().toISOString(),
    });
    logger.info('User created', {
      userId: user.id,
      createdBy: creatorUser.id,
      creatorRole: creatorUser.role,
      email: user.email,
      username: user.username,
      role: user.role,
      managedBy: user.managedBy,
      emailSent,
      emailQueued: !emailSent && !emailError,
    });
  }

  _buildMessage(emailSent, emailError) {
    let message = 'User created successfully.';
    if (emailSent) {
      message += ' Welcome email sent with temporary password.';
    } else if (emailError) {
      message +=
        ' However, the welcome email could not be sent. Please manually provide the user with their temporary password or use the password reset feature.';
    } else {
      message += ' Welcome email has been queued for delivery.';
    }
    return message;
  }

  _buildResponse(user, message, emailSent, temporaryPassword) {
    return {
      user: UserResponseDto.fromEntity(user),
      message,
      emailSent,
      temporaryPassword: process.env.NODE_ENV === 'development' ? temporaryPassword : undefined,
      warning: !emailSent
        ? 'Email service temporarily unavailable. User account created but notification pending.'
        : undefined,
    };
  }
}
