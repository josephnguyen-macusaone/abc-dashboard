import { cache, cacheKeys } from './redis.js';
import logger from './logger.js';
import { getComprehensiveMetrics, applicationMetrics, cacheMetrics } from './metrics.js';

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
        errorRate: this.metrics.requests > 0 ? (this.metrics.errors / this.metrics.requests * 100).toFixed(2) : 0,
        averageResponseTime: responseTimes.length > 0 ? (totalResponseTime / responseTimes.length).toFixed(2) : 0,
        medianResponseTime: responseTimes.length > 0 ? responseTimes[Math.floor(responseTimes.length / 2)] : 0,
        p95ResponseTime: responseTimes.length > 0 ? responseTimes[Math.floor(responseTimes.length * 0.95)] : 0,
        p99ResponseTime: responseTimes.length > 0 ? responseTimes[Math.floor(responseTimes.length * 0.99)] : 0,
      },
      endpoints: Object.fromEntries(this.metrics.endpoints),
      statusCodes: Object.fromEntries(this.metrics.statusCodes),
    };
  }

  // Reset metrics (in-memory only - no persistence)
  resetMetrics() {
    logger.info('Resetting API monitoring metrics (in-memory only)');

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

  // Load persisted metrics (disabled - Redis removed)
  async loadPersistedMetrics() {
    // Metrics persistence disabled - using in-memory only
    logger.info('Metrics persistence disabled - using in-memory storage only');
  }

  // Persist current metrics (disabled - Redis removed)
  async persistMetrics() {
    // Metrics persistence disabled - data will be lost on restart
    // This is a no-op since we're using in-memory storage only
  }

  // Cache metrics response (for API endpoint caching)
  async cacheMetrics() {
    if (!cache) return;

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

// Middleware to monitor API requests
export const monitorMiddleware = (req, res, next) => {
  const startTime = Date.now();

  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(...args) {
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

    const healthData = {
      status: comprehensiveMetrics.summary?.status || 'OK',
      message: 'Server is running',
      correlationId: req.correlationId,
      timestamp: comprehensiveMetrics.timestamp,
      environment: comprehensiveMetrics.environment,
      version: comprehensiveMetrics.version,

      // System health indicators
      system: {
        uptime: comprehensiveMetrics.system?.uptime,
        memoryUsagePercent: comprehensiveMetrics.system?.memory?.usedPercent,
        cpuUsagePercent: comprehensiveMetrics.system?.cpu?.usagePercent,
        loadAverage: comprehensiveMetrics.system?.loadAverage,
        platform: comprehensiveMetrics.system?.platform,
        hostname: comprehensiveMetrics.system?.hostname
      },

      // Database health
      database: {
        connected: comprehensiveMetrics.database?.connected,
        name: comprehensiveMetrics.database?.name,
        collections: comprehensiveMetrics.database?.databaseStats?.collections,
        objects: comprehensiveMetrics.database?.databaseStats?.objects
      },

      // Cache health
      cache: {
        hitRate: comprehensiveMetrics.cache?.hitRate,
        type: comprehensiveMetrics.cache?.cacheStats?.cache_type || 'in-memory',
        connected: comprehensiveMetrics.cache?.cacheStats?.connected_clients !== undefined
      },

      // Application metrics
      application: {
        activeUsers: comprehensiveMetrics.application?.activeUsers,
        endpointCount: Object.keys(comprehensiveMetrics.application?.endpointStats || {}).length,
        securityEvents: comprehensiveMetrics.application?.security
      },

      // Legacy API metrics (for backward compatibility)
      legacyMetrics: {
        totalRequests: apiMetrics.summary.totalRequests,
        errorRate: apiMetrics.summary.errorRate,
        averageResponseTime: apiMetrics.summary.averageResponseTime,
        medianResponseTime: apiMetrics.summary.medianResponseTime,
        p95ResponseTime: apiMetrics.summary.p95ResponseTime
      },

      // Detailed metrics available at /api/v1/metrics
      detailedMetricsAvailable: true
    };

    if (res) {
      res.json(healthData);
    }

    return healthData;
  } catch (error) {
    logger.error('Error generating health metrics:', error);

    // Fallback to basic health check
    const fallbackData = {
      status: 'DEGRADED',
      message: 'Server is running but metrics collection failed',
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      error: error.message
    };

    if (res) {
      res.status(200).json(fallbackData); // Still return 200 for health checks
    }

    return fallbackData;
  }
};

// Helper function to get health data for dashboard
export const getHealthData = async () => {
  try {
    const comprehensiveMetrics = await getComprehensiveMetrics();
    const apiMetrics = apiMonitor.getMetrics();

    return {
      status: comprehensiveMetrics.summary?.status || 'OK',
      message: 'Server is running',
      timestamp: comprehensiveMetrics.timestamp,
      environment: comprehensiveMetrics.environment,
      uptime: comprehensiveMetrics.system?.uptime,
      memory: comprehensiveMetrics.system?.memory,
      version: comprehensiveMetrics.version,

      // Summary metrics for dashboard
      metrics: {
        requests: apiMetrics.summary.totalRequests,
        errorRate: apiMetrics.summary.errorRate,
        avgResponseTime: apiMetrics.summary.averageResponseTime,
        activeUsers: comprehensiveMetrics.application?.activeUsers,
        memoryUsagePercent: comprehensiveMetrics.system?.memory?.usedPercent,
        cpuUsagePercent: comprehensiveMetrics.system?.cpu?.usagePercent,
        databaseConnected: comprehensiveMetrics.database?.connected,
        cacheHitRate: comprehensiveMetrics.cache?.hitRate
      },

      // System overview
      system: {
        platform: comprehensiveMetrics.system?.platform,
        hostname: comprehensiveMetrics.system?.hostname,
        loadAverage: comprehensiveMetrics.system?.loadAverage,
        diskUsage: comprehensiveMetrics.system?.disk
      }
    };
  } catch (error) {
    logger.error('Error getting health data for dashboard:', error);
    return {
      status: 'ERROR',
      message: 'Failed to collect health data',
      timestamp: new Date().toISOString(),
      error: error.message
    };
  }
};

// Get detailed metrics (admin only)
export const getDetailedMetrics = async (req, res) => {
  try {
    const comprehensiveMetrics = await getComprehensiveMetrics();
    const apiMetrics = apiMonitor.getMetrics();

    res.json({
      success: true,
      correlationId: req.correlationId,
      data: {
        comprehensive: comprehensiveMetrics,
        apiMonitor: apiMetrics,
      },
    });
  } catch (error) {
    logger.error('Error getting detailed metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to collect metrics',
      error: error.message,
      correlationId: req.correlationId
    });
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
  getDetailedMetrics,
  resetMetrics,
  apiMonitor,
};
