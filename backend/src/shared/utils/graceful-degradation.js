/**
 * Graceful Degradation Utility
 * Provides strategies for handling non-critical failures while maintaining core functionality
 */

import logger from '../../infrastructure/config/logger.js';

/**
 * Degradation level definitions
 */
export const DegradationLevel = {
  NONE: 'none', // Full functionality
  MINOR: 'minor', // Some non-critical features unavailable
  MODERATE: 'moderate', // Multiple non-critical features unavailable
  MAJOR: 'major', // Core features affected but system still operational
  CRITICAL: 'critical', // System severely degraded
};

/**
 * Feature status definitions
 */
export const FeatureStatus = {
  AVAILABLE: 'available',
  DEGRADED: 'degraded',
  UNAVAILABLE: 'unavailable',
};

/**
 * Graceful Degradation Manager
 * Manages feature availability and provides fallback strategies
 */
export class GracefulDegradationManager {
  constructor(correlationId = null) {
    this.features = new Map();
    this.degradationLevel = DegradationLevel.NONE;
    this.lastUpdated = Date.now();
    this.correlationId = correlationId || `gd_${Date.now()}`;

    // Initialize core features
    this.initializeFeatures();
  }

  /**
   * Initialize feature tracking
   */
  initializeFeatures() {
    // Core features (critical for operation)
    this.registerFeature('authentication', {
      critical: true,
      fallback: null,
      healthCheck: () => true, // Always available
    });

    this.registerFeature('database', {
      critical: true,
      fallback: null,
      healthCheck: async () =>
        // Would check database connectivity
        true, // Placeholder
    });

    // Non-critical features
    this.registerFeature('email_service', {
      critical: false,
      fallback: 'log_to_database',
      healthCheck: async () =>
        // Would check email service health
        true, // Placeholder
    });

    this.registerFeature('file_upload', {
      critical: false,
      fallback: 'skip_upload',
      healthCheck: () => true, // Always available (client-side validation)
    });

    this.registerFeature('avatar_processing', {
      critical: false,
      fallback: 'use_default_avatar',
      healthCheck: () => true, // Always available
    });

    this.registerFeature('cache', {
      critical: false,
      fallback: 'no_cache',
      healthCheck: async () =>
        // Would check cache connectivity
        true, // Placeholder
    });

    this.registerFeature('metrics_collection', {
      critical: false,
      fallback: 'reduced_metrics',
      healthCheck: () => true, // Always available (in-memory fallback)
    });

    this.registerFeature('external_apis', {
      critical: false,
      fallback: 'cached_data',
      healthCheck: async () =>
        // Would check external API connectivity
        false, // Assume degraded by default
    });
  }

  /**
   * Register a feature for degradation tracking
   * @param {string} featureName - Name of the feature
   * @param {Object} config - Feature configuration
   */
  registerFeature(featureName, config) {
    this.features.set(featureName, {
      status: FeatureStatus.AVAILABLE,
      lastChecked: Date.now(),
      failureCount: 0,
      config: {
        critical: false,
        fallback: null,
        healthCheck: () => true,
        maxFailures: 3,
        recoveryTime: 300000, // 5 minutes
        ...config,
      },
    });
  }

  /**
   * Report a feature failure
   * @param {string} featureName - Name of the failed feature
   * @param {Error} error - The error that occurred
   * @param {Object} context - Additional context
   */
  reportFailure(featureName, error, context = {}) {
    const feature = this.features.get(featureName);
    if (!feature) {
      logger.warn(`Unknown feature reported failure: ${featureName}`);
      return;
    }

    feature.failureCount++;
    feature.lastChecked = Date.now();

    // Determine if feature should be marked as unavailable
    if (feature.failureCount >= feature.config.maxFailures) {
      this.markFeatureUnavailable(featureName, error, context);
    }

    this.updateDegradationLevel();
  }

  /**
   * Report a feature recovery
   * @param {string} featureName - Name of the recovered feature
   */
  reportRecovery(featureName) {
    const feature = this.features.get(featureName);
    if (!feature) {
      return;
    }

    feature.failureCount = 0;
    feature.status = FeatureStatus.AVAILABLE;
    feature.lastChecked = Date.now();

    logger.info(`Feature recovered: ${featureName}`, {
      timestamp: new Date().toISOString(),
    });

    this.updateDegradationLevel();
  }

  /**
   * Mark a feature as unavailable
   * @private
   */
  markFeatureUnavailable(featureName, error, context) {
    const feature = this.features.get(featureName);
    if (!feature || feature.status === FeatureStatus.UNAVAILABLE) {
      return;
    }

    feature.status = FeatureStatus.UNAVAILABLE;

    logger.warn(`Feature marked unavailable: ${featureName}`, {
      error: error.message,
      context,
      timestamp: new Date().toISOString(),
      degradationLevel: this.degradationLevel,
    });
  }

  /**
   * Check if a feature is available
   * @param {string} featureName - Name of the feature
   */
  isFeatureAvailable(featureName) {
    const feature = this.features.get(featureName);
    return feature?.status === FeatureStatus.AVAILABLE;
  }

  /**
   * Get feature status
   * @param {string} featureName - Name of the feature
   */
  getFeatureStatus(featureName) {
    const feature = this.features.get(featureName);
    if (!feature) {
      return null;
    }

    return {
      name: featureName,
      status: feature.status,
      failureCount: feature.failureCount,
      lastChecked: feature.lastChecked,
      config: feature.config,
    };
  }

  /**
   * Execute a function with graceful degradation
   * @param {string} featureName - Name of the feature
   * @param {Function} primaryFn - Primary function to execute
   * @param {Function} fallbackFn - Fallback function if primary fails
   * @param {Object} context - Execution context
   */
  async executeWithDegradation(featureName, primaryFn, fallbackFn = null, context = {}) {
    const feature = this.features.get(featureName);

    if (!feature) {
      logger.warn(`Unknown feature for degradation execution: ${featureName}`);
      return primaryFn();
    }

    // If feature is unavailable and no fallback, throw error
    if (feature.status === FeatureStatus.UNAVAILABLE && !fallbackFn && !feature.config.fallback) {
      throw new Error(`Feature ${featureName} is currently unavailable`);
    }

    try {
      // Try primary function
      const result = await primaryFn();

      // Report success if feature was previously failed
      if (feature.failureCount > 0) {
        this.reportRecovery(featureName);
      }

      return result;
    } catch (error) {
      // Report failure
      this.reportFailure(featureName, error, context);

      // Try fallback if available
      if (fallbackFn) {
        logger.info(`Using fallback for ${featureName}`, {
          originalError: error.message,
          context,
        });
        return fallbackFn(error);
      }

      // Use configured fallback strategy
      if (feature.config.fallback) {
        return this.executeFallback(featureName, error, context);
      }

      // If no fallback available, re-throw error
      throw error;
    }
  }

  /**
   * Execute configured fallback strategy
   * @private
   */
  async executeFallback(featureName, originalError, context) {
    const feature = this.features.get(featureName);
    const fallbackStrategy = feature.config.fallback;

    logger.info(`Executing fallback strategy for ${featureName}: ${fallbackStrategy}`, {
      originalError: originalError.message,
      context,
    });

    switch (fallbackStrategy) {
      case 'log_to_database':
        // For email service: log notification to database instead
        return this.fallbackLogToDatabase(featureName, originalError, context);

      case 'skip_upload':
        // For file uploads: skip the upload but continue
        return this.fallbackSkipUpload(featureName, originalError, context);

      case 'use_default_avatar':
        // For avatars: use default avatar
        return this.fallbackUseDefaultAvatar(featureName, originalError, context);

      case 'no_cache':
        // For cache: proceed without caching
        return this.fallbackNoCache(featureName, originalError, context);

      case 'reduced_metrics':
        // For metrics: use reduced metric collection
        return this.fallbackReducedMetrics(featureName, originalError, context);

      case 'cached_data':
        // For external APIs: return cached data
        return this.fallbackCachedData(featureName, originalError, context);

      default:
        logger.warn(`Unknown fallback strategy: ${fallbackStrategy} for ${featureName}`);
        throw originalError;
    }
  }

  /**
   * Update overall degradation level based on feature statuses
   * @private
   */
  updateDegradationLevel() {
    const features = Array.from(this.features.values());
    const unavailableCount = features.filter((f) => f.status === FeatureStatus.UNAVAILABLE).length;
    const criticalUnavailable = features.filter(
      (f) => f.status === FeatureStatus.UNAVAILABLE && f.config.critical
    ).length;

    let newLevel = DegradationLevel.NONE;

    if (criticalUnavailable > 0) {
      newLevel = DegradationLevel.CRITICAL;
    } else if (unavailableCount >= features.length * 0.5) {
      newLevel = DegradationLevel.MAJOR;
    } else if (unavailableCount >= features.length * 0.25) {
      newLevel = DegradationLevel.MODERATE;
    } else if (unavailableCount > 0) {
      newLevel = DegradationLevel.MINOR;
    }

    if (newLevel !== this.degradationLevel) {
      logger.info(`System degradation level changed: ${this.degradationLevel} -> ${newLevel}`, {
        unavailableFeatures: unavailableCount,
        criticalUnavailable,
        totalFeatures: features.length,
      });
      this.degradationLevel = newLevel;
    }

    this.lastUpdated = Date.now();
  }

  /**
   * Get current system status
   */
  getSystemStatus() {
    return {
      degradationLevel: this.degradationLevel,
      lastUpdated: this.lastUpdated,
      features: Object.fromEntries(
        Array.from(this.features.entries()).map(([name, feature]) => [
          name,
          {
            status: feature.status,
            failureCount: feature.failureCount,
            lastChecked: feature.lastChecked,
            critical: feature.config.critical,
          },
        ])
      ),
    };
  }

  // Fallback strategy implementations

  async fallbackLogToDatabase(featureName, error, context) {
    // Log the intended email/notification to database for later processing
    logger.info(`Logging ${featureName} action to database for later processing`, {
      context,
      originalError: error.message,
    });

    // In a real implementation, you would save to a notifications table
    return {
      logged: true,
      feature: featureName,
      willRetryLater: true,
      context,
    };
  }

  async fallbackSkipUpload(featureName, error, context) {
    logger.warn(`Skipping ${featureName} due to unavailability`, {
      context,
      originalError: error.message,
    });

    return {
      uploaded: false,
      skipped: true,
      reason: 'service_unavailable',
      feature: featureName,
    };
  }

  async fallbackUseDefaultAvatar(featureName, error, context) {
    logger.warn(`Using default avatar due to ${featureName} failure`, {
      context,
      originalError: error.message,
    });

    return {
      avatarUrl: '/default-avatar.png',
      isDefault: true,
      reason: 'service_unavailable',
    };
  }

  async fallbackNoCache(featureName, error, context) {
    logger.warn(`Proceeding without ${featureName}`, {
      context,
      originalError: error.message,
    });

    return {
      cached: false,
      reason: 'cache_unavailable',
    };
  }

  async fallbackReducedMetrics(featureName, error, context) {
    logger.warn(`Using reduced metrics due to ${featureName} failure`, {
      context,
      originalError: error.message,
    });

    return {
      metrics: 'reduced',
      reason: 'metrics_service_unavailable',
    };
  }

  async fallbackCachedData(featureName, error, context) {
    logger.warn(`Returning cached data due to ${featureName} failure`, {
      context,
      originalError: error.message,
    });

    // In a real implementation, you would fetch from cache
    return {
      data: null,
      cached: true,
      reason: 'external_api_unavailable',
      cacheAge: 'unknown',
    };
  }
}

/**
 * Global graceful degradation manager instance
 */
export const gracefulDegradationManager = new GracefulDegradationManager();

/**
 * Decorator for graceful degradation
 */
export const withGracefulDegradation =
  (featureName, fallbackFn = null) =>
  (target, propertyKey, descriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args) {
      return gracefulDegradationManager.executeWithDegradation(
        featureName,
        () => originalMethod.apply(this, args),
        fallbackFn
      );
    };

    return descriptor;
  };

/**
 * Execute function with graceful degradation
 */
export const executeWithDegradation = (featureName, fn, fallbackFn = null, context = {}) =>
  gracefulDegradationManager.executeWithDegradation(featureName, fn, fallbackFn, context);

export default {
  GracefulDegradationManager,
  DegradationLevel,
  FeatureStatus,
  gracefulDegradationManager,
  withGracefulDegradation,
  executeWithDegradation,
};
