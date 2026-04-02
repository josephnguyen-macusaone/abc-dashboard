/**
 * Resend email verification link for self-signup users who have not verified yet.
 * Same generic HTTP message as forgot-password to avoid email enumeration.
 */
import { ValidationException } from '../../../domain/exceptions/domain.exception.js';
import logger from '../../../shared/utils/logger.js';

/** @typedef {import('../../../domain/repositories/interfaces/i-user-repository.js').IUserRepository} IUserRepository */
/** @typedef {import('../../interfaces/i-token-service.js').ITokenService} ITokenService */
/** @typedef {import('../../../shared/services/email-service.js').EmailService} IEmailService */

const GENERIC_MESSAGE = 'If an account exists and needs email verification, we sent a link.';

export class ResendVerificationUseCase {
  /**
   * @param {IUserRepository} userRepository
   * @param {ITokenService} tokenService
   * @param {IEmailService} emailService
   */
  constructor(userRepository, tokenService, emailService) {
    this.userRepository = userRepository;
    this.tokenService = tokenService;
    this.emailService = emailService;
  }

  async execute({ email }) {
    if (!email || !String(email).trim()) {
      throw new ValidationException('Email is required');
    }

    const normalized = String(email).trim().toLowerCase();
    const user = await this.userRepository.findByEmail(normalized);

    if (!user) {
      logger.info('Resend verification requested for unknown email');
      return { message: GENERIC_MESSAGE };
    }

    if (user.emailVerified) {
      return { message: GENERIC_MESSAGE };
    }

    try {
      const verificationToken = this.tokenService.generateEmailVerificationToken(
        user.id,
        user.email
      );
      await this.emailService.sendEmailVerification(
        user.email,
        user.displayName || user.email.split('@')[0],
        verificationToken
      );
      logger.info('Verification email resent', { userId: user.id });
    } catch (error) {
      logger.error('Failed to resend verification email', {
        userId: user.id,
        error: error.message,
      });
    }

    return { message: GENERIC_MESSAGE };
  }
}

export default ResendVerificationUseCase;
