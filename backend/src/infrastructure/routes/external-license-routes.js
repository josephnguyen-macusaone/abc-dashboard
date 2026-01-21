import express from 'express';
import { syncOperationRateLimit, generalApiRateLimit } from '../middleware/rate-limiting-middleware.js';
import {
  requireLicenseSync,
  requireExternalLicenseSync,
  requireComprehensiveSync,
  requireLicenseRead,
  suspiciousActivityMonitor,
} from '../middleware/license-access-control-middleware.js';

/**
 * External License Routes
 * Defines routes for external license management and synchronization
 */
export const createExternalLicenseRoutes = (controller, authMiddleware) => {
  const router = express.Router();

  // All routes require authentication
  router.use(authMiddleware.authenticate);

  // Apply general API rate limiting to all routes
  router.use(generalApiRateLimit);

  // Apply suspicious activity monitoring
  router.use(suspiciousActivityMonitor);

  // ========================================================================
  // Sync Operations Routes (Require sync permissions)
  // ========================================================================

  /**
   * @swagger
   * /api/v1/external-licenses/sync:
   *   post:
   *     summary: Sync all licenses from external API
   *     tags: [External Licenses]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: force
   *         schema:
   *           type: boolean
   *           default: false
   *         description: Force full sync instead of incremental
   *       - in: query
   *         name: batchSize
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 500
   *           default: 100
   *         description: Number of licenses to process per batch
       *       - in: query
       *         name: dryRun
       *         schema:
       *           type: boolean
       *           default: false
       *         description: Only validate and count, don't save changes
       *       - in: query
       *         name: bidirectional
       *         schema:
       *           type: boolean
       *           default: false
       *         description: Also sync internal license changes back to external API
       *       - in: query
       *         name: comprehensive
       *         schema:
       *           type: boolean
       *           default: true
       *         description: Use comprehensive reconciliation (external-first, internal-second, compare gaps)
   *     responses:
   *       200:
   *         description: Sync completed successfully
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
   *                         success:
   *                           type: boolean
   *                         totalFetched:
   *                           type: integer
   *                         created:
   *                           type: integer
   *                         updated:
   *                           type: integer
   *                         failed:
   *                           type: integer
   *                         errors:
   *                           type: array
   *                           items:
   *                             type: object
   *                         duration:
   *                           type: integer
   *                         timestamp:
   *                           type: string
   *                           format: date-time
   */
  router.post('/sync', requireExternalLicenseSync, syncOperationRateLimit, controller.syncLicenses);

  /**
   * @swagger
   * /api/v1/external-licenses/sync/{appid}:
   *   post:
   *     summary: Sync single license by appid
   *     tags: [External Licenses]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: appid
   *         required: true
   *         schema:
   *           type: string
   *         description: App ID of the license to sync
   *     responses:
   *       200:
   *         description: License synced successfully
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
   *                         success:
   *                           type: boolean
   *                         license:
   *                           $ref: '#/components/schemas/ExternalLicense'
   *                         action:
   *                           type: string
   *                           enum: [synced]
   *       404:
   *         description: License not found in external API
   */
  router.post('/sync/:appid', controller.syncSingleLicense);

  /**
   * @swagger
   * /api/v1/external-licenses/sync/pending:
   *   post:
   *     summary: Sync licenses that need updating (pending or failed)
   *     tags: [External Licenses]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 1000
   *           default: 100
   *         description: Maximum number of licenses to sync
   *       - in: query
   *         name: batchSize
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 25
   *         description: Number of licenses to process per batch
   *     responses:
   *       200:
   *         description: Pending licenses sync completed
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
   *                         success:
   *                           type: boolean
   *                         processed:
   *                           type: integer
   *                         synced:
   *                           type: integer
   *                         failed:
   *                           type: integer
   *                         errors:
   *                           type: array
   *                           items:
   *                             type: object
   */
  router.post('/sync/pending', controller.syncPendingLicenses);

  /**
   * @swagger
   * /api/v1/external-licenses/sync/status:
   *   get:
   *     summary: Get sync status and statistics
   *     tags: [External Licenses]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Sync status retrieved successfully
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
   *                         success:
   *                           type: boolean
   *                         internal:
   *                           type: object
   *                           properties:
   *                             total:
   *                               type: integer
   *                             synced:
   *                               type: integer
   *                             failed:
   *                               type: integer
   *                             pending:
   *                               type: integer
   *                             successRate:
   *                               type: number
   *                         external:
   *                           type: object
   *                           properties:
   *                             healthy:
   *                               type: boolean
   *                             lastHealthCheck:
   *                               type: string
   *                               format: date-time
   *                             error:
   *                               type: string
   *                         lastSync:
   *                           type: string
   *                           format: date-time
   *                           nullable: true
   */
  router.get('/sync/status', controller.getSyncStatus);

  // ========================================================================
  // License Management Routes
  // ========================================================================

  /**
   * @swagger
   * /api/v1/external-licenses:
   *   get:
   *     summary: Get external licenses with pagination and filtering
   *     tags: [External Licenses]
   *     security:
   *       - bearerAuth: []
   *     parameters:
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
   *         description: Items per page
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *         description: Search across appid, email, and dba fields
   *       - in: query
   *         name: appid
   *         schema:
   *           type: string
   *         description: Filter by app ID
   *       - in: query
   *         name: email
   *         schema:
   *           type: string
   *         description: Filter by email
   *       - in: query
   *         name: dba
   *         schema:
   *           type: string
   *         description: Filter by DBA (organization)
   *       - in: query
   *         name: status
   *         schema:
   *           type: integer
   *         description: Filter by status (0=inactive, 1=active)
   *       - in: query
   *         name: license_type
   *         schema:
   *           type: string
   *           enum: [product, service, trial, enterprise]
   *         description: Filter by license type
   *       - in: query
   *         name: syncStatus
   *         schema:
   *           type: string
   *           enum: [pending, synced, failed]
   *         description: Filter by sync status
   *       - in: query
   *         name: sortBy
   *         schema:
   *           type: string
   *           enum: [countid, appid, emailLicense, licenseType, dba, status, monthlyFee, smsBalance, lastSyncedAt, syncStatus, createdAt, updatedAt]
   *           default: updated_at
   *         description: Sort field
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
   *                 - $ref: '#/components/schemas/PaginatedResponse'
   */
  router.get('/', controller.getLicenses);

  /**
   * @swagger
   * /api/v1/external-licenses/stats:
   *   get:
   *     summary: Get license statistics
   *     tags: [External Licenses]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: License statistics retrieved successfully
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
   *                         stats:
   *                           type: object
   *                           properties:
   *                             totalLicenses:
   *                               type: integer
   *                             active:
   *                               type: integer
   *                             expired:
   *                               type: integer
   *                             expiringSoon:
   *                               type: integer
   *                             pendingSync:
   *                               type: integer
   *                             failedSync:
   *                               type: integer
   */
  router.get('/stats', controller.getLicenseStats);

  /**
   * @swagger
   * /api/v1/external-licenses/expiring:
   *   get:
   *     summary: Get licenses expiring soon
   *     tags: [External Licenses]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: days
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 365
   *           default: 30
   *         description: Number of days to look ahead for expiring licenses
   *     responses:
   *       200:
   *         description: Expiring licenses retrieved successfully
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
   *                             $ref: '#/components/schemas/ExternalLicense'
   *                         count:
   *                           type: integer
   */
  router.get('/expiring', controller.getExpiringLicenses);

  /**
   * @swagger
   * /api/v1/external-licenses/expired:
   *   get:
   *     summary: Get expired licenses
   *     tags: [External Licenses]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Expired licenses retrieved successfully
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
   *                             $ref: '#/components/schemas/ExternalLicense'
   *                         count:
   *                           type: integer
   */
  router.get('/expired', controller.getExpiredLicenses);

  /**
   * @swagger
   * /api/v1/external-licenses/organization/{dba}:
   *   get:
   *     summary: Get licenses by organization (DBA)
   *     tags: [External Licenses]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: dba
   *         required: true
   *         schema:
   *           type: string
   *         description: Organization/DBA name
   *     responses:
   *       200:
   *         description: Organization licenses retrieved successfully
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
   *                             $ref: '#/components/schemas/ExternalLicense'
   *                         count:
   *                           type: integer
   */
  router.get('/organization/:dba', controller.getLicensesByOrganization);

  // ========================================================================
  // Single License CRUD Routes
  // ========================================================================

  /**
   * @swagger
   * /api/v1/external-licenses/{id}:
   *   get:
   *     summary: Get license by internal ID
   *     tags: [External Licenses]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Internal license ID
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
   *                           $ref: '#/components/schemas/ExternalLicense'
   *       404:
   *         description: License not found
   *   put:
   *     summary: Update license by internal ID
   *     tags: [External Licenses]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Internal license ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               dba:
   *                 type: string
   *               zip:
   *                 type: string
   *               status:
   *                 type: integer
   *               license_type:
   *                 type: string
   *               monthlyFee:
   *                 type: number
   *               smsBalance:
   *                 type: number
   *               Note:
   *                 type: string
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
   *                           $ref: '#/components/schemas/ExternalLicense'
   *       404:
   *         description: License not found
   *   delete:
   *     summary: Delete license by internal ID
   *     tags: [External Licenses]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Internal license ID
   *     responses:
   *       200:
   *         description: License deleted successfully
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
   *                           type: boolean
   *       404:
   *         description: License not found
   */
  router.get('/:id', controller.getLicenseById);
  router.put('/:id', controller.updateLicense);
  router.delete('/:id', controller.deleteLicense);

  /**
   * @swagger
   * /api/v1/external-licenses/appid/{appid}:
   *   get:
   *     summary: Get license by appid
   *     tags: [External Licenses]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: appid
   *         required: true
   *         schema:
   *           type: string
   *         description: App ID
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
   *                           $ref: '#/components/schemas/ExternalLicense'
   *       404:
   *         description: License not found
   */
  router.get('/appid/:appid', controller.getLicenseByAppId);

  /**
   * @swagger
   * /api/v1/external-licenses/email/{email}:
   *   get:
   *     summary: Get license by email
   *     tags: [External Licenses]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: email
   *         required: true
   *         schema:
   *           type: string
   *           format: email
   *         description: License email
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
   *                           $ref: '#/components/schemas/ExternalLicense'
   *       404:
   *         description: License not found
   */
  router.get('/email/:email', controller.getLicenseByEmail);

  /**
   * @swagger
   * /api/v1/external-licenses/countid/{countid}:
   *   get:
   *     summary: Get license by countid
   *     tags: [External Licenses]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: countid
   *         required: true
   *         schema:
   *           type: integer
   *         description: Count ID
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
   *                           $ref: '#/components/schemas/ExternalLicense'
   *       404:
   *         description: License not found
   */
  router.get('/countid/:countid', controller.getLicenseByCountId);

  // ========================================================================
  // Bulk Operations Routes
  // ========================================================================

  /**
   * @swagger
   * /api/v1/external-licenses/bulk:
   *   post:
   *     summary: Create new external license
   *     tags: [External Licenses]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - emailLicense
   *               - pass
   *             properties:
   *               emailLicense:
   *                 type: string
   *                 format: email
   *               pass:
   *                 type: string
   *               monthlyFee:
   *                 type: number
   *                 default: 0
   *               Mid:
   *                 type: string
   *               dba:
   *                 type: string
   *               zip:
   *                 type: string
   *               status:
   *                 type: integer
   *                 default: 1
   *               license_type:
   *                 type: string
   *                 default: product
   *               Package:
   *                 type: object
   *               Note:
   *                 type: string
   *               coming_expired:
   *                 type: string
   *                 format: date-time
   *               sendbat_workspace:
   *                 type: string
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
   *                           $ref: '#/components/schemas/ExternalLicense'
   */
  router.post('/', controller.createLicense);

  /**
   * @swagger
   * /api/v1/external-licenses/bulk/update:
   *   put:
   *     summary: Bulk update licenses
   *     tags: [External Licenses]
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
   *                 items:
   *                   type: object
   *                   required:
   *                     - id
   *                     - updates
   *                   properties:
   *                     id:
   *                       type: string
   *                       description: Internal license ID
   *                     updates:
   *                       type: object
   *                       description: Fields to update
   *     responses:
   *       200:
   *         description: Bulk update completed successfully
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
   *                         results:
   *                           type: array
   *                           items:
   *                             $ref: '#/components/schemas/ExternalLicense'
   *                         count:
   *                           type: integer
   *                         requested:
   *                           type: integer
   */
  router.put('/bulk/update', controller.bulkUpdateLicenses);

  /**
   * @swagger
   * /api/v1/external-licenses/bulk/delete:
   *   delete:
   *     summary: Bulk delete licenses
   *     tags: [External Licenses]
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
   *                 description: Array of internal license IDs to delete
   *     responses:
   *       200:
   *         description: Bulk delete completed successfully
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
   *                         requested:
   *                           type: integer
   */
  router.delete('/bulk/delete', controller.bulkDeleteLicenses);

  return router;
};