import os from 'os';
import fs from 'fs';
import logger from '../../shared/utils/logger.js';
import { cache } from './redis.js';
import { getDB, getDatabaseMetrics } from './database.js';

function toInt(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function formatPgVersion(versionString) {
  if (!versionString) {
    return undefined;
  }
  const [first, second] = String(versionString).split(' ');
  if (!first) {
    return undefined;
  }
  return second ? `${first} ${second}` : first;
}

function computePgCacheHitRatio(stats) {
  const blocksHit = toInt(stats?.blocks_hit, 0);
  const blocksRead = toInt(stats?.blocks_read, 0);
  const denominator = blocksHit + blocksRead;
  if (denominator <= 0) {
    return null;
  }
  return ((blocksHit / denominator) * 100).toFixed(2);
}

function withFallback(value, fallback) {
  if (value === null || value === undefined) {
    return fallback;
  }
  return value;
}

function withFallbackNumber(value, fallback = 0) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback;
  }
  return value;
}

function getDbOrNull() {
  try {
    return getDB();
  } catch {
    return null;
  }
}

async function isPostgresConnected(db) {
  const result = await db.raw('SELECT 1 as connected');
  return Boolean(result?.rows?.length);
}

async function queryPostgresInfo(db) {
  const [dbInfo, tableCount, dbSize, connInfo] = await Promise.all([
    db.raw(`
        SELECT 
          current_database() as database_name,
          current_user as current_user,
          version() as version
      `),
    db.raw(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `),
    db.raw(`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size
      `),
    db.raw(`
        SELECT 
          numbackends as active_connections,
          xact_commit as transactions_committed,
          xact_rollback as transactions_rollback,
          blks_read as blocks_read,
          blks_hit as blocks_hit,
          tup_returned as rows_returned,
          tup_fetched as rows_fetched,
          tup_inserted as rows_inserted,
          tup_updated as rows_updated,
          tup_deleted as rows_deleted
        FROM pg_stat_database 
        WHERE datname = current_database()
      `),
  ]);

  return {
    dbInfoRow: dbInfo?.rows?.[0],
    tableCountRow: tableCount?.rows?.[0],
    dbSizeRow: dbSize?.rows?.[0],
    statsRow: connInfo?.rows?.[0] || {},
  };
}

function getSettledValue(result, fallback) {
  return result?.status === 'fulfilled' ? result.value : fallback;
}

function logMetricsCollectionFailures(results, metricNames) {
  results.forEach((result, index) => {
    if (result.status !== 'rejected') {
      return;
    }
    logger.warn(`Failed to collect ${metricNames[index]} metrics:`, {
      error: result.reason?.message || result.reason,
      stack: result.reason?.stack,
    });
  });
}

function buildHealthyComprehensiveMetricsSummary({
  system,
  processInfo,
  database,
  cacheData,
  application,
}) {
  return {
    status: 'healthy',
    uptime: withFallbackNumber(processInfo?.uptime, 0),
    memoryUsagePercent: withFallbackNumber(system?.memory?.usedPercent, 0),
    cpuUsagePercent: withFallbackNumber(system?.cpu?.usagePercent, 0),
    activeUsers: withFallbackNumber(application?.activeUsers, 0),
    cacheHitRate: withFallbackNumber(cacheData?.hitRate, 0),
    databaseConnected: Boolean(database?.connected),
  };
}

function buildHealthyComprehensiveMetrics({
  timestamp,
  nodeEnv,
  nodeVersion,
  system,
  processInfo,
  database,
  cacheData,
  application,
}) {
  const safeDatabase = withFallback(database, { connected: false });
  const safeCache = withFallback(cacheData, { hitRate: 0 });
  const safeApplication = withFallback(application, { activeUsers: 0 });

  return {
    timestamp,
    environment: nodeEnv,
    version: nodeVersion,

    system,
    process: processInfo,
    database: safeDatabase,
    cache: safeCache,
    application: safeApplication,

    // Summary metrics for quick overview
    summary: buildHealthyComprehensiveMetricsSummary({
      system,
      processInfo,
      database: safeDatabase,
      cacheData: safeCache,
      application: safeApplication,
    }),
  };
}

function buildErrorComprehensiveMetrics({ timestamp, nodeEnv, nodeVersion, errorMessage }) {
  return {
    timestamp,
    environment: nodeEnv,
    version: nodeVersion,
    error: errorMessage,
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
  // PostgreSQL connection metrics
  async getPostgreSQLMetrics() {
    try {
      // Get pool and performance metrics
      const poolMetrics = await getDatabaseMetrics();

      const db = getDbOrNull();
      if (!db) {
        return {
          connected: false,
          error: 'Database not initialized',
          pool: poolMetrics.pool,
          performance: poolMetrics.performance,
        };
      }

      // Test connection
      const connected = await isPostgresConnected(db);
      if (!connected) {
        return {
          connected: false,
          error: 'Connection test failed',
        };
      }

      const { dbInfoRow, tableCountRow, dbSizeRow, statsRow } = await queryPostgresInfo(db);
      const cacheHitRatio = computePgCacheHitRatio(statsRow);

      return {
        connected: true,
        name: dbInfoRow?.database_name,
        user: dbInfoRow?.current_user,
        version: formatPgVersion(dbInfoRow?.version),
        pool: poolMetrics.pool,
        performance: poolMetrics.performance,
        databaseStats: {
          tables: toInt(tableCountRow?.count, 0),
          size: dbSizeRow?.size,
          activeConnections: toInt(statsRow.active_connections, 0),
          transactionsCommitted: toInt(statsRow.transactions_committed, 0),
          transactionsRollback: toInt(statsRow.transactions_rollback, 0),
          cacheHitRatio,
          rowsReturned: toInt(statsRow.rows_returned, 0),
          rowsFetched: toInt(statsRow.rows_fetched, 0),
          rowsInserted: toInt(statsRow.rows_inserted, 0),
          rowsUpdated: toInt(statsRow.rows_updated, 0),
          rowsDeleted: toInt(statsRow.rows_deleted, 0),
        },
      };
    } catch (error) {
      logger.warn('Could not get PostgreSQL metrics:', {
        message: error.message,
        stack: error.stack,
      });
      return {
        connected: false,
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

    // Get cache stats (cache.stats() now handles its own error cases)
    const cacheStats = await cache.stats();

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
    const metricNames = ['system', 'process', 'database', 'cache', 'application'];
    const results = await Promise.allSettled([
      Promise.resolve(systemMetrics.getSystemMetrics()),
      Promise.resolve(systemMetrics.getProcessMetrics()),
      databaseMetrics.getPostgreSQLMetrics(),
      cacheMetrics.getCacheMetrics(),
      Promise.resolve(applicationMetrics.getApplicationMetrics()),
    ]);

    // Extract results, handling failures gracefully
    const system = getSettledValue(results[0], null);
    const processInfo = getSettledValue(results[1], null);
    const database = getSettledValue(results[2], { connected: false });
    const cacheData = getSettledValue(results[3], { hitRate: 0 });
    const application = getSettledValue(results[4], { activeUsers: 0 });

    // Log any failures
    logMetricsCollectionFailures(results, metricNames);

    // Ensure we have valid system metrics (they should always succeed)
    if (!system) {
      throw new Error('Failed to collect essential system metrics');
    }

    return buildHealthyComprehensiveMetrics({
      timestamp,
      nodeEnv,
      nodeVersion,
      system,
      processInfo,
      database,
      cacheData,
      application,
    });
  } catch (error) {
    logger.error('Error collecting comprehensive metrics:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    return buildErrorComprehensiveMetrics({
      timestamp,
      nodeEnv,
      nodeVersion,
      errorMessage: error.message,
    });
  }
};

export { cacheMetrics, applicationMetrics };

export default {
  getComprehensiveMetrics,
  cacheMetrics,
  applicationMetrics,
};
