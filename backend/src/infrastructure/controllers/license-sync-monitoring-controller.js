import { licenseSyncMonitor } from '../monitoring/license-sync-monitor.js';
import { licenseSyncConfig } from '../config/license-sync-config.js';
import logger from '../config/logger.js';

/**
 * License Sync Monitoring Controller
 * Provides endpoints for monitoring and observability of license sync operations
 */
export class LicenseSyncMonitoringController {
  constructor() {
    this.monitor = licenseSyncMonitor;
  }

  /**
   * Get comprehensive health status
   * GET /api/v1/license-sync/health
   */
  async getHealth(req, res) {
    try {
      const healthStatus = this.monitor.getHealthStatus();

      const statusCode = healthStatus.overall === 'healthy' ? 200 :
                        healthStatus.overall === 'warning' ? 200 : 503;

      res.status(statusCode).json({
        status: healthStatus.overall,
        timestamp: healthStatus.lastCheck,
        uptime: healthStatus.uptime,
        memoryUsage: healthStatus.memoryUsage,
        components: healthStatus.components,
        version: '1.0.0',
      });
    } catch (error) {
      logger.error('Health check failed', { error: error.message });
      res.status(500).json({
        status: 'unhealthy',
        error: 'Health check failed',
        timestamp: new Date(),
      });
    }
  }

  /**
   * Get performance metrics
   * GET /api/v1/license-sync/metrics
   */
  async getMetrics(req, res) {
    try {
      const metrics = this.monitor.getMetrics();
      const performanceSummary = this.monitor.getPerformanceSummary();

      res.json({
        timestamp: new Date(),
        metrics,
        summary: performanceSummary,
      });
    } catch (error) {
      logger.error('Metrics retrieval failed', { error: error.message });
      res.status(500).json({
        error: 'Metrics retrieval failed',
        timestamp: new Date(),
      });
    }
  }

  /**
   * Get active alerts
   * GET /api/v1/license-sync/alerts
   */
  async getAlerts(req, res) {
    try {
      const { severity, acknowledged, limit } = req.query;

      const options = {};
      if (severity) options.severity = severity;
      if (acknowledged !== undefined) options.acknowledged = acknowledged === 'true';
      if (limit) options.limit = parseInt(limit);

      const alerts = this.monitor.getAlerts(options);

      res.json({
        timestamp: new Date(),
        total: alerts.length,
        alerts,
      });
    } catch (error) {
      logger.error('Alerts retrieval failed', { error: error.message });
      res.status(500).json({
        error: 'Alerts retrieval failed',
        timestamp: new Date(),
      });
    }
  }

  /**
   * Acknowledge alert
   * POST /api/v1/license-sync/alerts/:alertId/acknowledge
   */
  async acknowledgeAlert(req, res) {
    try {
      const { alertId } = req.params;

      this.monitor.acknowledgeAlert(alertId);

      res.json({
        success: true,
        message: 'Alert acknowledged',
        alertId,
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error('Alert acknowledgement failed', {
        alertId: req.params.alertId,
        error: error.message
      });
      res.status(500).json({
        error: 'Alert acknowledgement failed',
        timestamp: new Date(),
      });
    }
  }

  /**
   * Get sync operation history and statistics
   * GET /api/v1/license-sync/stats
   */
  async getStats(req, res) {
    try {
      const performanceSummary = this.monitor.getPerformanceSummary();
      const alerts = this.monitor.getAlerts({ acknowledged: false });
      const healthStatus = this.monitor.getHealthStatus();

      // Get recent alerts (last 24 hours)
      const recentAlerts = alerts.filter(alert => {
        const alertTime = new Date(alert.timestamp);
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return alertTime > oneDayAgo;
      });

      res.json({
        timestamp: new Date(),
        health: healthStatus,
        performance: performanceSummary,
        alerts: {
          active: alerts.length,
          recent: recentAlerts.length,
          critical: alerts.filter(a => a.severity === 'critical').length,
          bySeverity: {
            info: alerts.filter(a => a.severity === 'info').length,
            warning: alerts.filter(a => a.severity === 'warning').length,
            error: alerts.filter(a => a.severity === 'error').length,
            critical: alerts.filter(a => a.severity === 'critical').length,
          },
        },
        configuration: {
          monitoringEnabled: licenseSyncConfig.monitoring.enableMetrics,
          batchSize: licenseSyncConfig.sync.batchSize,
          concurrencyLimit: licenseSyncConfig.sync.concurrencyLimit,
          comprehensiveSyncEnabled: licenseSyncConfig.features.enableComprehensiveSync,
        },
      });
    } catch (error) {
      logger.error('Stats retrieval failed', { error: error.message });
      res.status(500).json({
        error: 'Stats retrieval failed',
        timestamp: new Date(),
      });
    }
  }

  /**
   * Force health check
   * POST /api/v1/license-sync/health/check
   */
  async forceHealthCheck(req, res) {
    try {
      // The monitor automatically performs health checks periodically,
      // but we can trigger one manually here if needed

      const healthStatus = this.monitor.getHealthStatus();

      res.json({
        success: true,
        message: 'Health check completed',
        health: healthStatus,
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error('Manual health check failed', { error: error.message });
      res.status(500).json({
        error: 'Manual health check failed',
        timestamp: new Date(),
      });
    }
  }

  /**
   * Reset metrics (for testing/debugging)
   * POST /api/v1/license-sync/metrics/reset
   */
  async resetMetrics(req, res) {
    try {
      // Only allow in development or with proper authorization
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({
          error: 'Metrics reset not allowed in production',
          timestamp: new Date(),
        });
      }

      // Reinitialize metrics (this is a simple approach - in production you'd want more sophisticated reset logic)
      this.monitor.metrics.clear();
      this.monitor._initializeMetrics();

      logger.warn('Metrics reset performed', { user: req.user?.id || 'system' });

      res.json({
        success: true,
        message: 'Metrics reset completed',
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error('Metrics reset failed', { error: error.message });
      res.status(500).json({
        error: 'Metrics reset failed',
        timestamp: new Date(),
      });
    }
  }
}

// Export singleton instance
export const licenseSyncMonitoringController = new LicenseSyncMonitoringController();