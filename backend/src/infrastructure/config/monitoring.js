import { cache, cacheKeys } from './redis.js';
import logger from '../../shared/utils/logger.js';
import { getComprehensiveMetrics, applicationMetrics } from './metrics.js';
import { errorMonitor } from '../../shared/utils/monitoring/error-monitor.js';
import { gracefulDegradationManager } from '../../shared/utils/reliability/graceful-degradation.js';

function computeOverallHealth({ errorHealth, databaseConnected, apiErrorRate }) {
  let score = 100;
  const issues = [];

  if (errorHealth?.status !== 'healthy') {
    score -= 100 - (errorHealth?.score ?? 0);
    issues.push({
      system: 'error_monitoring',
      status: errorHealth?.status,
      score: errorHealth?.score,
      issues: errorHealth?.issues,
    });
  }

  if (!databaseConnected) {
    score -= 50;
    issues.push({
      system: 'database',
      status: 'disconnected',
      message: 'Database connection failed',
    });
  }

  if (apiErrorRate > 5) {
    score -= Math.min(30, apiErrorRate * 2);
    issues.push({
      system: 'api',
      status: 'high_error_rate',
      errorRate: apiErrorRate,
      message: `API error rate is ${apiErrorRate}%`,
    });
  }

  const clampedScore = Math.max(0, Math.min(100, score));
  let status = 'healthy';
  if (clampedScore < 50) {
    status = 'critical';
  } else if (clampedScore < 75) {
    status = 'unhealthy';
  } else if (clampedScore < 90) {
    status = 'degraded';
  }

  return { status, score: clampedScore, issues };
}

function buildHealthConfig() {
  return {
    port: process.env.PORT || 5000,
    nodeEnv: process.env.NODE_ENV || 'development',
    jwtSecret: process.env.JWT_SECRET ? '✅ Set' : '❌ Missing',
    databaseUrl: process.env.DATABASE_URL || process.env.POSTGRES_HOST ? '✅ Set' : '❌ Missing',
    emailService: process.env.EMAIL_SERVICE || 'not configured',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 14,
  };
}

function buildHealthMessage(status, issuesCount) {
  if (status === 'healthy') {
    return 'All systems operational';
  }
  return `${issuesCount} system(s) have issues`;
}

function buildHealthSystemSection(comprehensiveMetrics) {
  return {
    uptime: comprehensiveMetrics.system?.uptime,
    memoryUsagePercent: comprehensiveMetrics.system?.memory?.usedPercent,
    cpuUsagePercent: comprehensiveMetrics.system?.cpu?.usagePercent,
    loadAverage: comprehensiveMetrics.system?.loadAverage,
    platform: comprehensiveMetrics.system?.platform,
    hostname: comprehensiveMetrics.system?.hostname,
  };
}

function buildHealthDatabaseSection(comprehensiveMetrics) {
  return {
    connected: comprehensiveMetrics.database?.connected,
    name: comprehensiveMetrics.database?.name,
    collections: comprehensiveMetrics.database?.databaseStats?.tables || 0,
    objects: comprehensiveMetrics.database?.databaseStats?.rowsReturned || 0,
  };
}

function buildHealthCacheSection(comprehensiveMetrics) {
  return {
    hitRate: comprehensiveMetrics.cache?.hitRate,
    type: comprehensiveMetrics.cache?.cacheStats?.cache_type || 'in-memory',
    connected: comprehensiveMetrics.cache?.cacheStats?.connected_clients !== undefined,
  };
}

function buildHealthApplicationSection(comprehensiveMetrics) {
  return {
    activeUsers: comprehensiveMetrics.application?.activeUsers,
    endpointCount: Object.keys(comprehensiveMetrics.application?.endpointStats || {}).length,
    securityEvents: comprehensiveMetrics.application?.security,
  };
}

function buildHealthErrorMonitoringSection({ errorHealth, errorMetrics }) {
  return {
    status: errorHealth.status,
    score: errorHealth.score,
    totalErrors: errorMetrics.total,
    errorRates: errorMetrics.rates,
    recentErrorsCount: errorMetrics.recentErrors?.length || 0,
    topErrorCategories: Object.fromEntries(
      Array.from(errorMetrics.byCategory.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
    ),
  };
}

function buildHealthGracefulDegradationSection(degradationStatus) {
  return {
    level: degradationStatus.degradationLevel,
    lastUpdated: degradationStatus.lastUpdated,
    features: degradationStatus.features,
  };
}

function buildHealthLegacyMetricsSection(apiMetrics) {
  return {
    totalRequests: apiMetrics.summary.totalRequests,
    errorRate: apiMetrics.summary.errorRate,
    averageResponseTime: apiMetrics.summary.averageResponseTime,
    medianResponseTime: apiMetrics.summary.medianResponseTime,
    p95ResponseTime: apiMetrics.summary.p95ResponseTime,
  };
}

function buildHealthData({
  req,
  comprehensiveMetrics,
  apiMetrics,
  errorMetrics,
  errorHealth,
  degradationStatus,
  overallHealth,
}) {
  const { status, score, issues } = overallHealth;

  return {
    status,
    score,
    message: buildHealthMessage(status, issues.length),
    correlationId: req.correlationId,
    timestamp: comprehensiveMetrics.timestamp,
    environment: comprehensiveMetrics.environment,
    version: comprehensiveMetrics.version,

    // System health indicators
    system: buildHealthSystemSection(comprehensiveMetrics),

    // Database health
    database: buildHealthDatabaseSection(comprehensiveMetrics),

    // Cache health
    cache: buildHealthCacheSection(comprehensiveMetrics),

    // Application metrics
    application: buildHealthApplicationSection(comprehensiveMetrics),

    // Error monitoring health
    errorMonitoring: buildHealthErrorMonitoringSection({ errorHealth, errorMetrics }),

    // Graceful degradation status
    gracefulDegradation: buildHealthGracefulDegradationSection(degradationStatus),

    // Legacy API metrics (for backward compatibility)
    legacyMetrics: buildHealthLegacyMetricsSection(apiMetrics),

    // Health issues summary
    issues: issues.length > 0 ? issues : undefined,

    // Configuration (safe to expose)
    config: buildHealthConfig(),

    // Detailed metrics available at /api/v1/metrics
    detailedMetricsAvailable: true,
  };
}

function buildFallbackHealthData(req, error) {
  return {
    status: 'DEGRADED',
    message: 'Server is running but metrics collection failed',
    correlationId: req.correlationId,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    error: error.message,
    config: buildHealthConfig(),
  };
}

class APIMonitor {
  constructor() {
    this.metrics = {
      requests: 0,
      errors: 0,
      responseTimes: [],
      endpoints: new Map(),
      statusCodes: new Map(),
    };

    this.resetInterval = 5 * 60 * 1000; // Reset every 5 minutes
    this.maxResponseTimes = 1000; // Keep last 1000 response times
    this.persistenceInterval = 30 * 1000; // Persist metrics every 30 seconds (disabled)
    this.redisEnabled = false; // Redis disabled, using in-memory only

    // Auto-reset metrics periodically (but keep historical data)
    setInterval(() => {
      this.resetMetrics();
    }, this.resetInterval);
  }

  // Record API request
  recordRequest(req, res, responseTime) {
    this.metrics.requests++;

    // Record endpoint statistics
    const endpoint = `${req.method} ${req.route?.path || req.path}`;
    if (!this.metrics.endpoints.has(endpoint)) {
      this.metrics.endpoints.set(endpoint, {
        count: 0,
        totalTime: 0,
        avgTime: 0,
        errors: 0,
      });
    }

    const endpointStats = this.metrics.endpoints.get(endpoint);
    endpointStats.count++;
    endpointStats.totalTime += responseTime;
    endpointStats.avgTime = endpointStats.totalTime / endpointStats.count;

    // Record status code
    const statusCode = res.statusCode || 200;
    this.metrics.statusCodes.set(statusCode, (this.metrics.statusCodes.get(statusCode) || 0) + 1);

    // Record response time
    this.metrics.responseTimes.push(responseTime);
    if (this.metrics.responseTimes.length > this.maxResponseTimes) {
      this.metrics.responseTimes.shift(); // Remove oldest
    }

    // Record error if status code >= 400
    if (statusCode >= 400) {
      this.metrics.errors++;
      endpointStats.errors++;
    }
  }

  // Get current metrics
  getMetrics() {
    const responseTimes = [...this.metrics.responseTimes].sort((a, b) => a - b);
    const totalResponseTime = responseTimes.reduce((sum, time) => sum + time, 0);

    return {
      timestamp: new Date().toISOString(),
      period: `${this.resetInterval / 1000 / 60} minutes`,
      summary: {
        totalRequests: this.metrics.requests,
        totalErrors: this.metrics.errors,
        errorRate:
          this.metrics.requests > 0
            ? ((this.metrics.errors / this.metrics.requests) * 100).toFixed(2)
            : 0,
        averageResponseTime:
          responseTimes.length > 0 ? (totalResponseTime / responseTimes.length).toFixed(2) : 0,
        medianResponseTime:
          responseTimes.length > 0 ? responseTimes[Math.floor(responseTimes.length / 2)] : 0,
        p95ResponseTime:
          responseTimes.length > 0 ? responseTimes[Math.floor(responseTimes.length * 0.95)] : 0,
        p99ResponseTime:
          responseTimes.length > 0 ? responseTimes[Math.floor(responseTimes.length * 0.99)] : 0,
      },
      endpoints: Object.fromEntries(this.metrics.endpoints),
      statusCodes: Object.fromEntries(this.metrics.statusCodes),
    };
  }

  // Reset metrics (in-memory only - no persistence)
  resetMetrics() {
    logger.debug('Resetting API monitoring metrics');

    // No persistence - data will be lost

    // Reset in-memory metrics but keep some historical context
    this.metrics = {
      requests: 0,
      errors: 0,
      responseTimes: [],
      endpoints: new Map(),
      statusCodes: new Map(),
    };
  }

  // Cache metrics response (for API endpoint caching)
  async cacheMetrics() {
    if (!cache) {
      return;
    }

    try {
      const metrics = this.getMetrics();
      await cache.set(cacheKeys.apiResponse('GET', '/metrics'), metrics, 300); // Cache for 5 minutes
    } catch (error) {
      logger.error('Failed to cache metrics:', error);
    }
  }
}

// Create singleton instance
const apiMonitor = new APIMonitor();

// Export apiMonitor for use in other modules
export { apiMonitor };

// Middleware to monitor API requests
export const monitorMiddleware = (req, res, next) => {
  const startTime = Date.now();

  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function (...args) {
    const responseTime = Date.now() - startTime;

    // Record in legacy API monitor
    apiMonitor.recordRequest(req, res, responseTime);

    // Record in new comprehensive metrics
    applicationMetrics.recordEndpointCall(
      req.route?.path || req.path,
      req.method,
      res.statusCode,
      responseTime
    );

    originalEnd.apply(this, args);
  };

  next();
};

// Health check with comprehensive metrics
export const getHealthWithMetrics = async (req, res) => {
  try {
    const comprehensiveMetrics = await getComprehensiveMetrics();
    const apiMetrics = apiMonitor.getMetrics();
    const errorMetrics = errorMonitor.getMetrics();
    const errorHealth = errorMonitor.getHealthStatus();
    const degradationStatus = gracefulDegradationManager.getSystemStatus();

    const apiErrorRate = parseFloat(apiMetrics.summary.errorRate);
    const overallHealth = computeOverallHealth({
      errorHealth,
      databaseConnected: Boolean(comprehensiveMetrics.database?.connected),
      apiErrorRate,
    });

    const healthData = buildHealthData({
      req,
      comprehensiveMetrics,
      apiMetrics,
      errorMetrics,
      errorHealth,
      degradationStatus,
      overallHealth,
    });

    if (res) {
      res.json(healthData);
    }

    return healthData;
  } catch (error) {
    logger.error('Error generating health metrics:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      correlationId: req.correlationId,
    });

    // Fallback to basic health check
    const fallbackData = buildFallbackHealthData(req, error);

    if (res) {
      res.status(200).json(fallbackData); // Still return 200 for health checks
    }

    return fallbackData;
  }
};

// Reset metrics (admin only)
export const resetMetrics = (req, res) => {
  apiMonitor.resetMetrics();

  res.json({
    success: true,
    message: 'Metrics reset successfully',
    correlationId: req.correlationId,
  });
};

export default {
  monitorMiddleware,
  getHealthWithMetrics,
  apiMonitor,
};
