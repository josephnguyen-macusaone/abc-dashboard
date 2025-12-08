import express from 'express';
import { validateRequest } from '../middleware/validation-middleware.js';
import { authSchemas } from '../api/v1/schemas/auth.schemas.js';
import { optionalAuth, authenticate } from '../middleware/auth-middleware.js';
import { accountLockout, createRateLimit } from '../api/v1/middleware/security.middleware.js';

/**
 * Auth Routes
 * Defines routes for authentication operations
 */
export function createAuthRoutes(authController) {
  const router = express.Router();

  const loginLimiter = createRateLimit(
    15 * 60 * 1000,
    30,
    'Too many login attempts, please try again later.'
  );

  const refreshLimiter = createRateLimit(
    15 * 60 * 1000,
    60,
    'Too many refresh attempts, please try again later.'
  );

  /**
   * @swagger
   * /auth/login:
   *   post:
   *     summary: Login user
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *               - password
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *               password:
   *                 type: string
   *     responses:
   *       200:
   *         description: Login successful
   *       401:
   *         description: Invalid credentials
   */
  router.post(
    '/login',
    loginLimiter,
    accountLockout,
    validateRequest(authSchemas.login),
    authController.login.bind(authController)
  );

  /**
   * @swagger
   * /auth/profile:
   *   get:
   *     summary: Get user profile and authentication status
   *     description: Returns user profile if authenticated, or isAuthenticated=false if not. Works with or without a token.
   *     tags: [Authentication]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Profile/status retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     user:
   *                       type: object
   *                       nullable: true
   *                       description: User profile data if authenticated, null otherwise
   *                     isAuthenticated:
   *                       type: boolean
   *                       description: Whether the user is authenticated
   */
  router.get('/profile', optionalAuth, authController.getProfile.bind(authController));

  /**
   * @swagger
   * /auth/change-password:
   *   post:
   *     summary: Change user password
   *     tags: [Authentication]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - currentPassword
   *               - newPassword
   *             properties:
   *               currentPassword:
   *                 type: string
   *                 description: Current password for verification
   *               newPassword:
   *                 type: string
   *                 minLength: 8
   *                 description: New password (must meet strength requirements)
   *     responses:
   *       200:
   *         description: Password changed successfully
   *       400:
   *         description: Validation error or weak password
   *       401:
   *         description: Unauthorized or incorrect current password
   */
  router.post(
    '/change-password',
    authenticate,
    validateRequest(authSchemas.changePassword),
    authController.changePassword.bind(authController)
  );

  /**
   * @swagger
   * /auth/logout:
   *   post:
   *     summary: Logout user
   *     tags: [Authentication]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Logout successful
   */
  /**
   * @swagger
   * /auth/refresh:
   *   post:
   *     summary: Refresh access token using refresh token
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - refreshToken
   *             properties:
   *               refreshToken:
   *                 type: string
   *     responses:
   *       200:
   *         description: Token refreshed successfully
   *       401:
   *         description: Invalid or expired refresh token
   */
  router.post(
    '/refresh',
    refreshLimiter,
    validateRequest(authSchemas.refreshToken),
    authController.refreshToken.bind(authController)
  );

  /**
   * @swagger
   * /auth/logout:
   *   post:
   *     summary: Logout user
   *     tags: [Authentication]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Logout successful
   */
  router.post('/logout', authenticate, authController.logout.bind(authController));

  /**
   * @swagger
   * /auth/forgot-password:
   *   post:
   *     summary: Request password reset
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *                 description: User email address
   *     responses:
   *       200:
   *         description: Password reset email sent if account exists
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Password reset email sent if account exists"
   */
  router.post(
    '/forgot-password',
    validateRequest(authSchemas.requestPasswordReset),
    authController.requestPasswordReset.bind(authController)
  );

  /**
   * @swagger
   * /auth/forgot-password-generated:
   *   post:
   *     summary: Request password reset with generated temporary password
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *                 description: User email address
   *     responses:
   *       200:
   *         description: Temporary password sent via email if account exists
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Password reset email sent if account exists"
   */
  router.post(
    '/forgot-password-generated',
    validateRequest(authSchemas.requestPasswordReset),
    authController.requestPasswordResetWithGeneratedPassword.bind(authController)
  );

  /**
   * @swagger
   * /auth/reset-password:
   *   post:
   *     summary: Reset password with token
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - token
   *               - newPassword
   *             properties:
   *               token:
   *                 type: string
   *                 description: Password reset token from email
   *               newPassword:
   *                 type: string
   *                 minLength: 8
   *                 description: New password
   *     responses:
   *       200:
   *         description: Password reset successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Password reset successfully"
   *                 data:
   *                   type: object
   *                   description: Updated user information
   *       400:
   *         description: Invalid or expired token, or validation error
   */
  router.post(
    '/reset-password',
    validateRequest(authSchemas.resetPassword),
    authController.resetPassword.bind(authController)
  );

  return router;
}
