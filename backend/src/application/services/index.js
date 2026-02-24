/**
 * Application Services
 * Re-exports services from shared layer for proper architectural layering
 *
 * Note: Services are implemented in shared/services/ but exposed through
 * application/services/ for proper Clean Architecture layer access.
 *
 * Use cases and controllers should import from this file:
 * import { AuthService, TokenService, EmailService } from '../services/index.js';
 */

// Re-export services from shared layer
export { AuthService } from '../../shared/services/auth-service.js';
export { TokenService } from '../../shared/services/token-service.js';
export { EmailService } from '../../shared/services/email-service.js';
export { LicenseService } from '../../shared/services/license-service.js';

// Export interfaces for dependency injection
export { IAuthService } from '../interfaces/i-auth-service.js';
export { ITokenService } from '../interfaces/i-token-service.js';
export { IEmailService } from '../interfaces/i-email-service.js';
export { ILicenseService } from '../interfaces/i-license-service.js';
