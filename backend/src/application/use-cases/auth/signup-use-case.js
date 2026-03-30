import { UserAuthDto, TokensDto, LoginResponseDto } from '../../dto/auth/index.js';
import {
  ValidationException,
  EmailAlreadyExistsException,
} from '../../../domain/exceptions/domain.exception.js';
import { ROLES } from '../../../shared/constants/roles.js';

/** @typedef {import('../../../domain/repositories/interfaces/i-user-repository.js').IUserRepository} IUserRepository */
/** @typedef {import('../../interfaces/i-auth-service.js').IAuthService} IAuthService */
/** @typedef {import('../../interfaces/i-token-service.js').ITokenService} ITokenService */

const SIGNUP_ROLES = [ROLES.AGENT, ROLES.TECH, ROLES.ACCOUNTANT];

function buildDisplayName(firstName, lastName) {
  return [firstName, lastName].filter(Boolean).join(' ').trim();
}

function sanitizeUsername(value) {
  const normalized = (value || '')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 30);

  if (normalized.length >= 3) {
    return normalized;
  }

  return `${normalized || 'user'}_${Math.random().toString(36).slice(2, 6)}`.slice(0, 30);
}

export class SignupUseCase {
  /**
   * @param {IUserRepository} userRepository
   * @param {IAuthService} authService
   * @param {ITokenService} tokenService
   */
  constructor(userRepository, authService, tokenService) {
    this.userRepository = userRepository;
    this.authService = authService;
    this.tokenService = tokenService;
  }

  async execute({ firstName, lastName, email, password, role, username, phone }) {
    this._validateRole(role);

    const finalEmail = email.trim().toLowerCase();
    const displayName = buildDisplayName(firstName, lastName);
    const selectedRole = role || ROLES.AGENT;

    const existingByEmail = await this.userRepository.findByEmail(finalEmail);
    if (existingByEmail) {
      throw new EmailAlreadyExistsException();
    }

    const finalUsername = await this._buildUniqueUsername(username || finalEmail.split('@')[0]);
    const hashedPassword = await this.authService.hashPassword(password);

    const createdUser = await this.userRepository.save({
      username: finalUsername,
      hashedPassword,
      email: finalEmail,
      displayName,
      role: selectedRole,
      phone: phone || null,
      isActive: true,
      isFirstLogin: false,
      requiresPasswordChange: false,
      langKey: 'en',
      managedBy: null,
      createdBy: null,
    });

    const accessToken = this.tokenService.generateAccessToken({
      userId: createdUser.id,
      email: createdUser.email,
      role: createdUser.role,
      isActive: createdUser.isActive,
      requiresPasswordChange: false,
    });
    const refreshToken = this.tokenService.generateRefreshToken({ userId: createdUser.id });

    const tokenHash = this.tokenService.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.userRepository.storeRefreshToken(createdUser.id, tokenHash, expiresAt);

    return new LoginResponseDto({
      user: UserAuthDto.fromEntity(createdUser),
      tokens: new TokensDto({ accessToken, refreshToken }),
      requiresPasswordChange: false,
    });
  }

  _validateRole(role) {
    if (!role) {
      return;
    }

    if (!SIGNUP_ROLES.includes(role)) {
      throw new ValidationException(`Signup role must be one of: ${SIGNUP_ROLES.join(', ')}`);
    }
  }

  async _buildUniqueUsername(baseUsername) {
    let candidate = sanitizeUsername(baseUsername);
    let attempt = 0;

    while (attempt < 10) {
      const exists = await this.userRepository.findByUsername(candidate);
      if (!exists) {
        return candidate;
      }

      attempt += 1;
      const suffix = Math.random().toString(36).slice(2, 6);
      candidate = sanitizeUsername(`${baseUsername}_${suffix}`);
    }

    throw new ValidationException('Could not generate a unique username');
  }
}

export default SignupUseCase;
