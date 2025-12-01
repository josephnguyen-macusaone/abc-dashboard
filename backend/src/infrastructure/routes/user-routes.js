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
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
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
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - Admin only
   */
  router.get('/stats', userController.getUserStats.bind(userController));

  /**
   * @swagger
   * /users:
   *   post:
   *     summary: Create a new user
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
   *               role:
   *                 type: string
   *                 enum: [admin, manager, staff]
   *                 default: staff
   *     responses:
   *       201:
   *         description: User created successfully
   *       400:
   *         description: Validation error
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - Admin only
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
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   *       404:
   *         description: User not found
   */
  router.get(
    '/:id',
    checkUserAccessPermission('read'),
    userController.getUser.bind(userController)
  );

  /**
   * @swagger
   * /users/{id}:
   *   put:
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
   *       400:
   *         description: Validation error
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   *       404:
   *         description: User not found
   */
  router.put(
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
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   *       404:
   *         description: User not found
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
   *       400:
   *         description: Validation error
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - Admin only
   *       404:
   *         description: User not found
   */
  router.patch(
    '/:id/reassign',
    checkStaffReassignmentPermission,
    userController.reassignStaff.bind(userController)
  );

  return router;
}
