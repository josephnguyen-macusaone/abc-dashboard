import logger from '../config/logger.js';
import { licenseSyncConfig } from '../config/license-sync-config.js';

/**
 * License Sync Monitor
 * Provides comprehensive monitoring and observability for license synchronization operations
 * without external dependencies like Prometheus
 */
export class LicenseSyncMonitor {
  constructor() {
    this.metrics = new Map();
    this.alerts = [];
    this.healthStatus = {
      overall: 'healthy',
      lastCheck: new Date(),
      components: new Map(),
    };

    // Initialize metrics storage
    this._initializeMetrics();

    // Start periodic health checks
    this._startHealthChecks();
  }

  /**
   * Initialize metrics storage structure
   * @private
   */
  _initializeMetrics() {
    this.metrics.set('sync_operations_total', { type: 'counter', value: 0, labels: new Map() });
    this.metrics.set('sync_operations_duration', {
      type: 'histogram',
      value: [],
      buckets: [1, 5, 10, 30, 60, 120, 300],
    });
    this.metrics.set('sync_operations_errors_total', {
      type: 'counter',
      value: 0,
      labels: new Map(),
    });
    this.metrics.set('sync_data_processed_total', { type: 'counter', value: 0, labels: new Map() }); // Added labels
    this.metrics.set('sync_memory_peak_usage', { type: 'gauge', value: 0 });
    this.metrics.set('sync_active_operations', { type: 'gauge', value: 0 });
    this.metrics.set('sync_last_completed_timestamp', { type: 'gauge', value: 0 });
    this.metrics.set('external_api_requests_total', {
      type: 'counter',
      value: 0,
      labels: new Map(),
    });
    this.metrics.set('external_api_request_duration', {
      type: 'histogram',
      value: [],
      buckets: [0.1, 0.5, 1, 2, 5, 10],
    });
    this.metrics.set('external_api_errors_total', { type: 'counter', value: 0, labels: new Map() });
    this.metrics.set('validation_errors_total', { type: 'counter', value: 0, labels: new Map() });
    this.metrics.set('database_operations_total', { type: 'counter', value: 0, labels: new Map() });
    this.metrics.set('database_operation_duration', {
      type: 'histogram',
      value: [],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
    });
  }

  /**
   * Record sync operation start
   */
  recordSyncStart(operationType, options = {}) {
    const operationId =
      options.operationId || `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.incrementGauge('sync_active_operations', 1);

    logger.info('Sync operation started', {
      operationId,
      operationType,
      ...options,
    });

    return {
      operationId,
      startTime: Date.now(),
      operationType,
      options,
    };
  }

  /**
   * Record sync operation completion
   */
  recordSyncEnd(operationContext, result) {
    const duration = Date.now() - operationContext.startTime;

    this.incrementGauge('sync_active_operations', -1);
    this.incrementCounter('sync_operations_total', {
      operation_type: operationContext.operationType,
    });
    this.recordHistogram('sync_operations_duration', duration);
    this.metrics.get('sync_last_completed_timestamp').value = Date.now();

    if (result.success) {
      logger.debug('Sync operation completed successfully', {
        operationId: operationContext.operationId,
        operationType: operationContext.operationType,
        duration: `${duration}ms`,
        ...result,
      });
    } else {
      this.incrementCounter('sync_operations_errors_total', {
        operation_type: operationContext.operationType,
        error_type: result.errorType || 'unknown',
      });

      logger.error('Sync operation failed', {
        operationId: operationContext.operationId,
        operationType: operationContext.operationType,
        duration: `${duration}ms`,
        error: result.error,
        ...result,
      });
    }

    // Check for performance alerts
    this._checkPerformanceAlerts(operationContext.operationType, duration, result);
  }

  /**
   * Record external API request
   */
  recordApiRequest(endpoint, method, startTime) {
    const duration = Date.now() - startTime;

    this.incrementCounter('external_api_requests_total', { endpoint, method });
    this.recordHistogram('external_api_request_duration', duration);

    logger.debug('External API request completed', {
      endpoint,
      method,
      duration: `${duration}ms`,
    });

    // Check for slow API requests
    if (duration > licenseSyncConfig.external.timeout * 0.8) {
      this.createAlert('warning', 'SLOW_API_REQUEST', {
        endpoint,
        method,
        duration,
        threshold: licenseSyncConfig.external.timeout * 0.8,
      });
    }
  }

  /**
   * Record external API error
   */
  recordApiError(endpoint, method, error) {
    this.incrementCounter('external_api_errors_total', {
      endpoint,
      method,
      error_type: this._classifyError(error),
    });

    logger.warn('External API error recorded', {
      endpoint,
      method,
      error: error.message,
      errorType: this._classifyError(error),
    });
  }

  /**
   * Record data processing metrics
   */
  recordDataProcessed(count, operationType) {
    this.incrementCounter('sync_data_processed_total', { operation_type: operationType }, count);

    logger.debug('Data processing recorded', {
      count,
      operationType,
    });
  }

  /**
   * Record memory usage
   */
  recordMemoryUsage(peakUsage) {
    this.setGauge('sync_memory_peak_usage', peakUsage);

    // Alert on high memory usage
    if (peakUsage > 100 * 1024 * 1024) {
      // 100MB
      this.createAlert('warning', 'HIGH_MEMORY_USAGE', {
        peakUsage,
        threshold: '100MB',
      });
    }
  }

  /**
   * Record database operation
   */
  recordDatabaseOperation(operationType, startTime, success = true) {
    const duration = Date.now() - startTime;

    this.incrementCounter('database_operations_total', {
      operation_type: operationType,
      success: success.toString(),
    });
    this.recordHistogram('database_operation_duration', duration);

    if (!success) {
      logger.warn('Database operation failed', {
        operationType,
        duration: `${duration}ms`,
      });
    }

    // Check for slow database operations
    if (duration > 1000) {
      // 1 second
      this.createAlert('warning', 'SLOW_DATABASE_OPERATION', {
        operationType,
        duration,
        threshold: '1000ms',
      });
    }
  }

  /**
   * Record validation error
   */
  recordValidationError(field, errorType, severity = 'warning') {
    this.incrementCounter('validation_errors_total', {
      field,
      error_type: errorType,
      severity,
    });

    if (severity === 'error') {
      logger.error('Validation error recorded', {
        field,
        errorType,
        severity,
      });
    } else {
      logger.warn('Validation warning recorded', {
        field,
        errorType,
        severity,
      });
    }
  }

  /**
   * Create an alert
   */
  createAlert(severity, type, details) {
    const alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      severity, // 'info', 'warning', 'error', 'critical'
      type,
      details,
      timestamp: new Date(),
      acknowledged: false,
    };

    this.alerts.push(alert);

    // Keep only last 100 alerts to prevent memory issues
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    logger.warn(`Alert: ${type} [${severity}]`, { alertId: alert.id });

    if (severity === 'critical') {
      logger.error(`CRITICAL ALERT: ${type}`, { alertId: alert.id, details });
    }
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    const metrics = {};

    // Safety check for metrics Map
    if (!this.metrics || !(this.metrics instanceof Map)) {
      logger.warn('Metrics Map not properly initialized in getMetrics()');
      return metrics;
    }

    try {
      for (const [key, metric] of this.metrics.entries()) {
        if (!metric) {
          continue;
        }

        metrics[key] = {
          type: metric.type,
          value: metric.value,
          labels:
            metric.labels && metric.labels instanceof Map
              ? Object.fromEntries(metric.labels)
              : undefined,
          ...(metric.buckets && { buckets: metric.buckets }),
        };
      }
    } catch (error) {
      logger.error('Error in getMetrics()', { error: error.message, stack: error.stack });
    }

    return metrics;
  }

  /**
   * Get active alerts
   */
  getAlerts(options = {}) {
    let filteredAlerts = this.alerts;

    if (options.severity) {
      filteredAlerts = filteredAlerts.filter((alert) => alert.severity === options.severity);
    }

    if (options.acknowledged !== undefined) {
      filteredAlerts = filteredAlerts.filter(
        (alert) => alert.acknowledged === options.acknowledged
      );
    }

    if (options.limit) {
      filteredAlerts = filteredAlerts.slice(-options.limit);
    }

    return filteredAlerts;
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId) {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = new Date();

      logger.info('Alert acknowledged', {
        alertId,
        type: alert.type,
        severity: alert.severity,
      });
    }
  }

  /**
   * Get health status
   */
  getHealthStatus() {
    return {
      overall: this.healthStatus.overall,
      lastCheck: this.healthStatus.lastCheck,
      components: Object.fromEntries(this.healthStatus.components),
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
    };
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    const metrics = this.getMetrics();

    return {
      syncOperations: {
        total: metrics.sync_operations_total?.value || 0,
        errors: metrics.sync_operations_errors_total?.value || 0,
        active: metrics.sync_active_operations?.value || 0,
        avgDuration: this._calculateAverage(metrics.sync_operations_duration?.value || []),
      },
      externalApi: {
        totalRequests: metrics.external_api_requests_total?.value || 0,
        errors: metrics.external_api_errors_total?.value || 0,
        avgResponseTime: this._calculateAverage(metrics.external_api_request_duration?.value || []),
      },
      database: {
        totalOperations: metrics.database_operations_total?.value || 0,
        avgResponseTime: this._calculateAverage(metrics.database_operation_duration?.value || []),
      },
      dataProcessed: metrics.sync_data_processed_total?.value || 0,
      peakMemoryUsage: metrics.sync_memory_peak_usage?.value || 0,
      validationErrors: metrics.validation_errors_total?.value || 0,
    };
  }

  // Private helper methods

  incrementCounter(name, labels = {}, value = 1) {
    // Safety check for metrics Map
    if (!this.metrics || !(this.metrics instanceof Map)) {
      logger.warn('Metrics Map not initialized in incrementCounter', { name });
      return;
    }

    const metric = this.metrics.get(name);
    if (!metric || metric.type !== 'counter') {
      return;
    }

    metric.value += value;

    // Store labels (ensure labels map exists)
    if (!metric.labels || !(metric.labels instanceof Map)) {
      metric.labels = new Map();
    }

    try {
      const labelKey = JSON.stringify(labels);
      const currentValue = metric.labels.get(labelKey) || 0;
      metric.labels.set(labelKey, currentValue + value);
    } catch (error) {
      logger.error('Error in incrementCounter label handling', {
        name,
        error: error.message,
      });
    }
  }

  recordHistogram(name, value) {
    if (!this.metrics || !(this.metrics instanceof Map)) {
      return;
    }

    const metric = this.metrics.get(name);
    if (!metric || metric.type !== 'histogram') {
      return;
    }

    metric.value.push(value);

    // Keep only last 1000 values to prevent memory issues
    if (metric.value.length > 1000) {
      metric.value = metric.value.slice(-1000);
    }
  }

  setGauge(name, value) {
    if (!this.metrics || !(this.metrics instanceof Map)) {
      return;
    }

    const metric = this.metrics.get(name);
    if (!metric || metric.type !== 'gauge') {
      return;
    }

    metric.value = value;
  }

  incrementGauge(name, delta) {
    if (!this.metrics || !(this.metrics instanceof Map)) {
      return;
    }

    const metric = this.metrics.get(name);
    if (!metric || metric.type !== 'gauge') {
      return;
    }

    metric.value += delta;
  }

  _calculateAverage(values) {
    if (values.length === 0) {
      return 0;
    }
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  _classifyError(error) {
    if (!error || !error.message) {
      return 'unknown';
    }

    const message = error.message.toLowerCase();

    if (message.includes('timeout')) {
      return 'timeout';
    }
    if (message.includes('network') || message.includes('fetch')) {
      return 'network';
    }
    if (message.includes('401') || message.includes('403')) {
      return 'authentication';
    }
    if (message.includes('429')) {
      return 'rate_limit';
    }
    if (message.includes('5')) {
      return 'server_error';
    }
    if (message.includes('4')) {
      return 'client_error';
    }

    return 'unknown';
  }

  _checkPerformanceAlerts(operationType, duration, _result) {
    // Alert on very slow sync operations (10 min threshold for large datasets, ~150 pages)
    if (duration > 600000) {
      this.createAlert('warning', 'VERY_SLOW_SYNC_OPERATION', {
        operationType,
        duration,
        threshold: '10 minutes',
      });
    }

    // Alert on high error rates
    const errorRate = this._calculateErrorRate();
    if (errorRate > 0.1) {
      // 10% error rate
      this.createAlert('error', 'HIGH_ERROR_RATE', {
        errorRate: `${(errorRate * 100).toFixed(1)}%`,
        threshold: '10%',
      });
    }
  }

  _calculateErrorRate() {
    if (!this.metrics || !(this.metrics instanceof Map)) {
      logger.warn('LicenseSyncMonitor metrics not initialized in _calculateErrorRate');
      return 0;
    }

    try {
      const totalOps = this.metrics.get('sync_operations_total')?.value || 0;
      const errors = this.metrics.get('sync_operations_errors_total')?.value || 0;

      return totalOps > 0 ? errors / totalOps : 0;
    } catch (error) {
      logger.error('Error calculating error rate', { error: error.message });
      return 0;
    }
  }

  _startHealthChecks() {
    // Periodic health check every 5 minutes
    setInterval(() => {
      this._performHealthCheck();
    }, licenseSyncConfig.healthCheck.interval);
  }

  async _performHealthCheck() {
    const now = new Date();
    let overallHealth = 'healthy';
    const componentHealth = new Map();

    try {
      // Check memory usage
      const memUsage = process.memoryUsage();
      const memHealth = memUsage.heapUsed < 200 * 1024 * 1024 ? 'healthy' : 'warning'; // 200MB
      componentHealth.set('memory', { status: memHealth, details: memUsage });

      // Check error rates
      const errorRate = this._calculateErrorRate();
      const errorHealth = errorRate < 0.05 ? 'healthy' : errorRate < 0.15 ? 'warning' : 'unhealthy';
      componentHealth.set('error_rate', { status: errorHealth, details: { errorRate } });

      // Check recent activity
      const lastActivity = this._getLastActivityTime();
      const activityHealth = lastActivity && now - lastActivity < 3600000 ? 'healthy' : 'warning'; // 1 hour
      componentHealth.set('activity', { status: activityHealth, details: { lastActivity } });

      // Determine overall health
      const unhealthyComponents = Array.from(componentHealth.values()).filter(
        (c) => c.status !== 'healthy'
      );
      if (unhealthyComponents.length > 0) {
        overallHealth = unhealthyComponents.some((c) => c.status === 'unhealthy')
          ? 'unhealthy'
          : 'warning';
      }
    } catch (error) {
      overallHealth = 'unhealthy';
      componentHealth.set('health_check', {
        status: 'unhealthy',
        details: { error: error.message },
      });
    }

    this.healthStatus.overall = overallHealth;
    this.healthStatus.lastCheck = now;
    this.healthStatus.components = componentHealth;

    if (overallHealth !== 'healthy') {
      logger.warn(`Health status: ${overallHealth}`);
    }
  }

  _getLastActivityTime() {
    if (!this.metrics || !(this.metrics instanceof Map)) {
      return null;
    }

    try {
      const lastTs = this.metrics.get('sync_last_completed_timestamp')?.value;
      if (lastTs && lastTs > 0) {
        return lastTs;
      }
    } catch (error) {
      logger.error('Error getting last activity time', { error: error.message });
    }
    return null;
  }
}

// Export singleton instance
export const licenseSyncMonitor = new LicenseSyncMonitor();
