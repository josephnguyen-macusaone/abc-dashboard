import os from 'os';
import fs from 'fs';
import mongoose from 'mongoose';
import logger from './logger.js';
import { cache } from './redis.js';

class SystemMetrics {
  constructor() {
    this.startTime = process.hrtime.bigint();
    this.cpuUsageStart = process.cpuUsage();
  }

  // System resource metrics
  getSystemMetrics() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    // CPU usage calculation
    const cpuUsage = process.cpuUsage(this.cpuUsageStart);
    this.cpuUsageStart = process.cpuUsage(); // Reset for next measurement

    // Convert to percentage
    const cpuPercent =
      ((cpuUsage.user + cpuUsage.system) / 1000000 / (os.cpus().length * 100)) * 100;

    // Disk usage (basic implementation - can be enhanced)
    let diskUsage = null;
    try {
      const stats = fs.statSync('/');
      const totalSpace = stats.size || 1000000000000; // Fallback 1TB
      const freeSpace = fs.statSync('/').size || 500000000000; // Fallback 500GB
      diskUsage = {
        total: totalSpace,
        free: freeSpace,
        used: totalSpace - freeSpace,
        usedPercent: (((totalSpace - freeSpace) / totalSpace) * 100).toFixed(2),
      };
    } catch (error) {
      logger.warn('Could not get disk usage:', error.message);
    }

    return {
      platform: os.platform(),
      arch: os.arch(),
      release: os.release(),
      hostname: os.hostname(),
      uptime: os.uptime(),
      loadAverage: os.loadavg(),
      cpu: {
        cores: os.cpus().length,
        model: os.cpus()[0].model,
        usagePercent: cpuPercent.toFixed(2),
      },
      memory: {
        total: totalMemory,
        free: freeMemory,
        used: usedMemory,
        usedPercent: ((usedMemory / totalMemory) * 100).toFixed(2),
        external: process.memoryUsage().external,
        rss: process.memoryUsage().rss,
        heapTotal: process.memoryUsage().heapTotal,
        heapUsed: process.memoryUsage().heapUsed,
        heapUsedPercent: (
          (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) *
          100
        ).toFixed(2),
      },
      disk: diskUsage,
      networkInterfaces: Object.keys(os.networkInterfaces()).length,
    };
  }

  // Process-specific metrics
  getProcessMetrics() {
    const uptime = process.uptime();
    const hrtime = process.hrtime.bigint();
    const processUptime = Number(hrtime - this.startTime) / 1000000000; // Convert to seconds

    return {
      pid: process.pid,
      ppid: process.ppid,
      uptime,
      processUptime,
      version: process.version,
      versions: process.versions,
      execPath: process.execPath,
      execArgv: process.execArgv,
      cwd: process.cwd(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
    };
  }
}

class DatabaseMetrics {
  // MongoDB connection metrics
  async getMongoDBMetrics() {
    try {
      // Check if mongoose is connected
      if (mongoose.connection.readyState !== 1) {
        return {
          connected: false,
          readyState: mongoose.connection.readyState,
          name: mongoose.connection.name || null,
          host: mongoose.connection.host || null,
          port: mongoose.connection.port || null,
        };
      }

      const db = mongoose.connection.db;
      if (!db) {
        return {
          connected: false,
          readyState: mongoose.connection.readyState,
          name: mongoose.connection.name || null,
        };
      }

      // Get database stats (this should always work if connected)
      let stats = null;
      try {
        stats = await db.stats();
      } catch (statsError) {
        logger.warn('Could not get database stats:', statsError.message);
      }

      // Get server status (this might fail on some MongoDB versions/configurations)
      let serverStatus = null;
      try {
        serverStatus = await db.admin().serverStatus();
      } catch (serverStatusError) {
        logger.warn('Could not get server status (this is optional):', serverStatusError.message);
        // Server status is optional, continue without it
      }

      return {
        connected: true,
        readyState: mongoose.connection.readyState,
        name: mongoose.connection.name,
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        databaseStats: stats
          ? {
              collections: stats.collections,
              objects: stats.objects,
              avgObjSize: stats.avgObjSize,
              dataSize: stats.dataSize,
              storageSize: stats.storageSize,
              indexes: stats.indexes,
              indexSize: stats.indexSize,
              fileSize: stats.fileSize,
            }
          : null,
        serverStatus: serverStatus
          ? {
              uptime: serverStatus.uptime,
              connections: serverStatus.connections,
              opcounters: serverStatus.opcounters,
              network: serverStatus.network,
              memory: serverStatus.memory,
              asserts: serverStatus.asserts,
            }
          : null,
      };
    } catch (error) {
      logger.warn('Could not get MongoDB metrics:', {
        message: error.message,
        stack: error.stack,
      });
      return {
        connected: mongoose.connection.readyState === 1,
        readyState: mongoose.connection.readyState,
        name: mongoose.connection.name || null,
        error: error.message,
      };
    }
  }
}

class CacheMetrics {
  constructor() {
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.cacheSets = 0;
    this.cacheDeletes = 0;
  }

  recordHit() {
    this.cacheHits++;
  }
  recordMiss() {
    this.cacheMisses++;
  }
  recordSet() {
    this.cacheSets++;
  }
  recordDelete() {
    this.cacheDeletes++;
  }

  async getCacheMetrics() {
    const totalRequests = this.cacheHits + this.cacheMisses;
    const hitRate = totalRequests > 0 ? ((this.cacheHits / totalRequests) * 100).toFixed(2) : 0;

    let cacheStats = null;
    try {
      cacheStats = await cache.stats();
    } catch (error) {
      logger.warn('Could not get cache stats:', error.message);
    }

    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      sets: this.cacheSets,
      deletes: this.cacheDeletes,
      hitRate,
      totalRequests,
      cacheStats,
    };
  }

  reset() {
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.cacheSets = 0;
    this.cacheDeletes = 0;
  }
}

class ApplicationMetrics {
  constructor() {
    this.activeUsers = new Set();
    this.endpointStats = new Map();
    this.securityEvents = {
      failedLogins: 0,
      rateLimitedRequests: 0,
      blockedIPs: new Set(),
      suspiciousActivities: 0,
    };
  }

  recordActiveUser(userId) {
    this.activeUsers.add(userId);
    // Clean up old entries (simple implementation)
    setTimeout(
      () => {
        this.activeUsers.delete(userId);
      },
      30 * 60 * 1000
    ); // Remove after 30 minutes
  }

  recordEndpointCall(endpoint, method, statusCode, responseTime) {
    const key = `${method} ${endpoint}`;
    if (!this.endpointStats.has(key)) {
      this.endpointStats.set(key, {
        calls: 0,
        totalTime: 0,
        avgTime: 0,
        statusCodes: new Map(),
        errors: 0,
      });
    }

    const stats = this.endpointStats.get(key);
    stats.calls++;
    stats.totalTime += responseTime;
    stats.avgTime = stats.totalTime / stats.calls;

    stats.statusCodes.set(statusCode, (stats.statusCodes.get(statusCode) || 0) + 1);

    if (statusCode >= 400) {
      stats.errors++;
    }
  }

  recordFailedLogin() {
    this.securityEvents.failedLogins++;
  }
  recordRateLimitedRequest() {
    this.securityEvents.rateLimitedRequests++;
  }
  recordBlockedIP(ip) {
    this.securityEvents.blockedIPs.add(ip);
  }
  recordSuspiciousActivity() {
    this.securityEvents.suspiciousActivities++;
  }

  getApplicationMetrics() {
    return {
      activeUsers: this.activeUsers.size,
      endpointStats: Object.fromEntries(this.endpointStats),
      security: {
        failedLogins: this.securityEvents.failedLogins,
        rateLimitedRequests: this.securityEvents.rateLimitedRequests,
        blockedIPs: this.securityEvents.blockedIPs.size,
        suspiciousActivities: this.securityEvents.suspiciousActivities,
      },
    };
  }

  reset() {
    this.endpointStats.clear();
    this.securityEvents.failedLogins = 0;
    this.securityEvents.rateLimitedRequests = 0;
    this.securityEvents.suspiciousActivities = 0;
  }
}

// Singleton instances
const systemMetrics = new SystemMetrics();
const databaseMetrics = new DatabaseMetrics();
const cacheMetrics = new CacheMetrics();
const applicationMetrics = new ApplicationMetrics();

// Auto-reset application metrics every 5 minutes
setInterval(
  () => {
    applicationMetrics.reset();
  },
  5 * 60 * 1000
);

// Auto-reset cache metrics every 15 minutes
setInterval(
  () => {
    cacheMetrics.reset();
  },
  15 * 60 * 1000
);

// Comprehensive metrics collector
export const getComprehensiveMetrics = async () => {
  const timestamp = new Date().toISOString();
  const nodeEnv = process.env.NODE_ENV || 'development';
  const nodeVersion = process.version;

  try {
    // Use Promise.allSettled to handle partial failures gracefully
    const results = await Promise.allSettled([
      Promise.resolve(systemMetrics.getSystemMetrics()),
      Promise.resolve(systemMetrics.getProcessMetrics()),
      databaseMetrics.getMongoDBMetrics(),
      cacheMetrics.getCacheMetrics(),
      Promise.resolve(applicationMetrics.getApplicationMetrics()),
    ]);

    // Extract results, handling failures gracefully
    const system = results[0].status === 'fulfilled' ? results[0].value : null;
    const processInfo = results[1].status === 'fulfilled' ? results[1].value : null;
    const database = results[2].status === 'fulfilled' ? results[2].value : { connected: false };
    const cacheData = results[3].status === 'fulfilled' ? results[3].value : { hitRate: 0 };
    const application = results[4].status === 'fulfilled' ? results[4].value : { activeUsers: 0 };

    // Log any failures
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const metricNames = ['system', 'process', 'database', 'cache', 'application'];
        logger.warn(`Failed to collect ${metricNames[index]} metrics:`, {
          error: result.reason?.message || result.reason,
          stack: result.reason?.stack,
        });
      }
    });

    // Ensure we have valid system metrics (they should always succeed)
    if (!system) {
      throw new Error('Failed to collect essential system metrics');
    }

    return {
      timestamp,
      environment: nodeEnv,
      version: nodeVersion,

      system,
      process: processInfo,
      database: database || { connected: false },
      cache: cacheData || { hitRate: 0 },
      application: application || { activeUsers: 0 },

      // Summary metrics for quick overview
      summary: {
        status: 'healthy',
        uptime: processInfo?.uptime || 0,
        memoryUsagePercent: system.memory?.usedPercent || 0,
        cpuUsagePercent: system.cpu?.usagePercent || 0,
        activeUsers: application?.activeUsers || 0,
        cacheHitRate: cacheData?.hitRate || 0,
        databaseConnected: database?.connected || false,
      },
    };
  } catch (error) {
    logger.error('Error collecting comprehensive metrics:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    return {
      timestamp,
      environment: nodeEnv,
      version: nodeVersion,
      error: error.message,
      status: 'error',
      system: null,
      process: null,
      database: { connected: false },
      cache: { hitRate: 0 },
      application: { activeUsers: 0 },
      summary: {
        status: 'error',
        uptime: 0,
        memoryUsagePercent: 0,
        cpuUsagePercent: 0,
        activeUsers: 0,
        cacheHitRate: 0,
        databaseConnected: false,
      },
    };
  }
};

// Export individual metric collectors for middleware use
export { systemMetrics, databaseMetrics, cacheMetrics, applicationMetrics };

export default {
  getComprehensiveMetrics,
  systemMetrics,
  databaseMetrics,
  cacheMetrics,
  applicationMetrics,
};
