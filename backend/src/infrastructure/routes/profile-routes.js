import express from 'express';
import { validateRequest } from '../middleware/validation-middleware.js';
import { profileSchemas } from '../api/v1/schemas/profile.schemas.js';
import { authenticate } from '../middleware/auth-middleware.js';

/**
 * Profile Routes
 * Defines routes for user profile management operations
 */
export function createProfileRoutes(profileController) {
  const router = express.Router();

  // All routes require authentication
  router.use(authenticate);

  /**
   * @swagger
   * /profile:
   *   get:
   *     summary: Get current user profile
   *     tags: [Profile]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Profile retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ProfileResponse'
   *       401:
   *         description: Unauthorized
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.get('/profile', (req, res) => profileController.getProfile(req, res));

  /**
   * @swagger
   * /profile:
   *   patch:
   *     summary: Update current user profile
   *     tags: [Profile]
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
   *                 description: User's display name
   *               bio:
   *                 type: string
   *                 maxLength: 500
   *                 description: User biography
   *               phone:
   *                 type: string
   *                 description: User's phone number
   *               avatarUrl:
   *                 type: string
   *                 format: uri
   *                 description: User's avatar URL
   *     responses:
   *       200:
   *         description: Profile updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/MessageResponse'
   *       400:
   *         description: Validation error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       401:
   *         description: Unauthorized
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.patch('/profile', validateRequest(profileSchemas.updateProfile), (req, res) =>
    profileController.updateProfile(req, res)
  );

  return router;
}
