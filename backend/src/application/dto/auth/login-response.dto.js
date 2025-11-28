/**
 * Login Response DTO
 * Represents the response data for a successful login
 */
import { BaseDto } from '../common/base.dto.js';
import { UserAuthDto } from './user-auth.dto.js';
import { TokensDto } from './tokens.dto.js';

export class LoginResponseDto extends BaseDto {
  constructor({ user, tokens, requiresPasswordChange = false }) {
    super();
    this.user = user instanceof UserAuthDto ? user : new UserAuthDto(user);
    this.tokens = tokens instanceof TokensDto ? tokens : new TokensDto(tokens);
    this.requiresPasswordChange = requiresPasswordChange;
  }

  /**
   * Create from use case result
   * @param {Object} result - Login use case result
   * @returns {LoginResponseDto}
   */
  static fromUseCase(result) {
    return new LoginResponseDto({
      user: UserAuthDto.fromEntity(result.user),
      tokens: TokensDto.fromTokens(result.tokens),
      requiresPasswordChange: result.requiresPasswordChange || false,
    });
  }
}

export default LoginResponseDto;
