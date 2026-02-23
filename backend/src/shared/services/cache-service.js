/**
 * Cache Service
 * In-memory caching with TTL support
 * Can be easily replaced with Redis in production
 */

import logger from '../../infrastructure/config/logger.js';

class CacheService {
  constructor() {
    this.cache = new Map();
    this.ttls = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
    };
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {any} Cached value or undefined
   */
  get(key) {
    // Check if key exists
    if (!this.cache.has(key)) {
      this.stats.misses++;
      return undefined;
    }

    // Check if expired
    const ttl = this.ttls.get(key);
    if (ttl && Date.now() > ttl) {
      this.delete(key);
      this.stats.misses++;
      return undefined;
    }

    this.stats.hits++;
    return this.cache.get(key);
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds (default: 5 minutes)
   */
  set(key, value, ttl = 300) {
    this.cache.set(key, value);
    this.ttls.set(key, Date.now() + ttl * 1000);
    this.stats.sets++;

    logger.debug('Cache set', {
      key,
      ttl,
      size: this.cache.size,
    });
  }

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   */
  delete(key) {
    this.cache.delete(key);
    this.ttls.delete(key);
    this.stats.deletes++;

    logger.debug('Cache delete', { key });
  }

  /**
   * Clear cache by pattern
   * @param {string} pattern - Pattern to match (e.g., "users:*")
   */
  clearPattern(pattern) {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    let count = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.delete(key);
        count++;
      }
    }

    logger.info('Cache cleared by pattern', { pattern, count });
    return count;
  }

  /**
   * Clear all cache
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    this.ttls.clear();

    logger.info('Cache cleared', { clearedItems: size });
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getStats() {
    const hitRate =
      this.stats.hits + this.stats.misses > 0
        ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100
        : 0;

    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: `${hitRate.toFixed(2)}%`,
    };
  }

  /**
   * Get or set value in cache (convenience method)
   * @param {string} key - Cache key
   * @param {Function} factory - Function to generate value if not cached
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<any>} Cached or generated value
   */
  async remember(key, factory, ttl = 300) {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await factory();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * Cleanup expired entries
   */
  cleanup() {
    const now = Date.now();
    let count = 0;

    for (const [key, ttl] of this.ttls.entries()) {
      if (ttl && now > ttl) {
        this.delete(key);
        count++;
      }
    }

    if (count > 0) {
      logger.debug('Cache cleanup', { expiredItems: count });
    }

    return count;
  }

  /**
   * Start automatic cleanup interval
   * @param {number} intervalMs - Cleanup interval in milliseconds (default: 1 minute)
   */
  startCleanup(intervalMs = 60000) {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, intervalMs);

    logger.info('Cache cleanup started', { intervalMs });
  }

  /**
   * Stop automatic cleanup
   */
  stopCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      logger.info('Cache cleanup stopped');
    }
  }
}

// Create singleton instance
const cacheService = new CacheService();

// Start automatic cleanup
cacheService.startCleanup();

/**
 * Cache key builders for consistency
 */
export const CacheKeys = {
  // User cache keys
  user: (id) => `user:${id}`,
  users: (filters) => `users:${JSON.stringify(filters)}`,
  userStats: () => 'users:stats',

  // License cache keys
  license: (id) => `license:${id}`,
  licenses: (filters) => `licenses:${JSON.stringify(filters)}`,
  licenseStats: () => 'licenses:stats',
  expiringLicenses: (days) => `licenses:expiring:${days}`,

  // Assignment cache keys
  userAssignments: (userId) => `assignments:user:${userId}`,
  licenseAssignments: (licenseId) => `assignments:license:${licenseId}`,

  // Audit cache keys
  auditTrail: (entityType, entityId) => `audit:${entityType}:${entityId}`,
};

/**
 * Cache TTL values (in seconds)
 */
export const CacheTTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 900, // 15 minutes
  HOUR: 3600, // 1 hour
  DAY: 86400, // 24 hours
};

/**
 * Cache invalidation helpers
 */
export const CacheInvalidation = {
  /**
   * Invalidate user-related cache
   */
  user: (userId) => {
    cacheService.delete(CacheKeys.user(userId));
    cacheService.clearPattern('users:*');
    cacheService.delete(CacheKeys.userStats());
    cacheService.clearPattern(`assignments:user:${userId}*`);
  },

  /**
   * Invalidate all users cache
   */
  allUsers: () => {
    cacheService.clearPattern('user:*');
    cacheService.clearPattern('users:*');
    cacheService.delete(CacheKeys.userStats());
  },

  /**
   * Invalidate license-related cache
   */
  license: (licenseId) => {
    cacheService.delete(CacheKeys.license(licenseId));
    cacheService.clearPattern('licenses:*');
    cacheService.delete(CacheKeys.licenseStats());
    cacheService.clearPattern(`assignments:license:${licenseId}*`);
  },

  /**
   * Invalidate all licenses cache
   */
  allLicenses: () => {
    cacheService.clearPattern('license:*');
    cacheService.clearPattern('licenses:*');
    cacheService.delete(CacheKeys.licenseStats());
  },

  /**
   * Invalidate assignment-related cache
   */
  assignment: (userId, licenseId) => {
    cacheService.clearPattern(`assignments:user:${userId}*`);
    cacheService.clearPattern(`assignments:license:${licenseId}*`);
    CacheInvalidation.license(licenseId); // License data changed
  },
};

export { cacheService };
export default cacheService;
