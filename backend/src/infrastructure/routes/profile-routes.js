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
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: string
   *                       description: Profile ID
   *                     userId:
   *                       type: string
   *                       description: User ID
   *                     bio:
   *                       type: string
   *                       nullable: true
   *                       description: User biography
   *                     emailVerified:
   *                       type: boolean
   *                       description: Email verification status
   *                     lastLoginAt:
   *                       type: string
   *                       format: date-time
   *                       nullable: true
   *                     lastActivityAt:
   *                       type: string
   *                       format: date-time
   *                       nullable: true
   */
  router.get('/profile', (req, res) => profileController.getProfile(req, res));

  /**
   * @swagger
   * /profile:
   *   put:
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
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   description: Updated profile data
   */
  router.put('/profile', validateRequest(profileSchemas.updateProfile), (req, res) =>
    profileController.updateProfile(req, res)
  );


  return router;
}
