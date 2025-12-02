import { config } from './config.js';
import logger from './logger.js';

// In-memory cache implementation
class InMemoryCache {
  constructor() {
    this.cache = new Map();
    this.timeouts = new Map();
  }

  async set(key, value, ttl = 300) {
    try {
      this.cache.set(key, {
        value,
        expires: Date.now() + ttl * 1000,
      });

      // Clear existing timeout if any
      if (this.timeouts.has(key)) {
        clearTimeout(this.timeouts.get(key));
      }

      // Set expiration timeout
      const timeout = setTimeout(() => {
        this.cache.delete(key);
        this.timeouts.delete(key);
      }, ttl * 1000);

      this.timeouts.set(key, timeout);
      return true;
    } catch (error) {
      logger.error(`In-memory cache set error for key ${key}:`, error);
      return false;
    }
  }

  async get(key) {
    try {
      const item = this.cache.get(key);
      if (!item) {
        return null;
      }

      if (Date.now() > item.expires) {
        this.cache.delete(key);
        if (this.timeouts.has(key)) {
          clearTimeout(this.timeouts.get(key));
          this.timeouts.delete(key);
        }
        return null;
      }

      return item.value;
    } catch (error) {
      logger.error(`In-memory cache get error for key ${key}:`, error);
      return null;
    }
  }

  async del(key) {
    try {
      this.cache.delete(key);
      if (this.timeouts.has(key)) {
        clearTimeout(this.timeouts.get(key));
        this.timeouts.delete(key);
      }
      return true;
    } catch (error) {
      logger.error(`In-memory cache delete error for key ${key}:`, error);
      return false;
    }
  }

  async exists(key) {
    try {
      const item = this.cache.get(key);
      if (!item) {
        return false;
      }

      if (Date.now() > item.expires) {
        this.cache.delete(key);
        if (this.timeouts.has(key)) {
          clearTimeout(this.timeouts.get(key));
          this.timeouts.delete(key);
        }
        return false;
      }

      return true;
    } catch (error) {
      logger.error(`In-memory cache exists error for key ${key}:`, error);
      return false;
    }
  }

  async mset(keyValuePairs, ttl = config.CACHE_API_RESPONSE_TTL) {
    try {
      for (const [key, value] of Object.entries(keyValuePairs)) {
        await this.set(key, value, ttl);
      }
      return true;
    } catch (error) {
      logger.error('In-memory cache mset error:', error);
      return false;
    }
  }

  async clear(_pattern = '*') {
    try {
      // Simple implementation - clear all for now
      // TODO: In a real implementation, filter by pattern
      this.cache.clear();
      for (const timeout of this.timeouts.values()) {
        clearTimeout(timeout);
      }
      this.timeouts.clear();
      logger.info('Cleared in-memory cache');
      return true;
    } catch (error) {
      logger.error('In-memory cache clear error:', error);
      return false;
    }
  }

  async stats() {
    return {
      memory_usage: `${this.cache.size * 1024} bytes`, // Rough estimate
      keys_count: this.cache.size,
      type: 'in-memory',
    };
  }
}

// Create in-memory cache instance
const inMemoryCache = new InMemoryCache();

// Simplified cache operations using only in-memory cache
export const cache = {
  // Set cache value
  set(key, value, ttl = config.CACHE_API_RESPONSE_TTL) {
    return inMemoryCache.set(key, value, ttl);
  },

  // Get cache value
  get(key) {
    return inMemoryCache.get(key);
  },

  // Delete cache key
  del(key) {
    return inMemoryCache.del(key);
  },

  // Check if key exists
  exists(key) {
    return inMemoryCache.exists(key);
  },

  // Set multiple keys
  mset(keyValuePairs, ttl = config.CACHE_API_RESPONSE_TTL) {
    return inMemoryCache.mset(keyValuePairs, ttl);
  },

  // Clear all cache
  clear(pattern = '*') {
    return inMemoryCache.clear(pattern);
  },

  // Get cache statistics
  stats() {
    return inMemoryCache.stats();
  },
};

// Cache key generators
export const cacheKeys = {
  user: (userId) => `user:${userId}`,
  userProfile: (userId) => `user:profile:${userId}`,
  apiResponse: (method, url, query = '') => `api:${method}:${url}:${query}`,
  userStats: (userId) => `user:stats:${userId}`,
};

// Cache TTL constants
export const cacheTTL = {
  userData: config.CACHE_USER_DATA_TTL,
  apiResponse: config.CACHE_API_RESPONSE_TTL,
};

// Stub functions for Redis compatibility (always return false/disabled)
export const initRedis = async () => {
  logger.debug('Redis caching disabled, using in-memory cache');
  return false;
};

export const getRedisClient = () => null;

export const closeRedis = async () =>
  // No-op since Redis is not used
  true;

export default {
  initRedis,
  getRedisClient,
  closeRedis,
  cache,
  cacheKeys,
  cacheTTL,
};
