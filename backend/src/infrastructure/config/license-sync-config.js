import { config } from './config.js';

/**
 * License Sync Configuration
 * Centralized configuration for external license synchronization operations
 */
export const licenseSyncConfig = {
  // External API Configuration
  external: {
    baseUrl: process.env.EXTERNAL_LICENSE_API_URL || 'http://155.138.247.131:2341',
    apiKey: process.env.EXTERNAL_LICENSE_API_KEY,
    timeout: parseInt(process.env.EXTERNAL_LICENSE_API_TIMEOUT_MS) || 30000,
    userAgent: 'ABC-Dashboard-Backend/1.0',
  },

  // Sync Operation Configuration
  sync: {
    // Batch processing
    batchSize: parseInt(process.env.LICENSE_SYNC_BATCH_SIZE) || 50,
    concurrencyLimit: parseInt(process.env.LICENSE_SYNC_CONCURRENCY) || 5,
    maxLicensesForComprehensive: parseInt(process.env.LICENSE_SYNC_MAX_COMPREHENSIVE) || 10000,

    // Timeouts and retries
    defaultTimeout: parseInt(process.env.LICENSE_SYNC_TIMEOUT_MS) || 30000,
    retryAttempts: parseInt(process.env.LICENSE_SYNC_RETRY_ATTEMPTS) || 3,
    retryDelay: parseInt(process.env.LICENSE_SYNC_RETRY_DELAY_MS) || 2000,
    retryBackoffMultiplier: parseFloat(process.env.LICENSE_SYNC_RETRY_BACKOFF_MULTIPLIER) || 2.0,

    // Data processing limits
    maxConcurrentBatches: parseInt(process.env.LICENSE_SYNC_MAX_CONCURRENT_BATCHES) || 5,
    maxRetries: parseInt(process.env.LICENSE_SYNC_MAX_RETRIES) || 5,
  },

  // Monitoring and Observability
  monitoring: {
    enableMetrics: process.env.LICENSE_SYNC_ENABLE_METRICS !== 'false', // Default true
    metricsPrefix: process.env.LICENSE_SYNC_METRICS_PREFIX || 'license_sync',
    enableDetailedLogging: process.env.LICENSE_SYNC_DETAILED_LOGGING === 'true', // Default false
    logLevel: process.env.LICENSE_SYNC_LOG_LEVEL || 'info',
  },

  // Circuit Breaker Configuration
  circuitBreaker: {
    failureThreshold: parseInt(process.env.LICENSE_SYNC_CIRCUIT_FAILURE_THRESHOLD) || 5,
    resetTimeout: parseInt(process.env.LICENSE_SYNC_CIRCUIT_RESET_TIMEOUT_MS) || 60000, // 1 minute
    monitoringPeriod: parseInt(process.env.LICENSE_SYNC_CIRCUIT_MONITORING_PERIOD_MS) || 120000, // 2 minutes
  },

  // Health Check Configuration
  healthCheck: {
    enabled: process.env.LICENSE_SYNC_HEALTH_CHECK_ENABLED !== 'false', // Default true
    interval: parseInt(process.env.LICENSE_SYNC_HEALTH_CHECK_INTERVAL_MS) || 300000, // 5 minutes
    timeout: parseInt(process.env.LICENSE_SYNC_HEALTH_CHECK_TIMEOUT_MS) || 5000,
    failureThreshold: parseInt(process.env.LICENSE_SYNC_HEALTH_CHECK_FAILURE_THRESHOLD) || 3,
  },

  // Database Configuration
  database: {
    maxBulkUpsertBatchSize: parseInt(process.env.LICENSE_SYNC_DB_BULK_BATCH_SIZE) || 100,
    maxIndividualUpdatesBatchSize: parseInt(process.env.LICENSE_SYNC_DB_UPDATE_BATCH_SIZE) || 25,
  },

  // Feature Flags
  features: {
    enableComprehensiveSync: process.env.LICENSE_SYNC_COMPREHENSIVE_ENABLED !== 'false', // Default true
    enableLegacySync: process.env.LICENSE_SYNC_LEGACY_ENABLED !== 'false', // Default true
    enableBidirectionalSync: process.env.LICENSE_SYNC_BIDIRECTIONAL_ENABLED === 'true', // Default false
    enableDryRun: process.env.LICENSE_SYNC_DRY_RUN_ENABLED !== 'false', // Default true
  },

  // Validation Configuration
  validation: {
    strictMode: process.env.LICENSE_SYNC_VALIDATION_STRICT === 'true', // Default false
    maxFieldLength: parseInt(process.env.LICENSE_SYNC_MAX_FIELD_LENGTH) || 1000,
    allowedLicenseTypes: (process.env.LICENSE_SYNC_ALLOWED_TYPES || 'demo,product').split(','),
  },
};

/**
 * Validate configuration on startup
 */
export function validateLicenseSyncConfig() {
  const errors = [];

  // Required configurations
  if (!licenseSyncConfig.external.apiKey) {
    errors.push('EXTERNAL_LICENSE_API_KEY environment variable is required');
  }

  if (!licenseSyncConfig.external.baseUrl) {
    errors.push('EXTERNAL_LICENSE_API_URL environment variable is required');
  }

  // Value validation
  if (licenseSyncConfig.sync.batchSize < 1 || licenseSyncConfig.sync.batchSize > 1000) {
    errors.push('LICENSE_SYNC_BATCH_SIZE must be between 1 and 1000');
  }

  if (licenseSyncConfig.sync.concurrencyLimit < 1 || licenseSyncConfig.sync.concurrencyLimit > 20) {
    errors.push('LICENSE_SYNC_CONCURRENCY must be between 1 and 20');
  }

  if (licenseSyncConfig.sync.maxLicensesForComprehensive < 100 || licenseSyncConfig.sync.maxLicensesForComprehensive > 50000) {
    errors.push('LICENSE_SYNC_MAX_COMPREHENSIVE must be between 100 and 50000');
  }

  if (errors.length > 0) {
    throw new Error(`License sync configuration validation failed:\n${errors.join('\n')}`);
  }
}

// Validate configuration on module load
validateLicenseSyncConfig();

export default licenseSyncConfig;