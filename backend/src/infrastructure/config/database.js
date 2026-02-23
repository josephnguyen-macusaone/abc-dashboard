import knex from 'knex';
import logger from './logger.js';
import { config } from './config.js';

let db = null;

/**
 * Get Knex configuration based on environment
 */
export const getKnexConfig = () => ({
  client: 'pg',
  connection: {
    host: config.POSTGRES_HOST,
    port: config.POSTGRES_PORT,
    database: config.POSTGRES_DB,
    user: config.POSTGRES_USER,
    password: config.POSTGRES_PASSWORD,
  },
  pool: {
    min: config.POSTGRES_POOL_MIN,
    max: config.POSTGRES_POOL_MAX,
    acquireTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 100,
    // Enable pool validation
    afterCreate: (conn, cb) => {
      conn.query('SELECT 1', (err) => {
        cb(err, conn);
      });
    },
  },
  // Performance optimizations
  acquireConnectionTimeout: 60000,
  debug: false, // Disable knex debug logging to avoid JSON clutter
  migrations: {
    directory: './src/infrastructure/database/migrations',
    tableName: 'knex_migrations',
  },
  seeds: {
    directory: './src/infrastructure/database/seeds',
  },
});

/**
 * Connect to PostgreSQL database
 */
const connectDB = async (retryCount = 0) => {
  const maxRetries = 5;
  const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 30000); // Exponential backoff, max 30s

  try {
    logger.debug(
      `Attempting to connect to PostgreSQL... (attempt ${retryCount + 1}/${maxRetries})`
    );

    const knexConfig = getKnexConfig();
    db = knex(knexConfig);

    // Test the connection
    await db.raw('SELECT 1');

    logger.debug('PostgreSQL connected successfully');

    // Handle connection pool errors
    db.on('query-error', (error) => {
      logger.error(`PostgreSQL query error: ${error.message}`);
    });

    // Add query performance monitoring (clean logging)
    db.on('query', (query) => {
      const startTime = process.hrtime.bigint();
      query.__startTime = startTime;
    });

    db.on('query-response', (response, query) => {
      if (query.__startTime) {
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - query.__startTime) / 1000000; // Convert to milliseconds

        // Clean query logging - extract table name and operation
        const sql = query.sql.toLowerCase();
        let operation = 'query';
        let table = 'unknown';

        if (sql.includes('select')) {
          operation = 'SELECT';
        } else if (sql.includes('insert')) {
          operation = 'INSERT';
        } else if (sql.includes('update')) {
          operation = 'UPDATE';
        } else if (sql.includes('delete')) {
          operation = 'DELETE';
        }

        // Extract table name from FROM clause
        const fromMatch = sql.match(/from\s+(\w+)/);
        if (fromMatch) {
          table = fromMatch[1];
        }

        // Log slow queries (>100ms)
        if (duration > 100) {
          logger.warn(`[DB] Slow ${operation} on ${table}: ${duration.toFixed(2)}ms`);
        } else if (duration > 10) {
          // Log moderately slow queries for monitoring (only in debug mode)
          logger.debug(`[DB] ${operation} ${table}: ${duration.toFixed(2)}ms`);
        }
      }
    });

    return db;
  } catch (error) {
    logger.warn(
      `PostgreSQL connection attempt ${retryCount + 1}/${maxRetries} failed: ${error.message}`
    );

    if (retryCount < maxRetries) {
      logger.debug(`Retrying PostgreSQL connection in ${retryDelay}ms`);
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
      return connectDB(retryCount + 1);
    } else {
      logger.error(`PostgreSQL connection failed - max retries (${maxRetries}) exceeded`);
      logger.error('CRITICAL: Database connection required for application startup - exiting');
      process.exit(1);
    }
  }
};

/**
 * Get the database instance
 */
export const getDB = () => {
  if (!db) {
    throw new Error('Database not initialized. Call connectDB first.');
  }
  return db;
};

/**
 * Get database performance metrics
 */
const getDatabaseMetrics = async () => {
  if (!db) {
    return {
      connected: false,
      pool: null,
      performance: null,
    };
  }

  try {
    const pool = db.client.pool;
    const startTime = Date.now();

    // Simple performance test query
    await db.raw('SELECT 1 as test');

    const queryTime = Date.now() - startTime;

    return {
      connected: true,
      pool: {
        totalCount: pool.totalCount || 0,
        idleCount: pool.idleCount || 0,
        waitingCount: pool.waitingCount || 0,
        borrowedCount: pool.borrowedCount || 0,
      },
      performance: {
        connectionTimeMs: queryTime,
        isSlow: queryTime > 100, // Flag if connection is slow
      },
    };
  } catch (error) {
    logger.error('Database metrics collection failed:', error.message);
    return {
      connected: false,
      pool: null,
      performance: null,
      error: error.message,
    };
  }
};

/**
 * Close database connection
 */
const closeDB = async () => {
  if (db) {
    await db.destroy();
    db = null;
    logger.debug('PostgreSQL disconnected successfully');
  }
};

export default connectDB;
export { closeDB, getDatabaseMetrics };
