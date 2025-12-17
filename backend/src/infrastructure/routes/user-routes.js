import express from 'express';
import { validateRequest, validateQuery } from '../middleware/validation-middleware.js';
import { userSchemas } from '../api/v1/schemas/user.schemas.js';
import { authenticate } from '../middleware/auth-middleware.js';
import {
  checkUserCreationPermission,
  checkUserAccessPermission,
  checkStaffReassignmentPermission,
} from '../middleware/user-management.middleware.js';

// Note: Comma-separated query parameter parsing is now handled by Joi schema validation

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
   *     summary: Get users with pagination, filtering, and search
   *     description: |
   *       Retrieve a paginated list of users with support for:
   *       - Multi-field search (email, displayName, username, phone)
   *       - Date range filtering (created, updated, last login)
   *       - Advanced filters (role, status, manager, avatar, bio)
   *       - Sorting by multiple fields
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       # Pagination
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *         description: Page number
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 10
   *         description: Number of items per page
   *
   *       # Multi-field Search
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *           maxLength: 100
   *         description: Search term (searches across email, displayName, username, phone by default)
   *       - in: query
   *         name: searchField
   *         schema:
   *           type: string
   *           enum: [email, displayName, username, phone]
   *         description: Limit search to a specific field
   *
   *       # Individual Field Filters
   *       - in: query
   *         name: email
   *         schema:
   *           type: string
   *         description: Filter by email (partial match)
   *       - in: query
   *         name: username
   *         schema:
   *           type: string
   *         description: Filter by username (partial match)
   *       - in: query
   *         name: displayName
   *         schema:
   *           type: string
   *         description: Filter by display name (partial match)
   *       - in: query
   *         name: phone
   *         schema:
   *           type: string
   *         description: Filter by phone number (partial match)
   *
   *       # Date Range Filters
   *       - in: query
   *         name: createdAtFrom
   *         schema:
   *           type: string
   *           format: date-time
   *         description: Filter users created after this date (ISO 8601 format)
   *       - in: query
   *         name: createdAtTo
   *         schema:
   *           type: string
   *           format: date-time
   *         description: Filter users created before this date (ISO 8601 format)
   *       - in: query
   *         name: updatedAtFrom
   *         schema:
   *           type: string
   *           format: date-time
   *         description: Filter users updated after this date (ISO 8601 format)
   *       - in: query
   *         name: updatedAtTo
   *         schema:
   *           type: string
   *           format: date-time
   *         description: Filter users updated before this date (ISO 8601 format)
   *       - in: query
   *         name: lastLoginFrom
   *         schema:
   *           type: string
   *           format: date-time
   *         description: Filter users who logged in after this date (ISO 8601 format)
   *       - in: query
   *         name: lastLoginTo
   *         schema:
   *           type: string
   *           format: date-time
   *         description: Filter users who logged in before this date (ISO 8601 format)
   *
   *       # Advanced Filters
   *       - in: query
   *         name: role
   *         schema:
   *           type: string
   *           enum: [admin, manager, staff]
   *         description: Filter by user role
   *       - in: query
   *         name: isActive
   *         schema:
   *           type: boolean
   *         description: Filter by active status
   *       - in: query
   *         name: managedBy
   *         schema:
   *           type: string
   *         description: Filter by manager ID (for staff users)
   *
   *       # Sorting
   *       - in: query
   *         name: sortBy
   *         schema:
   *           type: string
   *           enum: [createdAt, updatedAt, email, username, displayName, role, isActive, lastLogin]
   *           default: createdAt
   *         description: Field to sort by
   *       - in: query
   *         name: sortOrder
   *         schema:
   *           type: string
   *           enum: [asc, desc]
   *           default: desc
   *         description: Sort direction
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

  /**
   * @swagger
   * /users/bulk/activate:
   *   post:
   *     summary: Bulk activate users
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
   *               - ids
   *             properties:
   *               ids:
   *                 type: array
   *                 items:
   *                   type: string
   *                 description: Array of user IDs to activate
   *     responses:
   *       200:
   *         description: Users activated successfully
   *         content:
   *           application/json:
   *             schema:
   *               allOf:
   *                 - $ref: '#/components/schemas/BaseResponse'
   *                 - type: object
   *                   properties:
   *                     data:
   *                       type: object
   *                       properties:
   *                         activated:
   *                           type: integer
   *                         failed:
   *                           type: integer
   *                         details:
   *                           type: object
   */
  router.post('/bulk/activate', userController.bulkActivate.bind(userController));

  /**
   * @swagger
   * /users/bulk/deactivate:
   *   post:
   *     summary: Bulk deactivate users
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
   *               - ids
   *             properties:
   *               ids:
   *                 type: array
   *                 items:
   *                   type: string
   *                 description: Array of user IDs to deactivate
   *     responses:
   *       200:
   *         description: Users deactivated successfully
   */
  router.post('/bulk/deactivate', userController.bulkDeactivate.bind(userController));

  /**
   * @swagger
   * /users/bulk/delete:
   *   post:
   *     summary: Bulk delete users
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
   *               - ids
   *             properties:
   *               ids:
   *                 type: array
   *                 items:
   *                   type: string
   *                 description: Array of user IDs to delete
   *     responses:
   *       200:
   *         description: Users deleted successfully
   */
  router.post('/bulk/delete', userController.bulkDelete.bind(userController));

  /**
   * @swagger
   * /users/export:
   *   post:
   *     summary: Export users to various formats
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               format:
   *                 type: string
   *                 enum: [csv, excel, pdf, json]
   *                 default: csv
   *               columns:
   *                 type: array
   *                 items:
   *                   type: string
   *                 description: Column names to include in export
   *               includeFilters:
   *                 type: boolean
   *                 default: true
   *                 description: Whether to apply current filters
   *     parameters:
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *         description: Search term (applied if includeFilters is true)
   *       - in: query
   *         name: role
   *         schema:
   *           type: string
   *           enum: [admin, manager, staff]
   *         description: Filter by role
   *       - in: query
   *         name: isActive
   *         schema:
   *           type: boolean
   *         description: Filter by active status
   *     responses:
   *       200:
   *         description: Export file downloaded successfully
   *         content:
   *           text/csv:
   *             schema:
   *               type: string
   *           application/json:
   *             schema:
   *               type: object
   */
  router.post('/export', userController.exportUsers.bind(userController));

  return router;
}
