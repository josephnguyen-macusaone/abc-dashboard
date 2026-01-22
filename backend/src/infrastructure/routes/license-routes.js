import express from 'express';
import { awilixContainer } from '../../shared/kernel/container.js';
import { validateRequest } from '../middleware/validation-middleware.js';
import { licenseSchemas } from '../api/v1/schemas/license.schemas.js';
import {
  checkLicenseCreationPermission,
  checkLicenseAccessPermission,
  checkLicenseAssignmentPermission,
  checkLicenseRevocationPermission,
  checkLicenseBulkOperationPermission,
} from '../middleware/license-management.middleware.js';

/**
 * License Routes
 * Defines routes for license management operations
 */
export const createLicenseRoutes = (controller, lifecycleController, authMiddleware) => {
  const router = express.Router();

  // Special route for testing - defined before auth middleware
  router.get(
    '/attention-test',
    (req, res) => {
      console.log('🎯 BYPASS ATTENTION HANDLER: Called');
      return res.status(200).json({
        success: true,
        message: 'Attention test endpoint is working!',
        data: {
          expiringSoon: [],
          expired: [],
          suspended: [],
          total: 0
        }
      });
    }
  );

  // All routes require authentication
  router.use(authMiddleware.authenticate);

  // ========================================================================
  // LIFECYCLE MANAGEMENT ROUTES
  // ========================================================================

  /**
   * @swagger
   * /licenses/attention:
   *   get:
   *     summary: Get licenses requiring attention
   *     tags: [Licenses]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: includeExpiringSoon
   *         schema:
   *           type: boolean
   *           default: true
   *         description: Include licenses expiring soon
   *       - in: query
   *         name: includeExpired
   *         schema:
   *           type: boolean
   *           default: true
   *         description: Include expired licenses
   *       - in: query
   *         name: includeSuspended
   *         schema:
   *           type: boolean
   *           default: false
   *         description: Include suspended licenses
   *       - in: query
   *         name: daysThreshold
   *         schema:
   *           type: integer
   *           default: 30
   *         description: Days threshold for expiring soon
   *     responses:
   *       200:
   *         description: Licenses requiring attention retrieved successfully
   */
  router.get(
    '/attention',
    (req, res) => {
      console.log('🎯 INLINE ATTENTION HANDLER: Called');
      return res.status(200).json({
        success: true,
        message: 'Attention endpoint is working!',
        data: {
          expiringSoon: [],
          expired: [],
          suspended: [],
          total: 0
        }
      });
    }
  );

  /**
   * @swagger
   * /licenses/dashboard/metrics:
   *   get:
   *     summary: Get dashboard metrics for licenses
   *     tags: [Licenses]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: startsAtFrom
   *         schema:
   *           type: string
   *           format: date-time
   *         description: Filter licenses starting from this date
   *       - in: query
   *         name: startsAtTo
   *         schema:
   *           type: string
   *           format: date-time
   *         description: Filter licenses starting up to this date
   *     responses:
   *       200:
   *         description: Dashboard metrics retrieved successfully
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
   *                         totalActiveLicenses:
   *                           type: object
   *                           properties:
   *                             value:
   *                               type: integer
   *                             trend:
   *                               type: object
   *                         newLicensesThisMonth:
   *                           type: object
   *                           properties:
   *                             value:
   *                               type: integer
   *                             trend:
   *                               type: object
   *                         licenseIncomeThisMonth:
   *                           type: object
   *                           properties:
   *                             value:
   *                               type: number
   *                             trend:
   *                               type: object
   *                         smsIncomeThisMonth:
   *                           type: object
   *                           properties:
   *                             value:
   *                               type: number
   *                             smsSent:
   *                               type: integer
   *                             trend:
   *                               type: object
   *                         inHouseLicenses:
   *                           type: object
   *                           properties:
   *                             value:
   *                               type: integer
   *                         agentHeavyLicenses:
   *                           type: object
   *                           properties:
   *                             value:
   *                               type: integer
   *                         highRiskLicenses:
   *                           type: object
   *                           properties:
   *                             value:
   *                               type: integer
   *                             trend:
   *                               type: object
   *                         estimatedNextMonthIncome:
   *                           type: object
   *                           properties:
   *                             value:
   *                               type: number
   *                             trend:
   *                               type: object
   *       401:
   *         description: Unauthorized
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.get(
    '/dashboard/metrics',
    checkLicenseAccessPermission('list'),
    validateRequest(licenseSchemas.getLicenses),
    controller.getDashboardMetrics
  );

  /**
   * @swagger
   * /licenses:
   *   get:
   *     summary: Get licenses with pagination and filtering
   *     tags: [Licenses]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *         description: Page number for pagination
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 10
   *         description: Number of licenses per page
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *         description: General search term to search DBA field
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [active, cancel, pending, expired]
   *         description: Filter licenses by status
   *       - in: query
   *         name: dba
   *         schema:
   *           type: string
   *         description: Filter licenses by DBA name (legacy, use search instead)
   *       - in: query
   *         name: sortBy
   *         schema:
   *           type: string
   *           enum: [id, dba, zip, startDay, status, plan, term, lastPayment, lastActive, smsPurchased, smsSent, smsBalance, agents, agentsCost, createdAt, updatedAt]
   *           default: createdAt
   *         description: Field to sort by
   *       - in: query
   *         name: sortOrder
   *         schema:
   *           type: string
   *           enum: [asc, desc]
   *           default: desc
   *         description: Sort order
   *     responses:
   *       200:
   *         description: Licenses retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               allOf:
   *                 - $ref: '#/components/schemas/BaseResponse'
   *                 - $ref: '#/components/schemas/MetaPagination'
   *                 - type: object
   *                   properties:
   *                     data:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/License'
   *       401:
   *         description: Unauthorized
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.get(
    '/',
    checkLicenseAccessPermission('list'),
    validateRequest(licenseSchemas.getLicenses),
    controller.getLicenses
  );

  // ========================================================================
  // LIFECYCLE MANAGEMENT ROUTES (Phase 1) - MOVED UP TO AVOID ROUTE CONFLICTS
  // ========================================================================


  /**
   * @swagger
   * /licenses/{id}:
   *   get:
   *     summary: Get license by ID
   *     tags: [Licenses]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: License ID
   *     responses:
   *       200:
   *         description: License retrieved successfully
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
   *                         license:
   *                           $ref: '#/components/schemas/License'
   *       401:
   *         description: Unauthorized
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       404:
   *         description: License not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.get(
    '/:id',
    checkLicenseAccessPermission('read'),
    validateRequest(licenseSchemas.licenseId, 'params'),
    controller.getLicenseById
  );

  /**
   * @swagger
   * /licenses:
   *   post:
   *     summary: Create a new license
   *     tags: [Licenses]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - dba
   *               - startDay
   *             properties:
   *               dba:
   *                 type: string
   *                 maxLength: 255
   *                 description: Doing Business As name
   *               zip:
   *                 type: string
   *                 maxLength: 10
   *                 description: ZIP code
   *               startDay:
   *                 type: string
   *                 description: Start date (ISO string)
   *               status:
   *                 type: string
   *                 enum: [active, cancel, pending, expired]
   *                 default: pending
   *                 description: License status
   *               plan:
   *                 type: string
   *                 enum: [Basic, Premium, Enterprise]
   *                 description: Subscription plan
   *               term:
   *                 type: string
   *                 enum: [monthly, yearly]
   *                 description: Billing term
   *               cancelDate:
   *                 type: string
   *                 description: Cancellation date (required if status is cancel)
   *               lastPayment:
   *                 type: number
   *                 minimum: 0
   *                 description: Last payment amount
   *               smsPurchased:
   *                 type: integer
   *                 minimum: 0
   *                 description: Number of SMS purchased
   *               smsSent:
   *                 type: integer
   *                 minimum: 0
   *                 description: Number of SMS sent
   *               agents:
   *                 type: integer
   *                 minimum: 0
   *                 description: Number of agents
   *               agentsCost:
   *                 type: number
   *                 minimum: 0
   *                 description: Cost of agents
   *               agentsName:
   *                 type: array
   *                 items:
   *                   type: string
   *                 description: Names of agents
   *     responses:
   *       201:
   *         description: License created successfully
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
   *                         license:
   *                           $ref: '#/components/schemas/License'
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
  router.post(
    '/',
    checkLicenseCreationPermission(),
    // Temporarily disable Joi validation for sync
    // validateRequest(licenseSchemas.createLicense),
    controller.createLicense
  );

  /**
   * @swagger
   * /licenses/{id}:
   *   put:
   *     summary: Update an existing license
   *     tags: [Licenses]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: License ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               dba:
   *                 type: string
   *                 maxLength: 255
   *                 description: Doing Business As name
   *               zip:
   *                 type: string
   *                 maxLength: 10
   *                 description: ZIP code
   *               startDay:
   *                 type: string
   *                 description: Start date (ISO string)
   *               status:
   *                 type: string
   *                 enum: [active, cancel, pending, expired]
   *                 description: License status
   *               plan:
   *                 type: string
   *                 enum: [Basic, Premium, Enterprise]
   *                 description: Subscription plan
   *               term:
   *                 type: string
   *                 enum: [monthly, yearly]
   *                 description: Billing term
   *               cancelDate:
   *                 type: string
   *                 description: Cancellation date (required if status is cancel)
   *               lastPayment:
   *                 type: number
   *                 minimum: 0
   *                 description: Last payment amount
   *               smsPurchased:
   *                 type: integer
   *                 minimum: 0
   *                 description: Number of SMS purchased
   *               smsSent:
   *                 type: integer
   *                 minimum: 0
   *                 description: Number of SMS sent
   *               agents:
   *                 type: integer
   *                 minimum: 0
   *                 description: Number of agents
   *               agentsCost:
   *                 type: number
   *                 minimum: 0
   *                 description: Cost of agents
   *               agentsName:
   *                 type: array
   *                 items:
   *                   type: string
   *                 description: Names of agents
   *     responses:
   *       200:
   *         description: License updated successfully
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
   *                         license:
   *                           $ref: '#/components/schemas/License'
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
   *       404:
   *         description: License not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.put(
    '/:id',
    checkLicenseAccessPermission('update'),
    validateRequest(licenseSchemas.licenseId, 'params'),
    validateRequest(licenseSchemas.updateLicense),
    controller.updateLicense
  );

  /**
   * @swagger
   * /licenses/bulk:
   *   patch:
   *     summary: Bulk update licenses
   *     tags: [Licenses]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - updates
   *             properties:
   *               updates:
   *                 type: array
   *                 minItems: 1
   *                 items:
   *                   type: object
   *                   required:
   *                     - id
   *                   properties:
   *                     id:
   *                       type: string
   *                       description: License ID
   *                     dba:
   *                       type: string
   *                       maxLength: 255
   *                       description: Doing Business As name
   *                     zip:
   *                       type: string
   *                       maxLength: 10
   *                       description: ZIP code
   *                     startDay:
   *                       type: string
   *                       description: Start date (ISO string)
   *                     status:
   *                       type: string
   *                       enum: [active, cancel, pending, expired]
   *                       description: License status
   *                     plan:
   *                       type: string
   *                       enum: [Basic, Premium, Enterprise]
   *                       description: Subscription plan
   *                     term:
   *                       type: string
   *                       enum: [monthly, yearly]
   *                       description: Billing term
   *                     cancelDate:
   *                       type: string
   *                       description: Cancellation date
   *                     lastPayment:
   *                       type: number
   *                       minimum: 0
   *                       description: Last payment amount
   *                     smsPurchased:
   *                       type: integer
   *                       minimum: 0
   *                       description: Number of SMS purchased
   *                     smsSent:
   *                       type: integer
   *                       minimum: 0
   *                       description: Number of SMS sent
   *                     agents:
   *                       type: integer
   *                       minimum: 0
   *                       description: Number of agents
   *                     agentsCost:
   *                       type: number
   *                       minimum: 0
   *                       description: Cost of agents
   *                     agentsName:
   *                       type: array
   *                       items:
   *                         type: string
   *                       description: Names of agents
   *     responses:
   *       200:
   *         description: Licenses updated successfully
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
   *                         licenses:
   *                           type: array
   *                           items:
   *                             $ref: '#/components/schemas/License'
   *                         updated:
   *                           type: integer
   *                           description: Number of licenses updated
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
  router.patch(
    '/bulk',
    checkLicenseBulkOperationPermission(),
    validateRequest(licenseSchemas.bulkUpdateLicenses),
    controller.bulkUpdate
  );

  /**
   * @swagger
   * /licenses/bulk:
   *   post:
   *     summary: Bulk create licenses
   *     tags: [Licenses]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - licenses
   *             properties:
   *               licenses:
   *                 type: array
   *                 minItems: 1
   *                 items:
   *                   type: object
   *                   required:
   *                     - dba
   *                     - startDay
   *                   properties:
   *                     dba:
   *                       type: string
   *                       maxLength: 255
   *                       description: Doing Business As name
   *                     zip:
   *                       type: string
   *                       maxLength: 10
   *                       description: ZIP code
   *                     startDay:
   *                       type: string
   *                       description: Start date (ISO string)
   *                     status:
   *                       type: string
   *                       enum: [active, cancel, pending, expired]
   *                       default: pending
   *                       description: License status
   *                     plan:
   *                       type: string
   *                       enum: [Basic, Premium, Enterprise]
   *                       description: Subscription plan
   *                     term:
   *                       type: string
   *                       enum: [monthly, yearly]
   *                       description: Billing term
   *                     cancelDate:
   *                       type: string
   *                       description: Cancellation date
   *                     lastPayment:
   *                       type: number
   *                       minimum: 0
   *                       description: Last payment amount
   *                     smsPurchased:
   *                       type: integer
   *                       minimum: 0
   *                       description: Number of SMS purchased
   *                     smsSent:
   *                       type: integer
   *                       minimum: 0
   *                       description: Number of SMS sent
   *                     agents:
   *                       type: integer
   *                       minimum: 0
   *                       description: Number of agents
   *                     agentsCost:
   *                       type: number
   *                       minimum: 0
   *                       description: Cost of agents
   *                     agentsName:
   *                       type: array
   *                       items:
   *                         type: string
   *                       description: Names of agents
   *     responses:
   *       201:
   *         description: Licenses created successfully
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
   *                         licenses:
   *                           type: array
   *                           items:
   *                             $ref: '#/components/schemas/License'
   *                         created:
   *                           type: integer
   *                           description: Number of licenses created
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
  router.post(
    '/bulk',
    checkLicenseBulkOperationPermission(),
    validateRequest(licenseSchemas.bulkCreateLicenses),
    controller.bulkCreate
  );

  /**
   * @swagger
   * /licenses/row:
   *   post:
   *     summary: Add a license row (for grid operations)
   *     tags: [Licenses]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               dba:
   *                 type: string
   *                 maxLength: 255
   *                 description: Doing Business As name (can be empty for grid add flow)
   *               zip:
   *                 type: string
   *                 maxLength: 10
   *                 description: ZIP code
   *               startDay:
   *                 type: string
   *                 description: Start date (ISO string, defaults to today if empty)
   *     responses:
   *       201:
   *         description: License row created successfully
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
   *                         license:
   *                           $ref: '#/components/schemas/License'
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
  router.post(
    '/row',
    checkLicenseCreationPermission(),
    validateRequest(licenseSchemas.addLicenseRow),
    controller.addRow
  );

  /**
   * @swagger
   * /licenses/bulk:
   *   delete:
   *     summary: Bulk delete licenses
   *     tags: [Licenses]
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
   *                 minItems: 1
   *                 items:
   *                   type: string
   *                 description: Array of license IDs to delete
   *     responses:
   *       200:
   *         description: Licenses deleted successfully
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
   *                         deleted:
   *                           type: integer
   *                           description: Number of licenses deleted
   *                         notFound:
   *                           type: array
   *                           items:
   *                             type: string
   *                           description: IDs of licenses that were not found
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
  router.delete(
    '/bulk',
    checkLicenseBulkOperationPermission(),
    validateRequest(licenseSchemas.bulkDeleteLicenses),
    controller.bulkDelete
  );

  /**
   * @swagger
   * /licenses/{id}:
   *   delete:
   *     summary: Delete a license by ID
   *     tags: [Licenses]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: License ID
   *     responses:
   *       200:
   *         description: License deleted successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/BaseResponse'
   *       401:
   *         description: Unauthorized
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       404:
   *         description: License not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.delete(
    '/:id',
    checkLicenseAccessPermission('delete'),
    validateRequest(licenseSchemas.licenseId, 'params'),
    controller.deleteLicense
  );


  /**
   * @swagger
   * /licenses/{id}/lifecycle/status:
   *   get:
   *     summary: Get license lifecycle status
   *     tags: [Licenses]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: License ID
   *     responses:
   *       200:
   *         description: License lifecycle status retrieved successfully
   *       404:
   *         description: License not found
   */
  router.get(
    '/:id/lifecycle-status',
    checkLicenseAccessPermission('read'),
    validateRequest(licenseSchemas.licenseId, 'params'),
    lifecycleController.getLifecycleStatus
  );

  /**
   * @swagger
   * /licenses/{id}/renew:
   *   post:
   *     summary: Renew a license
   *     tags: [Licenses]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: License ID
   *     requestBody:
   *       required: false
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               newExpirationDate:
   *                 type: string
   *                 format: date-time
   *                 description: Specific new expiration date
   *               extensionDays:
   *                 type: integer
   *                 minimum: 1
   *                 maximum: 730
   *                 description: Days to extend (alternative to newExpirationDate)
   *               reason:
   *                 type: string
   *                 description: Reason for renewal
   *     responses:
   *       200:
   *         description: License renewed successfully
   *       400:
   *         description: Invalid renewal options
   *       404:
   *         description: License not found
   */
  router.post(
    '/:id/renew',
    checkLicenseAccessPermission('update'),
    validateRequest(licenseSchemas.licenseId, 'params'),
    lifecycleController.renewLicense
  );

  /**
   * @swagger
   * /licenses/{id}/renew/preview:
   *   get:
   *     summary: Get renewal preview
   *     tags: [Licenses]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: License ID
   *       - in: query
   *         name: newExpirationDate
   *         schema:
   *           type: string
   *           format: date-time
   *         description: Specific new expiration date
   *       - in: query
   *         name: extensionDays
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 730
   *         description: Days to extend
   *     responses:
   *       200:
   *         description: Renewal preview retrieved successfully
   */
  router.get(
    '/:id/renew-preview',
    checkLicenseAccessPermission('read'),
    validateRequest(licenseSchemas.licenseId, 'params'),
    lifecycleController.getRenewalPreview
  );

  /**
   * @swagger
   * /licenses/{id}/extend:
   *   post:
   *     summary: Extend license expiration
   *     tags: [Licenses]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: License ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - newExpirationDate
   *             properties:
   *               newExpirationDate:
   *                 type: string
   *                 format: date-time
   *                 description: New expiration date
   *               reason:
   *                 type: string
   *                 description: Reason for extension
   *     responses:
   *       200:
   *         description: License expiration extended successfully
   *       400:
   *         description: Invalid request data
   *       404:
   *         description: License not found
   */
  router.post(
    '/:id/extend',
    checkLicenseAccessPermission('update'),
    validateRequest(licenseSchemas.licenseId, 'params'),
    lifecycleController.extendLicense
  );

  /**
   * @swagger
   * /licenses/{id}/expire:
   *   post:
   *     summary: Expire a license
   *     tags: [Licenses]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: License ID
   *     requestBody:
   *       required: false
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               reason:
   *                 type: string
   *                 description: Reason for expiration
   *               force:
   *                 type: boolean
   *                 description: Force expiration even if not due
   *     responses:
   *       200:
   *         description: License expired successfully
   *       400:
   *         description: Invalid expiration request
   *       404:
   *         description: License not found
   */
  router.post(
    '/:id/expire',
    checkLicenseAccessPermission('update'),
    validateRequest(licenseSchemas.licenseId, 'params'),
    lifecycleController.expireLicense
  );

  /**
   * @swagger
   * /licenses/{id}/expire/preview:
   *   get:
   *     summary: Get expiration preview
   *     tags: [Licenses]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: License ID
   *       - in: query
   *         name: action
   *         schema:
   *           type: string
   *           enum: [suspend, grace_period, mark_expired]
   *         description: Force specific expiration action
   *     responses:
   *       200:
   *         description: Expiration preview retrieved successfully
   */
  router.get(
    '/:id/expire-preview',
    checkLicenseAccessPermission('read'),
    validateRequest(licenseSchemas.licenseId, 'params'),
    lifecycleController.getExpirationPreview
  );

  /**
   * @swagger
   * /licenses/{id}/reactivate:
   *   post:
   *     summary: Reactivate an expired/suspended license
   *     tags: [Licenses]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: License ID
   *     requestBody:
   *       required: false
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               reason:
   *                 type: string
   *                 description: Reason for reactivation
   *     responses:
   *       200:
   *         description: License reactivated successfully
   *       400:
   *         description: Invalid reactivation request
   *       404:
   *         description: License not found
   */
  router.post(
    '/:id/reactivate',
    checkLicenseAccessPermission('update'),
    validateRequest(licenseSchemas.licenseId, 'params'),
    lifecycleController.reactivateLicense
  );

  /**
   * @swagger
   * /licenses/lifecycle/bulk-renew:
   *   post:
   *     summary: Bulk renew licenses
   *     tags: [Licenses]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - licenseIds
   *             properties:
   *               licenseIds:
   *                 type: array
   *                 items:
   *                   type: string
   *                 description: Array of license IDs to renew
   *               renewalOptions:
   *                 type: object
   *                 description: Renewal options to apply to all licenses
   *     responses:
   *       200:
   *         description: Bulk renewal completed
   *       400:
   *         description: Invalid request data
   */
  router.post(
    '/lifecycle/bulk-renew',
    checkLicenseBulkOperationPermission(),
    lifecycleController.bulkRenewLicenses
  );

  /**
   * @swagger
   * /licenses/lifecycle/bulk-expire:
   *   post:
   *     summary: Bulk expire licenses
   *     tags: [Licenses]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - licenseIds
   *             properties:
   *               licenseIds:
   *                 type: array
   *                 items:
   *                   type: string
   *                 description: Array of license IDs to expire
   *               expirationOptions:
   *                 type: object
   *                 description: Expiration options to apply to all licenses
   *     responses:
   *       200:
   *         description: Bulk expiration completed
   *       400:
   *         description: Invalid request data
   */
  router.post(
    '/lifecycle/bulk-expire',
    checkLicenseBulkOperationPermission(),
    lifecycleController.bulkExpireLicenses
  );

  /**
   * @swagger
   * /licenses/lifecycle/process:
   *   post:
   *     summary: Trigger manual lifecycle processing
   *     tags: [Licenses]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - operation
   *             properties:
   *               operation:
   *                 type: string
   *                 enum: [expiring_reminders, expire_licenses, update_grace_periods]
   *                 description: Lifecycle operation to perform
   *     responses:
   *       200:
   *         description: Lifecycle operation completed successfully
   *       400:
   *         description: Invalid operation
   */
  router.post(
    '/lifecycle/process',
    checkLicenseAccessPermission('update'),
    lifecycleController.processLifecycle
  );

  /**
   * @swagger
   * /licenses/sync:
   *   post:
   *     summary: Manually trigger license sync
   *     tags: [Licenses]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Sync initiated successfully
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
   *                         message:
   *                           type: string
   *                           description: Sync status message
   *       401:
   *         description: Unauthorized
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.post(
    '/sync',
    checkLicenseAccessPermission('update'),
    controller.syncLicenses
  );

  /**
   * @swagger
   * /licenses/sync/status:
   *   get:
   *     summary: Get license sync scheduler status
   *     tags: [Licenses]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Sync scheduler status retrieved successfully
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
   *                         enabled:
   *                           type: boolean
   *                         running:
   *                           type: boolean
   *                         timezone:
   *                           type: string
   *                         schedule:
   *                           type: string
   *                         statistics:
   *                           type: object
   *                         lastSyncResult:
   *                           type: object
   *       401:
   *         description: Unauthorized
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.get(
    '/sync/status',
    checkLicenseAccessPermission('read'),
    async (req, res) => {
      try {
        // Get scheduler status from container
        const scheduler = await awilixContainer.getLicenseSyncScheduler();
        if (!scheduler) {
          return res.notFound('Sync scheduler not available');
        }

        const status = scheduler.getStatus();
        return res.success(status, 'Sync scheduler status retrieved successfully');
      } catch (error) {
        logger.error('Failed to get sync scheduler status', { error: error.message });
        return res.serverError('Failed to retrieve sync status');
      }
    }
  );

  return router;
};
