/**
 * Cache Service
 * Implements caching operations using Redis or in-memory fallback
 */
import { ICacheService } from '../../application/interfaces/index.js';
import logger from '../../infrastructure/config/logger.js';
import { config } from '../../infrastructure/config/config.js';

export class CacheService extends ICacheService {
  constructor(redisClient = null) {
    super();
    this.redisClient = redisClient;
    this.useRedis = config.REDIS_URL && redisClient;

    if (!this.useRedis) {
      logger.warn('Redis not available, falling back to in-memory cache');
      this.memoryCache = new Map();
      this.timeouts = new Map();
    }
  }

  /**
   * Get a value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any>} Cached value or null
   */
  async get(key) {
    try {
      if (this.useRedis) {
        const value = await this.redisClient.get(key);
        return value ? JSON.parse(value) : null;
      } else {
        // In-memory implementation
        const item = this.memoryCache.get(key);
        if (!item) {
          return null;
        }

        if (Date.now() > item.expires) {
          this.memoryCache.delete(key);
          if (this.timeouts.has(key)) {
            clearTimeout(this.timeouts.get(key));
            this.timeouts.delete(key);
          }
          return null;
        }

        return item.value;
      }
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set a value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds (optional)
   * @returns {Promise<boolean>} True if successful
   */
  async set(key, value, ttl = 300) {
    try {
      const serializedValue = JSON.stringify(value);

      if (this.useRedis) {
        await this.redisClient.setex(key, ttl, serializedValue);
        return true;
      } else {
        // In-memory implementation
        this.memoryCache.set(key, {
          value,
          expires: Date.now() + ttl * 1000,
        });

        // Clear existing timeout if any
        if (this.timeouts.has(key)) {
          clearTimeout(this.timeouts.get(key));
        }

        // Set expiration timeout
        const timeout = setTimeout(() => {
          this.memoryCache.delete(key);
          this.timeouts.delete(key);
        }, ttl * 1000);

        this.timeouts.set(key, timeout);
        return true;
      }
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete a key from cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} True if deleted
   */
  async del(key) {
    try {
      if (this.useRedis) {
        await this.redisClient.del(key);
        return true;
      } else {
        // In-memory implementation
        const existed = this.memoryCache.has(key);
        this.memoryCache.delete(key);
        if (this.timeouts.has(key)) {
          clearTimeout(this.timeouts.get(key));
          this.timeouts.delete(key);
        }
        return existed;
      }
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} True if exists
   */
  async exists(key) {
    try {
      if (this.useRedis) {
        return (await this.redisClient.exists(key)) === 1;
      } else {
        // In-memory implementation
        const item = this.memoryCache.get(key);
        return item && Date.now() <= item.expires;
      }
    } catch (error) {
      logger.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Set multiple key-value pairs
   * @param {Object[]} keyValuePairs - Array of { key, value } objects
   * @param {number} ttl - Time to live in seconds (optional)
   * @returns {Promise<boolean>} True if successful
   */
  async mset(keyValuePairs, ttl = 300) {
    try {
      if (this.useRedis) {
        const pipeline = this.redisClient.multi();
        keyValuePairs.forEach(({ key, value }) => {
          pipeline.setex(key, ttl, JSON.stringify(value));
        });
        await pipeline.exec();
        return true;
      } else {
        // In-memory implementation
        const promises = keyValuePairs.map(({ key, value }) => this.set(key, value, ttl));
        await Promise.all(promises);
        return true;
      }
    } catch (error) {
      logger.error('Cache mset error:', error);
      return false;
    }
  }

  /**
   * Clear cache (optionally by pattern)
   * @param {string} pattern - Optional pattern to match keys
   * @returns {Promise<number>} Number of keys cleared
   */
  async clear(pattern = '*') {
    try {
      if (this.useRedis) {
        const keys = await this.redisClient.keys(pattern);
        if (keys.length > 0) {
          await this.redisClient.del(keys);
        }
        return keys.length;
      } else {
        // In-memory implementation - clear all for simplicity
        let cleared = 0;
        for (const key of this.memoryCache.keys()) {
          if (pattern === '*' || key.includes(pattern.replace('*', ''))) {
            this.memoryCache.delete(key);
            if (this.timeouts.has(key)) {
              clearTimeout(this.timeouts.get(key));
              this.timeouts.delete(key);
            }
            cleared++;
          }
        }
        return cleared;
      }
    } catch (error) {
      logger.error(`Cache clear error for pattern ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   * @returns {Promise<Object>} Cache stats (hits, misses, size, etc.)
   */
  async stats() {
    try {
      if (this.useRedis) {
        const info = await this.redisClient.info();
        // Parse Redis info for relevant stats
        const lines = info.split('\n');
        const stats = {};

        lines.forEach((line) => {
          if (line.includes(':')) {
            const [key, value] = line.split(':');
            stats[key] = value;
          }
        });

        return {
          type: 'redis',
          connected_clients: stats.connected_clients,
          used_memory: stats.used_memory,
          total_connections_received: stats.total_connections_received,
          uptime_in_seconds: stats.uptime_in_seconds,
        };
      } else {
        // In-memory implementation
        return {
          type: 'memory',
          size: this.memoryCache.size,
          activeTimeouts: this.timeouts.size,
        };
      }
    } catch (error) {
      logger.error('Cache stats error:', error);
      return { error: error.message };
    }
  }
}

export default CacheService;
