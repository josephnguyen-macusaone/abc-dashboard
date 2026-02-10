/**
 * Tokens DTO
 * Represents JWT tokens response
 */
import { BaseDto } from '../common/base.dto.js';

export class TokensDto extends BaseDto {
  constructor({ accessToken, refreshToken }) {
    super();
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }

  /**
   * Create from token service result
   * @param {Object} tokens - Token service result
   * @returns {TokensDto}
   */
  static fromTokens(tokens) {
    return new TokensDto({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  }
}

export default TokensDto;
