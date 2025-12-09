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
  },
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
export { closeDB };
