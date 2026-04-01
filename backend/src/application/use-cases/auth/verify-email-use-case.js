import { UserAuthDto } from '../../dto/auth/user-auth.dto.js';
import {
  InvalidTokenException,
  TokenExpiredException,
  ResourceNotFoundException,
  BusinessRuleViolationException,
} from '../../../domain/exceptions/domain.exception.js';

/** @typedef {import('../../../domain/repositories/interfaces/i-user-repository.js').IUserRepository} IUserRepository */
/** @typedef {import('../../interfaces/i-token-service.js').ITokenService} ITokenService */

export class VerifyEmailUseCase {
  /**
   * @param {IUserRepository} userRepository
   * @param {ITokenService} tokenService
   */
  constructor(userRepository, tokenService) {
    this.userRepository = userRepository;
    this.tokenService = tokenService;
  }

  async execute({ token }) {
    let payload;
    try {
      payload = this.tokenService.verifyEmailVerificationToken(token);
    } catch (error) {
      if (error.message.includes('expired')) {
        throw new TokenExpiredException('Verification link has expired. Please sign up again or request a new link.');
      }
      throw new InvalidTokenException('Invalid verification link.');
    }

    if (payload.type !== 'email_verification') {
      throw new InvalidTokenException('Invalid verification token type.');
    }

    const user = await this.userRepository.findById(payload.userId);
    if (!user) {
      throw new ResourceNotFoundException('User', payload.userId);
    }

    if (user.email !== payload.email) {
      throw new InvalidTokenException('Verification token does not match account.');
    }

    if (user.isActive && user.emailVerified) {
      throw new BusinessRuleViolationException('Email address is already verified.');
    }

    const activatedUser = await this.userRepository.updateEmailVerification(user.id);

    return {
      user: UserAuthDto.fromEntity(activatedUser),
      message: 'Email verified successfully. You can now log in.',
    };
  }
}

export default VerifyEmailUseCase;
