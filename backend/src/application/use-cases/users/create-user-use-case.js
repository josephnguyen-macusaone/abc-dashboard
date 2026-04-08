/**
 * Create User Use Case
 * Handles user creation by authorized users with an operator-set password (no welcome email).
 */
import logger from '../../../shared/utils/logger.js';
import { ROLES } from '../../../shared/constants/roles.js';
import { UserResponseDto } from '../../dto/user/index.js';
import {
  ValidationException,
  EmailAlreadyExistsException,
  ResourceNotFoundException,
} from '../../../domain/exceptions/domain.exception.js';
import { autoAssignLicensesForUser } from '../licenses/auto-assign-licenses-for-user.js';

/** @typedef {import('../../../domain/repositories/interfaces/i-user-repository.js').IUserRepository} IUserRepository */
/** @typedef {import('../../interfaces/i-auth-service.js').IAuthService} IAuthService */
/** @typedef {import('../../../domain/repositories/interfaces/i-license-repository.js').ILicenseRepository} ILicenseRepository */

export class CreateUserUseCase {
  /**
   * @param {IUserRepository} userRepository
   * @param {IAuthService} authService
   * @param {ILicenseRepository} licenseRepository
   */
  constructor(userRepository, authService, licenseRepository) {
    this.userRepository = userRepository;
    this.authService = authService;
    this.licenseRepository = licenseRepository;
  }

  /**
   * Execute create user use case
   * @param {CreateUserRequestDto} createUserRequest - Validated request data
   * @param {Object} creatorUser - User who is creating this account
   * @returns {Promise<Object>} Created user data
   */
  async execute(createUserRequest, creatorUser) {
    try {
      const { username, email, displayName, role, password } = createUserRequest;

      this._validateRequiredFields(username, email, displayName, password);
      await this._checkUniqueness(email, username);

      // Plain password only exists on the wire (TLS) and in memory here; persistence is bcrypt only.
      const hashedPassword = await this.authService.hashPassword(password);
      const userRole = this._resolveRole(role, creatorUser, username, email);

      const user = await this._saveUser(createUserRequest, hashedPassword, userRole, creatorUser);

      this._logCreation(creatorUser, user);

      await autoAssignLicensesForUser(this.licenseRepository, user, 'create_user');

      return this._buildResponse(user);
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

  _validateRequiredFields(username, email, displayName, password) {
    if (!username || !email || !displayName || !password) {
      logger.error('Missing required fields', {
        username,
        email,
        displayName,
        hasPassword: !!password,
      });
      throw new ValidationException('Username, email, display name, and password are required');
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
      logger.warn('No role provided in user creation, defaulting to agent', {
        username,
        email,
        creatorUserId: creatorUser.id,
        creatorUserRole: creatorUser.role,
      });
      return ROLES.AGENT;
    }
    if (!validRoles.includes(role)) {
      throw new ValidationException(
        `Invalid role '${role}'. Must be one of: ${validRoles.join(', ')}`
      );
    }
    return role;
  }

  async _saveUser(createUserRequest, hashedPassword, userRole, creatorUser) {
    // Deliberately omit `password` from createUserRequest — never write plaintext to the DB.
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
      emailVerified: true,
      isFirstLogin: false,
      requiresPasswordChange: false,
      langKey: 'en',
      managedBy,
      createdBy: createdBy || creatorUser.id,
    });
  }

  _logCreation(creatorUser, user) {
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
    });
  }

  _buildResponse(user) {
    return {
      user: UserResponseDto.fromEntity(user),
      message: 'User created successfully.',
      emailSent: false,
    };
  }
}
