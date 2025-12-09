import express from 'express';
import { validateRequest, validateQuery } from '../middleware/validation-middleware.js';
import { userSchemas } from '../api/v1/schemas/user.schemas.js';
import { authenticate, authorizeSelf, authorize } from '../middleware/auth-middleware.js';
import { PERMISSIONS } from '../../shared/constants/roles.js';
import {
  checkUserCreationPermission,
  checkUserAccessPermission,
  checkStaffReassignmentPermission,
} from '../middleware/user-management.middleware.js';

/**
 * User Routes
 * Defines routes for user management operations
 */
export function createUserRoutes(userController) {
  const router = express.Router();

  // All routes require authentication
  router.use(authenticate);

  /**
   * @swagger
   * /users:
   *   get:
   *     summary: Get users with pagination and filtering
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 10
   *       - in: query
   *         name: email
   *         schema:
   *           type: string
   *       - in: query
   *         name: role
   *         schema:
   *           type: string
   *           enum: [admin, manager, staff]
   *       - in: query
   *         name: isActive
   *         schema:
   *           type: boolean
   *     responses:
   *       200:
   *         description: Users retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/UserListResponse'
   *       401:
   *         description: Unauthorized
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       403:
   *         description: Forbidden
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.get(
    '/',
    checkUserAccessPermission('list'),
    validateQuery(userSchemas.getUsers),
    userController.getUsers.bind(userController)
  );

  /**
   * @swagger
   * /users/stats:
   *   get:
   *     summary: Get user statistics
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Statistics retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               allOf:
   *                 - $ref: '#/components/schemas/BaseResponse'
   *                 - type: object
   *                   properties:
   *                     data:
   *                       type: object
   *                       additionalProperties: true
   *       401:
   *         description: Unauthorized
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       403:
   *         description: Forbidden - Admin only
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.get('/stats', userController.getUserStats.bind(userController));

  /**
   * @swagger
   * /users:
   *   post:
   *     summary: Create a new user
   *     description: |
   *       Create a new user account with required username, email, firstName, and lastName.
   *       DisplayName will be auto-generated from firstName + lastName.
   *       Role defaults to 'staff' if not specified.
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - username
   *               - email
   *               - firstName
   *               - lastName
   *             properties:
   *               username:
   *                 type: string
   *                 minLength: 3
   *                 maxLength: 30
   *                 pattern: '^[a-zA-Z0-9_]+$'
   *                 description: Required username
   *                 example: "johndoe"
   *               email:
   *                 type: string
   *                 format: email
   *                 description: User's email address
   *                 example: "john.doe@example.com"
   *               firstName:
   *                 type: string
   *                 minLength: 1
   *                 maxLength: 50
   *                 description: Required first name
   *                 example: "John"
   *               lastName:
   *                 type: string
   *                 minLength: 1
   *                 maxLength: 50
   *                 description: Required last name
   *                 example: "Doe"
   *               displayName:
   *                 type: string
   *                 minLength: 1
   *                 maxLength: 100
   *                 description: Optional display name. Auto-generated from firstName + lastName if not provided
   *                 example: "John Doe"
   *               role:
   *                 type: string
   *                 enum: [admin, manager, staff]
   *                 default: staff
   *                 description: User role. Defaults to 'staff'
   *                 example: "admin"
   *               avatarUrl:
   *                 type: string
   *                 format: uri
   *                 description: Optional avatar URL
   *               phone:
   *                 type: string
   *                 pattern: '^[+]?[1-9][\d]{0,15}$'
   *                 description: Optional phone number
   *               managerId:
   *                 type: string
   *                 description: Optional manager ID for staff assignments
   *     responses:
   *       201:
   *         description: User created successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/UserResponse'
   *       400:
   *         description: Validation error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       401:
   *         description: Unauthorized - Authentication required
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       403:
   *         description: Forbidden - Insufficient permissions to create users with specified role
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.post(
    '/',
    checkUserCreationPermission(),
    validateRequest(userSchemas.createUser),
    userController.createUser.bind(userController)
  );

  /**
   * @swagger
   * /users/{id}:
   *   get:
   *     summary: Get user by ID
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: User retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/UserResponse'
   *       401:
   *         description: Unauthorized
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       403:
   *         description: Forbidden
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       404:
   *         description: User not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.get(
    '/:id',
    checkUserAccessPermission('read'),
    userController.getUser.bind(userController)
  );

  /**
   * @swagger
   * /users/{id}:
   *   patch:
   *     summary: Update user by ID
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               firstName:
   *                 type: string
   *               lastName:
   *                 type: string
   *               role:
   *                 type: string
   *                 enum: [admin, manager, staff]
   *               isActive:
   *                 type: boolean
   *     responses:
   *       200:
   *         description: User updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/UserResponse'
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
   *       403:
   *         description: Forbidden
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       404:
   *         description: User not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.patch(
    '/:id',
    checkUserAccessPermission('update'),
    validateRequest(userSchemas.updateUser),
    userController.updateUser.bind(userController)
  );

  /**
   * @swagger
   * /users/{id}:
   *   delete:
   *     summary: Delete user by ID
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: User deleted successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/MessageResponse'
   *       401:
   *         description: Unauthorized
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       403:
   *         description: Forbidden
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       404:
   *         description: User not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.delete(
    '/:id',
    checkUserAccessPermission('delete'),
    userController.deleteUser.bind(userController)
  );

  /**
   * @swagger
   * /users/{id}/reassign:
   *   patch:
   *     summary: Reassign staff member to different manager
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Staff user ID to reassign
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - newManagerId
   *             properties:
   *               newManagerId:
   *                 type: string
   *                 description: New manager ID to assign the staff member to
   *     responses:
   *       200:
   *         description: Staff member reassigned successfully
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
   *       403:
   *         description: Forbidden - Admin only
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       404:
   *         description: User not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.patch(
    '/:id/reassign',
    checkStaffReassignmentPermission,
    userController.reassignStaff.bind(userController)
  );

  return router;
}
