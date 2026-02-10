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

// Health check endpoint (can be used by load balancers)
router.get('/health', licenseSyncMonitoringController.getHealth.bind(licenseSyncMonitoringController));

// Comprehensive statistics endpoint
router.get('/stats', licenseSyncMonitoringController.getStats.bind(licenseSyncMonitoringController));

// Detailed metrics endpoint
router.get('/metrics', licenseSyncMonitoringController.getMetrics.bind(licenseSyncMonitoringController));

// Alerts management
router.get('/alerts', licenseSyncMonitoringController.getAlerts.bind(licenseSyncMonitoringController));
router.post('/alerts/:alertId/acknowledge', licenseSyncMonitoringController.acknowledgeAlert.bind(licenseSyncMonitoringController));

// Administrative endpoints (require additional authorization in production)
router.post('/health/check', licenseSyncMonitoringController.forceHealthCheck.bind(licenseSyncMonitoringController));
router.post('/metrics/reset', licenseSyncMonitoringController.resetMetrics.bind(licenseSyncMonitoringController));

export default router;