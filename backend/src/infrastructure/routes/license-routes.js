import express from 'express';
import { validateRequest } from '../middleware/validation-middleware.js';
import { licenseSchemas } from '../api/v1/schemas/license.schemas.js';

/**
 * License Routes
 * Defines routes for license management operations
 */
export const createLicenseRoutes = (controller, authMiddleware) => {
  const router = express.Router();

  // All routes require authentication
  router.use(authMiddleware.authenticate);

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
  router.get('/', validateRequest(licenseSchemas.getLicenses), controller.getLicenses);

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
  router.get('/:id', validateRequest(licenseSchemas.licenseId, 'params'), controller.getLicenseById);

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
  router.post('/', validateRequest(licenseSchemas.createLicense), controller.createLicense);

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
  router.put('/:id', validateRequest(licenseSchemas.licenseId, 'params'), validateRequest(licenseSchemas.updateLicense), controller.updateLicense);

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
  router.patch('/bulk', validateRequest(licenseSchemas.bulkUpdateLicenses), controller.bulkUpdate);

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
  router.post('/bulk', validateRequest(licenseSchemas.bulkCreateLicenses), controller.bulkCreate);

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
  router.post('/row', validateRequest(licenseSchemas.addLicenseRow), controller.addRow);

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
  router.delete('/bulk', validateRequest(licenseSchemas.bulkDeleteLicenses), controller.bulkDelete);

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
  router.delete('/:id', validateRequest(licenseSchemas.licenseId, 'params'), controller.deleteLicense);

  return router;
};
