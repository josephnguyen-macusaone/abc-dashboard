/**
 * Auth Controller
 * Handles HTTP requests for authentication
 */
import { BaseController } from './base-controller.js';
import logger from '../../shared/utils/logger.js';
import { AuthValidator } from '../../application/validators/index.js';
import { sendErrorResponse } from '../../shared/http/error-responses.js';
import {
  setTokenCookie,
  setRefreshTokenCookie,
  clearAuthCookies,
  getRefreshTokenFromRequest,
} from '../../shared/http/auth-cookies.js';
import {
  InvalidCredentialsException,
  ValidationException,
  ResourceNotFoundException,
  InvalidRefreshTokenException,
  InvalidTokenException,
  TokenExpiredException,
  BusinessRuleViolationException,
} from '../../domain/exceptions/domain.exception.js';
import { trackFailedLogin, resetFailedAttempts } from '../api/v1/middleware/security.middleware.js';

function setNoCacheHeaders(res) {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    Pragma: 'no-cache',
    Expires: '0',
  });
}

function buildProfileResponseData(user, profile) {
  const userId = user.id || user._id?.toString();
  return {
    user: {
      id: userId,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      avatarUrl: user.avatarUrl || null,
      bio: profile?.bio || null,
      phone: user.phone || null,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    isAuthenticated: true,
  };
}

async function fetchUserProfile(userProfileRepository, user) {
  if (!userProfileRepository) {
    return null;
  }
  try {
    const userId = user.id || user._id?.toString();
    return await userProfileRepository.findByUserId(userId);
  } catch {
    return null;
  }
}

export class AuthController extends BaseController {
  constructor(
    signupUseCase,
    loginUseCase,
    refreshTokenUseCase,
    changePasswordUseCase,
    requestPasswordResetUseCase,
    requestPasswordResetWithGeneratedPasswordUseCase,
    resetPasswordUseCase,
    tokenService,
    userProfileRepository,
    userRepository = null,
    verifyEmailUseCase = null,
    resendVerificationUseCase = null
  ) {
    super();
    this.signupUseCase = signupUseCase;
    this.loginUseCase = loginUseCase;
    this.refreshTokenUseCase = refreshTokenUseCase;
    this.changePasswordUseCase = changePasswordUseCase;
    this.requestPasswordResetUseCase = requestPasswordResetUseCase;
    this.requestPasswordResetWithGeneratedPasswordUseCase =
      requestPasswordResetWithGeneratedPasswordUseCase;
    this.resetPasswordUseCase = resetPasswordUseCase;
    this.tokenService = tokenService;
    this.userProfileRepository = userProfileRepository;
    this.userRepository = userRepository;
    this.verifyEmailUseCase = verifyEmailUseCase;
    this.resendVerificationUseCase = resendVerificationUseCase;
  }

  async signup(req, res) {
    let signupPayload = null;

    try {
      signupPayload = req.body;
      AuthValidator.validateSignup(signupPayload);

      const result = await this.executeUseCase(this.signupUseCase, signupPayload, {
        operation: 'signup',
        email: signupPayload.email,
      });

      return res.created(result, result.message);
    } catch (error) {
      return this.handleError(error, req, res, {
        operation: 'signup',
        requestBody: {
          email: signupPayload?.email || 'undefined',
          role: signupPayload?.role || 'undefined',
          password: '[REDACTED]',
        },
      });
    }
  }

  async verifyEmail(req, res) {
    try {
      const { token } = req.body;

      if (!this.verifyEmailUseCase) {
        return sendErrorResponse(res, 'SERVICE_UNAVAILABLE');
      }

      const result = await this.verifyEmailUseCase.execute({ token });

      return res.success(result, result.message);
    } catch (error) {
      if (
        error instanceof InvalidTokenException ||
        error instanceof TokenExpiredException ||
        error instanceof BusinessRuleViolationException ||
        error instanceof ResourceNotFoundException
      ) {
        return res.status(error.statusCode).json(error.toResponse());
      }

      logger.error('Email verification error:', error);
      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  }

  /**
   * GET /auth/verify-email-redirect?token=...
   * Verifies the email token and redirects the browser directly to the frontend
   * login page — so the email link opens in the same tab without a separate
   * frontend spinner page.
   *
   * Success  → 302 → CLIENT_URL/login?verified=true
   * Already verified → 302 → CLIENT_URL/login?verified=true  (idempotent)
   * Expired token    → 302 → CLIENT_URL/verify-email?error=expired
   * Invalid token    → 302 → CLIENT_URL/verify-email?error=invalid
   */
  async verifyEmailRedirect(req, res) {
    const { token } = req.query;
    const clientUrl = (await import('../../infrastructure/config/config.js')).default.CLIENT_URL;

    const redirectSuccess = () => res.redirect(302, `${clientUrl}/login?verified=true`);
    const redirectError = (type) => res.redirect(302, `${clientUrl}/verify-email?error=${type}`);

    if (!token) {
      return redirectError('invalid');
    }

    try {
      if (!this.verifyEmailUseCase) {
        return redirectError('invalid');
      }

      await this.verifyEmailUseCase.execute({ token });
      return redirectSuccess();
    } catch (error) {
      if (error instanceof TokenExpiredException) {
        return redirectError('expired');
      }
      if (error instanceof InvalidTokenException || error instanceof ResourceNotFoundException) {
        return redirectError('invalid');
      }
      if (error instanceof BusinessRuleViolationException) {
        // Already verified — still a success from the user's perspective.
        return redirectSuccess();
      }

      logger.error('Email verification redirect error:', error);
      return redirectError('invalid');
    }
  }

  async resendVerification(req, res) {
    try {
      const { email } = req.body;

      if (!this.resendVerificationUseCase) {
        return sendErrorResponse(res, 'SERVICE_UNAVAILABLE');
      }

      const result = await this.resendVerificationUseCase.execute({ email });

      return res.success(null, result.message);
    } catch (error) {
      if (error instanceof ValidationException) {
        return res.status(error.statusCode).json(error.toResponse());
      }

      logger.error('Resend verification error:', error);
      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  }

  async login(req, res) {
    let email, password;

    try {
      ({ email, password } = req.body);

      // Use comprehensive AuthValidator for login
      AuthValidator.validateLogin({ email, password });

      const result = await this.executeUseCase(
        this.loginUseCase,
        { email, password },
        { operation: 'login', email }
      );

      await resetFailedAttempts(req);

      // Set HttpOnly cookies for token storage (frontend uses credentials: 'include')
      setTokenCookie(res, result.tokens.accessToken);
      setRefreshTokenCookie(res, result.tokens.refreshToken);

      return res.success(result, 'Login successful');
    } catch (error) {
      if (error instanceof InvalidCredentialsException) {
        await trackFailedLogin(req);
      }

      return this.handleError(error, req, res, {
        operation: 'login',
        requestBody: {
          email: email || 'undefined',
          password: '[REDACTED]',
        },
      });
    }
  }

  async getProfile(req, res) {
    try {
      setNoCacheHeaders(res);

      logger.debug('Get profile request', {
        correlationId: req.correlationId,
        hasUser: !!req.user,
        userId: req.user?.id,
        userRole: req.user?.role,
        userEmail: req.user?.email,
      });

      if (!req.user) {
        logger.warn('Get profile - no user attached', { correlationId: req.correlationId });
        return res.success({ user: null, isAuthenticated: false }, 'Not authenticated');
      }

      const user = req.user;
      if (!user.id && !user._id) {
        logger.warn('Auth controller getProfile - invalid user object', {
          correlationId: req.correlationId,
          hasId: !!user?.id,
          has_id: !!user?._id,
        });
        return sendErrorResponse(res, 'INVALID_TOKEN');
      }

      if (!this.userProfileRepository) {
        return sendErrorResponse(res, 'SERVICE_UNAVAILABLE');
      }

      const profile = await fetchUserProfile(this.userProfileRepository, user);
      const responseData = buildProfileResponseData(user, profile);

      logger.debug('Sending profile response', {
        correlationId: req.correlationId,
        userId: responseData.user.id,
        userRole: responseData.user.role,
        isAuthenticated: responseData.isAuthenticated,
      });

      return res.status(200).json({
        success: true,
        message: 'Profile retrieved successfully',
        timestamp: new Date().toISOString(),
        data: responseData,
      });
    } catch (error) {
      logger.error('Get profile error: Unexpected error', {
        error: error.message,
        userId: req.user?.id || req.user?._id?.toString(),
        correlationId: req.correlationId,
      });
      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  }

  async refreshToken(req, res) {
    try {
      const refreshToken = getRefreshTokenFromRequest(req);

      // Use comprehensive AuthValidator for refresh token
      AuthValidator.validateRefreshToken({ refreshToken });

      const result = await this.refreshTokenUseCase.execute({ refreshToken });

      // Set HttpOnly cookies with new tokens
      setTokenCookie(res, result.tokens.accessToken);
      setRefreshTokenCookie(res, result.tokens.refreshToken);

      return res.success(result, 'Token refreshed successfully');
    } catch (error) {
      // Handle domain exceptions
      if (
        error instanceof InvalidCredentialsException ||
        error instanceof ValidationException ||
        error instanceof InvalidRefreshTokenException
      ) {
        return res.status(error.statusCode).json(error.toResponse());
      }

      // Handle unexpected errors
      logger.error('Refresh token error:', error);
      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  }

  async changePassword(req, res) {
    let userId;
    try {
      if (!req.user) {
        return sendErrorResponse(res, 'TOKEN_MISSING');
      }

      userId = req.user.id || (req.user._id ? req.user._id?.toString() : null);
      if (!userId) {
        return sendErrorResponse(res, 'INVALID_TOKEN');
      }
      const { currentPassword, newPassword } = req.body;

      // Use comprehensive AuthValidator for password change
      AuthValidator.validatePasswordChange({
        currentPassword,
        newPassword,
      });

      const result = await this.changePasswordUseCase.execute(userId, {
        currentPassword,
        newPassword,
      });

      return res.success(result, result.message);
    } catch (error) {
      // Handle domain exceptions
      if (error instanceof ValidationException || error instanceof ResourceNotFoundException) {
        return res.status(error.statusCode).json(error.toResponse());
      }

      // Handle unexpected errors
      logger.error('Password change error:', {
        error: error.message,
        userId: userId || 'undefined',
        correlationId: req.correlationId,
      });
      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  }

  async logout(req, res) {
    try {
      // Revoke the refresh token from the DB store so it cannot be replayed (SEC-4)
      const refreshToken = getRefreshTokenFromRequest(req);
      if (refreshToken && this.tokenService && this.userRepository) {
        try {
          const tokenHash = this.tokenService.hashToken(refreshToken);
          await this.userRepository.revokeRefreshToken(tokenHash);
        } catch (_revokeErr) {
          // Non-fatal — still clear cookies and return success
          logger.warn('Could not revoke refresh token on logout', {
            correlationId: req.correlationId,
          });
        }
      }

      clearAuthCookies(res);

      if (req.user) {
        logger.debug('User logout processed', {
          correlationId: req.correlationId,
          userId: req.user.id || req.user._id?.toString(),
        });
      }

      return res.success(null, 'Logout successful');
    } catch (error) {
      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  }

  async requestPasswordReset(req, res) {
    try {
      const { email } = req.body;

      const result = await this.requestPasswordResetUseCase.execute({ email });

      return res.success(null, result.message);
    } catch (error) {
      // Handle domain exceptions
      if (error instanceof ValidationException) {
        return res.status(error.statusCode).json(error.toResponse());
      }

      // Don't reveal if email exists or not for security
      logger.error('Password reset request failed:', error);
      return res.success(null, 'Password reset email sent if account exists');
    }
  }

  async requestPasswordResetWithGeneratedPassword(req, res) {
    try {
      const { email } = req.body;

      const result = await this.requestPasswordResetWithGeneratedPasswordUseCase.execute({ email });

      return res.success(null, result.message);
    } catch (error) {
      // Handle domain exceptions
      if (error instanceof ValidationException) {
        return res.status(error.statusCode).json(error.toResponse());
      }

      // Don't reveal if email exists or not for security
      logger.error('Password reset with generated password request failed:', error);
      return res.success(null, 'Password reset email sent if account exists');
    }
  }

  async resetPassword(req, res) {
    try {
      const { token, password } = req.body;

      const result = await this.resetPasswordUseCase.execute({
        token,
        newPassword: password,
      });

      return res.success(result.user, result.message);
    } catch (error) {
      // Handle domain exceptions
      if (error instanceof ValidationException || error instanceof ResourceNotFoundException) {
        return res.status(error.statusCode).json(error.toResponse());
      }

      logger.error('Password reset error:', error);
      return sendErrorResponse(res, 'INVALID_RESET_TOKEN');
    }
  }
}
