/**
 * Error Monitoring and Alerting System
 * Provides comprehensive error tracking, metrics, and alerting capabilities
 */

import logger from '../../infrastructure/config/logger.js';

/**
 * Error severity levels
 */
export const ErrorSeverity = {
  LOW: 'low',       // Informational errors, user mistakes
  MEDIUM: 'medium', // Application errors that affect functionality
  HIGH: 'high',     // Critical errors that break core features
  CRITICAL: 'critical' // System-level failures requiring immediate attention
};

/**
 * Alert levels
 */
export const AlertLevel = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical'
};

/**
 * Error Monitor Class
 * Tracks errors, calculates metrics, and provides alerting capabilities
 */
export class ErrorMonitor {
  constructor(config = {}) {
    this.config = {
      metricsWindow: 300000, // 5 minutes window for rate calculations
      alertThresholds: {
        [ErrorSeverity.LOW]: 100,     // errors per minute
        [ErrorSeverity.MEDIUM]: 50,
        [ErrorSeverity.HIGH]: 10,
        [ErrorSeverity.CRITICAL]: 1
      },
      alertCooldown: 300000, // 5 minutes between similar alerts
      maxMetricsHistory: 1000, // Maximum error records to keep in memory
      ...config
    };

    // Error tracking data
    this.errors = [];
    this.alerts = new Map(); // alertKey -> lastAlertTime
    this.metrics = {
      total: 0,
      bySeverity: {
        [ErrorSeverity.LOW]: 0,
        [ErrorSeverity.MEDIUM]: 0,
        [ErrorSeverity.HIGH]: 0,
        [ErrorSeverity.CRITICAL]: 0
      },
      byCategory: new Map(),
      byOperation: new Map(),
      byStatusCode: new Map(),
      rates: {
        [ErrorSeverity.LOW]: 0,
        [ErrorSeverity.MEDIUM]: 0,
        [ErrorSeverity.HIGH]: 0,
        [ErrorSeverity.CRITICAL]: 0
      },
      recentErrors: [],
      lastUpdated: Date.now()
    };

    // Start cleanup interval
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000); // Clean every minute
  }

  /**
   * Record an error occurrence
   * @param {Error} error - The error that occurred
   * @param {Object} context - Additional context information
   */
  recordError(error, context = {}) {
    const now = Date.now();

    // Create error record
    const errorRecord = {
      timestamp: now,
      error: {
        name: error.name || 'UnknownError',
        message: error.message || 'Unknown error',
        stack: error.stack,
        code: error.code,
        statusCode: error.statusCode,
        category: error.category
      },
      context: {
        operation: context.operation,
        userId: context.userId,
        correlationId: context.correlationId,
        userAgent: context.userAgent,
        ip: context.ip,
        url: context.url,
        method: context.method,
        ...context
      },
      severity: this._determineSeverity(error, context)
    };

    // Add to errors array
    this.errors.push(errorRecord);
    this.metrics.recentErrors.push(errorRecord);

    // Update metrics
    this._updateMetrics(errorRecord);

    // Check for alerts
    this._checkAlerts(errorRecord);

    // Log the error with monitoring context
    this._logError(errorRecord);

    // Limit memory usage
    if (this.errors.length > this.config.maxMetricsHistory) {
      this.errors.shift();
    }

    if (this.metrics.recentErrors.length > 100) {
      this.metrics.recentErrors.shift();
    }
  }

  /**
   * Get current error metrics
   */
  getMetrics() {
    this._calculateRates();
    return {
      ...this.metrics,
      timestamp: Date.now(),
      windowSize: this.config.metricsWindow
    };
  }

  /**
   * Get health status based on error rates
   */
  getHealthStatus() {
    const metrics = this.getMetrics();
    const health = {
      status: 'healthy',
      score: 100,
      issues: []
    };

    // Check each severity level against thresholds
    Object.entries(metrics.rates).forEach(([severity, rate]) => {
      const threshold = this.config.alertThresholds[severity];
      if (rate > threshold) {
        health.issues.push({
          severity,
          currentRate: rate,
          threshold,
          exceededBy: rate - threshold
        });
        health.score -= this._getSeverityPenalty(severity);
      }
    });

    // Determine overall status
    if (health.score < 50) {
      health.status = 'critical';
    } else if (health.score < 75) {
      health.status = 'unhealthy';
    } else if (health.score < 90) {
      health.status = 'degraded';
    }

    health.score = Math.max(0, health.score);

    return health;
  }

  /**
   * Get recent errors with filtering
   * @param {Object} filters - Filter options
   */
  getRecentErrors(filters = {}) {
    let filteredErrors = [...this.metrics.recentErrors];

    // Apply filters
    if (filters.severity) {
      filteredErrors = filteredErrors.filter(e => e.severity === filters.severity);
    }

    if (filters.category) {
      filteredErrors = filteredErrors.filter(e => e.error.category === filters.category);
    }

    if (filters.operation) {
      filteredErrors = filteredErrors.filter(e => e.context.operation === filters.operation);
    }

    if (filters.since) {
      filteredErrors = filteredErrors.filter(e => e.timestamp >= filters.since);
    }

    if (filters.limit) {
      filteredErrors = filteredErrors.slice(-filters.limit);
    }

    return filteredErrors.reverse(); // Most recent first
  }

  /**
   * Force an alert for testing or manual triggering
   */
  forceAlert(severity, message, context = {}) {
    const alertKey = `forced_${severity}_${Date.now()}`;
    this._sendAlert(severity, message, { ...context, forced: true }, alertKey);
  }

  /**
   * Reset metrics (useful for testing)
   */
  reset() {
    this.errors = [];
    this.alerts.clear();
    this.metrics = {
      total: 0,
      bySeverity: {
        [ErrorSeverity.LOW]: 0,
        [ErrorSeverity.MEDIUM]: 0,
        [ErrorSeverity.HIGH]: 0,
        [ErrorSeverity.CRITICAL]: 0
      },
      byCategory: new Map(),
      byOperation: new Map(),
      byStatusCode: new Map(),
      rates: {
        [ErrorSeverity.LOW]: 0,
        [ErrorSeverity.MEDIUM]: 0,
        [ErrorSeverity.HIGH]: 0,
        [ErrorSeverity.CRITICAL]: 0
      },
      recentErrors: [],
      lastUpdated: Date.now()
    };
  }

  /**
   * Cleanup old data and alerts
   * @private
   */
  cleanup() {
    const now = Date.now();
    const cutoffTime = now - this.config.metricsWindow;

    // Clean old errors
    this.errors = this.errors.filter(error => error.timestamp > cutoffTime);
    this.metrics.recentErrors = this.metrics.recentErrors.filter(error => error.timestamp > cutoffTime);

    // Clean old alerts (allow re-alerting after cooldown)
    for (const [alertKey, lastAlertTime] of this.alerts.entries()) {
      if (now - lastAlertTime > this.config.alertCooldown) {
        this.alerts.delete(alertKey);
      }
    }

    // Recalculate metrics after cleanup
    this._recalculateMetrics();
  }

  /**
   * Shutdown the monitor
   */
  shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  // Private methods

  _determineSeverity(error, context) {
    // Critical errors
    if (error.statusCode >= 500 ||
        error.name === 'ExternalServiceUnavailableException' ||
        context.operation === 'database_connection') {
      return ErrorSeverity.CRITICAL;
    }

    // High severity errors
    if (error.statusCode === 429 ||
        error.name === 'RateLimitExceededException' ||
        context.operation?.includes('auth')) {
      return ErrorSeverity.HIGH;
    }

    // Medium severity errors
    if (error.statusCode >= 400 ||
        error.name === 'ValidationException') {
      return ErrorSeverity.MEDIUM;
    }

    // Low severity (default)
    return ErrorSeverity.LOW;
  }

  _updateMetrics(errorRecord) {
    const { severity, error, context } = errorRecord;

    this.metrics.total++;
    this.metrics.bySeverity[severity]++;

    // Update category metrics
    const category = error.category || 'unknown';
    this.metrics.byCategory.set(category, (this.metrics.byCategory.get(category) || 0) + 1);

    // Update operation metrics
    const operation = context.operation || 'unknown';
    this.metrics.byOperation.set(operation, (this.metrics.byOperation.get(operation) || 0) + 1);

    // Update status code metrics
    if (error.statusCode) {
      this.metrics.byStatusCode.set(error.statusCode, (this.metrics.byStatusCode.get(error.statusCode) || 0) + 1);
    }
  }

  _calculateRates() {
    const now = Date.now();
    const windowStart = now - this.config.metricsWindow;
    const windowDurationMinutes = this.config.metricsWindow / 60000;

    // Count errors in the current window
    const windowErrors = this.errors.filter(error => error.timestamp > windowStart);

    // Calculate rates by severity
    Object.keys(this.metrics.rates).forEach(severity => {
      const severityErrors = windowErrors.filter(error => error.severity === severity);
      this.metrics.rates[severity] = severityErrors.length / windowDurationMinutes;
    });

    this.metrics.lastUpdated = now;
  }

  _recalculateMetrics() {
    // Reset metrics
    this.metrics.total = 0;
    this.metrics.bySeverity = {
      [ErrorSeverity.LOW]: 0,
      [ErrorSeverity.MEDIUM]: 0,
      [ErrorSeverity.HIGH]: 0,
      [ErrorSeverity.CRITICAL]: 0
    };
    this.metrics.byCategory.clear();
    this.metrics.byOperation.clear();
    this.metrics.byStatusCode.clear();

    // Recalculate from remaining errors
    this.errors.forEach(errorRecord => this._updateMetrics(errorRecord));
  }

  _checkAlerts(errorRecord) {
    const { severity } = errorRecord;
    const rate = this.metrics.rates[severity];
    const threshold = this.config.alertThresholds[severity];

    if (rate > threshold) {
      const alertKey = `${severity}_rate_exceeded_${Math.floor(Date.now() / this.config.alertCooldown)}`;
      const lastAlert = this.alerts.get(alertKey);

      // Only alert if we haven't alerted recently for this issue
      if (!lastAlert || (Date.now() - lastAlert) > this.config.alertCooldown) {
        this._sendAlert(severity, `Error rate exceeded for ${severity} severity`, {
          currentRate: rate,
          threshold,
          exceededBy: rate - threshold
        }, alertKey);
      }
    }
  }

  _sendAlert(severity, message, context, alertKey) {
    const alertLevel = this._severityToAlertLevel(severity);

    // Record the alert
    this.alerts.set(alertKey, Date.now());

    // Log the alert
    logger.error('Error Alert Triggered', {
      alertLevel,
      severity,
      message,
      context,
      timestamp: new Date().toISOString(),
      metrics: this.getMetrics()
    });

    // Here you could integrate with external alerting systems
    // (e.g., Slack, PagerDuty, email alerts, etc.)
    // this._sendExternalAlert(alertLevel, message, context);
  }

  _severityToAlertLevel(severity) {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return AlertLevel.CRITICAL;
      case ErrorSeverity.HIGH:
        return AlertLevel.ERROR;
      case ErrorSeverity.MEDIUM:
        return AlertLevel.WARNING;
      default:
        return AlertLevel.INFO;
    }
  }

  _getSeverityPenalty(severity) {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return 50;
      case ErrorSeverity.HIGH:
        return 25;
      case ErrorSeverity.MEDIUM:
        return 10;
      default:
        return 5;
    }
  }

  _logError(errorRecord) {
    const { error, context, severity } = errorRecord;

    const logData = {
      severity,
      operation: context.operation,
      userId: context.userId,
      correlationId: context.correlationId,
      errorName: error.name,
      errorMessage: error.message,
      statusCode: error.statusCode,
      category: error.category,
      stack: error.stack?.split('\n')[1]?.trim() // First line of stack trace
    };

    // Log based on severity
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        logger.error('Critical Error Recorded', logData);
        break;
      case ErrorSeverity.HIGH:
        logger.error('High Severity Error Recorded', logData);
        break;
      case ErrorSeverity.MEDIUM:
        logger.warn('Medium Severity Error Recorded', logData);
        break;
      default:
        logger.info('Low Severity Error Recorded', logData);
    }
  }
}

/**
 * Global error monitor instance
 */
export const errorMonitor = new ErrorMonitor({
  // Custom configuration can be added here
  alertThresholds: {
    [ErrorSeverity.LOW]: 100,
    [ErrorSeverity.MEDIUM]: 50,
    [ErrorSeverity.HIGH]: 10,
    [ErrorSeverity.CRITICAL]: 1
  }
});

/**
 * Error monitoring middleware for Express
 */
export const errorMonitoringMiddleware = (req, res, next) => {
  const startTime = Date.now();

  // Add error recording method to response
  res.recordError = (error, additionalContext = {}) => {
    const context = {
      operation: req.route?.path || req.path,
      method: req.method,
      url: req.originalUrl,
      userId: req.user?.id,
      correlationId: req.correlationId || req.headers['x-correlation-id'],
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      duration: Date.now() - startTime,
      ...additionalContext
    };

    errorMonitor.recordError(error, context);
  };

  next();
};

/**
 * Health check endpoint data
 */
export const getHealthCheckData = () => {
  return {
    errorMonitor: {
      metrics: errorMonitor.getMetrics(),
      health: errorMonitor.getHealthStatus(),
      recentErrors: errorMonitor.getRecentErrors({ limit: 10 })
    }
  };
};

export default {
  ErrorMonitor,
  ErrorSeverity,
  AlertLevel,
  errorMonitor,
  errorMonitoringMiddleware,
  getHealthCheckData
};
