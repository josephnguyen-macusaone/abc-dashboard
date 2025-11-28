import express from 'express';
import { validateRequest } from '../middleware/validation-middleware.js';
import { authSchemas } from '../api/v1/schemas/auth.schemas.js';
import { optionalAuth, authenticate } from '../middleware/auth-middleware.js';

/**
 * Auth Routes
 * Defines routes for authentication operations
 */
export function createAuthRoutes(authController) {
  const router = express.Router();

  /**
   * @swagger
   * /auth/register:
   *   post:
   *     summary: Register a new user
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
   *               - firstName
   *               - lastName
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *               password:
   *                 type: string
   *                 minLength: 8
   *               firstName:
   *                 type: string
   *               lastName:
   *                 type: string
   *               username:
   *                 type: string
   *                 description: Optional username. If not provided, will be auto-generated.
   *               role:
   *                 type: string
   *                 enum: [admin, manager, staff]
   *                 default: staff
   *     responses:
   *       201:
   *         description: User registered successfully
   *       400:
   *         description: Validation error
   */
  router.post(
    '/register',
    validateRequest(authSchemas.register),
    authController.register.bind(authController)
  );

  /**
   * @swagger
   * /auth/verify-email:
   *   post:
   *     summary: Verify or confirm email verification
   *     description: |
   *       Handles both registration email verification and authenticated user email confirmation.
   *
   *       **Registration Flow**: Provide `token` to verify email and activate new account.
   *       **Confirmation Flow**: Provide `action: "confirm"` to mark authenticated user's email as verified.
   *     tags: [Authentication]
   *     security:
   *       - bearerAuth: []  # Optional - only required for confirmation flow
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             oneOf:
   *               - type: object
   *                 required:
   *                   - token
   *                 properties:
   *                   token:
   *                     type: string
   *                     description: Email verification token from registration email
   *               - type: object
   *                 required:
   *                   - action
   *                 properties:
   *                   action:
   *                     type: string
   *                     enum: [confirm]
   *                     description: Action to perform (currently only 'confirm' supported)
   *     responses:
   *       200:
   *         description: Email verified successfully
   *       400:
   *         description: Invalid token, missing action, or validation error
   *       401:
   *         description: Authentication required for confirmation action
   *       404:
   *         description: User not found
   */
  router.post(
    '/verify-email',
    validateRequest(authSchemas.verifyEmail),
    authController.verifyEmail.bind(authController)
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
