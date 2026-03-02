import express from 'express';
import { licenseSyncMonitoringController } from '../controllers/license-sync-monitoring-controller.js';
import { authenticate } from '../middleware/auth-middleware.js';
import { monitoringRateLimit } from '../middleware/rate-limiting-middleware.js';
import { requireLicenseMonitor } from '../middleware/license-access-control-middleware.js';

/**
 * License Sync Monitoring Routes
 * Provides REST endpoints for monitoring and observability
 */
const router = express.Router();

// Apply authentication, access control, and rate limiting to all monitoring routes
router.use(authenticate);
router.use(requireLicenseMonitor);
router.use(monitoringRateLimit);

/**
 * @swagger
 * /license-sync/health:
 *   get:
 *     summary: License sync health check
 *     description: Health check for license sync service (e.g. load balancers).
 *     tags: [License Sync Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sync service health status
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - { $ref: '#/components/schemas/BaseResponse' }
 *                 - type: object
 *                   properties:
 *                     data: { type: object }
 */
router.get(
  '/health',
  licenseSyncMonitoringController.getHealth.bind(licenseSyncMonitoringController)
);

/**
 * @swagger
 * /license-sync/stats:
 *   get:
 *     summary: License sync statistics
 *     description: Comprehensive sync statistics.
 *     tags: [License Sync Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sync statistics
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - { $ref: '#/components/schemas/BaseResponse' }
 *                 - type: object
 *                   properties:
 *                     data: { type: object }
 */
router.get(
  '/stats',
  licenseSyncMonitoringController.getStats.bind(licenseSyncMonitoringController)
);

/**
 * @swagger
 * /license-sync/metrics:
 *   get:
 *     summary: License sync detailed metrics
 *     description: Detailed sync metrics for observability.
 *     tags: [License Sync Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sync metrics
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - { $ref: '#/components/schemas/BaseResponse' }
 *                 - type: object
 *                   properties:
 *                     data: { type: object }
 */
router.get(
  '/metrics',
  licenseSyncMonitoringController.getMetrics.bind(licenseSyncMonitoringController)
);

/**
 * @swagger
 * /license-sync/alerts:
 *   get:
 *     summary: List license sync alerts
 *     description: Returns current sync alerts.
 *     tags: [License Sync Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of alerts
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - { $ref: '#/components/schemas/BaseResponse' }
 *                 - type: object
 *                   properties:
 *                     data: { type: array }
 */
router.get(
  '/alerts',
  licenseSyncMonitoringController.getAlerts.bind(licenseSyncMonitoringController)
);

/**
 * @swagger
 * /license-sync/alerts/{alertId}/acknowledge:
 *   post:
 *     summary: Acknowledge an alert
 *     description: Mark a sync alert as acknowledged.
 *     tags: [License Sync Monitoring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: alertId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Alert acknowledged
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/BaseResponse' }
 */
router.post(
  '/alerts/:alertId/acknowledge',
  licenseSyncMonitoringController.acknowledgeAlert.bind(licenseSyncMonitoringController)
);

/**
 * @swagger
 * /license-sync/health/check:
 *   post:
 *     summary: Force health check (admin)
 *     description: Trigger a health check. Requires license monitor role.
 *     tags: [License Sync Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Health check triggered
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/BaseResponse' }
 */
router.post(
  '/health/check',
  licenseSyncMonitoringController.forceHealthCheck.bind(licenseSyncMonitoringController)
);

/**
 * @swagger
 * /license-sync/metrics/reset:
 *   post:
 *     summary: Reset metrics (admin)
 *     description: Reset sync metrics. Requires license monitor role.
 *     tags: [License Sync Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Metrics reset
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/BaseResponse' }
 */
router.post(
  '/metrics/reset',
  licenseSyncMonitoringController.resetMetrics.bind(licenseSyncMonitoringController)
);

export default router;
