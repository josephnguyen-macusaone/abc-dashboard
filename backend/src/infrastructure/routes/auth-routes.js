import express from 'express';
import { AuthController } from '../controllers/auth-controller.js';
import { validateRequest } from '../middleware/validation-middleware.js';
import { authSchemas } from '../api/v1/schemas/auth.schemas.js';
import { userSchemas } from '../api/v1/schemas/user.schemas.js';
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
  router.post('/register',
    validateRequest(authSchemas.register),
    authController.register.bind(authController)
  );

  /**
   * @swagger
   * /auth/verify-email:
   *   post:
   *     summary: Verify user email with OTP
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *               - token
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *               token:
   *                 type: string
   *                 description: 6-digit verification code
   *     responses:
   *       200:
   *         description: Email verified successfully
   *       400:
   *         description: Invalid token or validation error
   *       404:
   *         description: User not found
   */
  router.post('/verify-email',
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
  router.post('/login',
    validateRequest(authSchemas.login),
    authController.login.bind(authController)
  );

  /**
   * @swagger
   * /auth/status:
   *   get:
   *     summary: Get authentication status
   *     tags: [Authentication]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Status retrieved successfully
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
   *                     isAuthenticated:
   *                       type: boolean
   */
  router.get('/status', optionalAuth, authController.getStatus.bind(authController));

  /**
   * @swagger
   * /auth/profile:
   *   get:
   *     summary: Get user profile
   *     tags: [Authentication]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Profile retrieved successfully
   *       401:
   *         description: Unauthorized
   */
  router.get('/profile', authenticate, authController.getProfile.bind(authController));

  /**
   * @swagger
   * /auth/profile:
   *   put:
   *     summary: Update user profile
   *     tags: [Authentication]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               displayName:
   *                 type: string
   *                 minLength: 1
   *                 maxLength: 100
   *               avatarUrl:
   *                 type: string
   *                 format: uri
   *               avatarId:
   *                 type: string
   *               bio:
   *                 type: string
   *                 maxLength: 500
   *               phone:
   *                 type: string
   *                 pattern: '^[\+]?[1-9][\d]{0,15}$'
   *     responses:
   *       200:
   *         description: Profile updated successfully
   *       400:
   *         description: Validation error
   *       401:
   *         description: Unauthorized
   */
  router.put('/profile',
    authenticate,
    validateRequest(userSchemas.updateProfile),
    authController.updateProfile.bind(authController)
  );

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
  router.post('/change-password',
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
  router.post('/refresh',
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

  return router;
}
