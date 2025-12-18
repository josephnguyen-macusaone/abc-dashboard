import { config } from './config.js';
import logger from './logger.js';

// Optimized In-memory cache implementation with LRU eviction and better performance
class OptimizedInMemoryCache {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 10000; // Maximum number of items
    this.maxMemoryMB = options.maxMemoryMB || 50; // Maximum memory in MB
    this.cleanupInterval = options.cleanupInterval || 60000; // Cleanup every minute

    // Use Map for O(1) access and LRU tracking
    this.cache = new Map();
    this.accessOrder = new Map(); // Track access order for LRU
    this.expirationQueue = []; // Min-heap for expiration times

    // Statistics
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      startTime: Date.now(),
    };

    // Start cleanup interval
    this.cleanupTimer = setInterval(() => this._cleanup(), this.cleanupInterval);
  }

  async set(key, value, ttl = 300) {
    const expires = Date.now() + ttl * 1000;
    const item = { value, expires, size: this._estimateSize(value) };

    // Check if we're at capacity limits
    if (
      this.cache.size >= this.maxSize ||
      this._getMemoryUsage() + item.size > this.maxMemoryMB * 1024 * 1024
    ) {
      this._evictLRU();
    }

    // Remove existing entry if it exists
    if (this.cache.has(key)) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
    }

    // Add new entry
    this.cache.set(key, item);
    this.accessOrder.set(key, Date.now());
    this._addToExpirationQueue(key, expires);

    this.stats.sets++;
    return true;
  }

  async get(key) {
    const item = this.cache.get(key);
    if (!item) {
      this.stats.misses++;
      return null;
    }

    // Check expiration
    if (Date.now() > item.expires) {
      await this.del(key);
      this.stats.misses++;
      return null;
    }

    // Update access order for LRU
    this.accessOrder.set(key, Date.now());
    this.stats.hits++;
    return item.value;
  }

  async del(key) {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.accessOrder.delete(key);
      this.stats.deletes++;
    }
    return deleted;
  }

  async exists(key) {
    const item = this.cache.get(key);
    if (!item) return false;

    if (Date.now() > item.expires) {
      await this.del(key);
      return false;
    }

    return true;
  }

  async clear() {
    this.cache.clear();
    this.accessOrder.clear();
    this.expirationQueue.length = 0;
    this._resetStats();
    return true;
  }

  async stats() {
    const now = Date.now();
    const uptime = now - this.stats.startTime;

    return {
      memory_usage: `${(this._getMemoryUsage() / (1024 * 1024)).toFixed(2)} MB`,
      keys_count: this.cache.size,
      type: 'optimized-in-memory',
      hit_ratio: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
      total_operations: this.stats.hits + this.stats.misses + this.stats.sets + this.stats.deletes,
      evictions: this.stats.evictions,
      uptime_seconds: Math.floor(uptime / 1000),
    };
  }

  // Batch operations for better performance
  async mget(keys) {
    const results = {};
    for (const key of keys) {
      results[key] = await this.get(key);
    }
    return results;
  }

  async mset(keyValuePairs, ttl = 300) {
    for (const [key, value] of Object.entries(keyValuePairs)) {
      await this.set(key, value, ttl);
    }
    return true;
  }

  async mdel(keys) {
    let deleted = 0;
    for (const key of keys) {
      if (await this.del(key)) deleted++;
    }
    return deleted;
  }

  // Private methods
  _estimateSize(value) {
    // Rough estimation of memory usage
    if (typeof value === 'string') return value.length * 2; // UTF-16
    if (typeof value === 'number') return 8;
    if (typeof value === 'boolean') return 4;
    if (value === null || value === undefined) return 8;
    if (Array.isArray(value)) return value.length * 8; // rough estimate
    if (typeof value === 'object') return JSON.stringify(value).length * 2;
    return 64; // fallback
  }

  _getMemoryUsage() {
    let total = 0;
    for (const item of this.cache.values()) {
      total += item.size;
    }
    return total;
  }

  _evictLRU() {
    if (this.accessOrder.size === 0) return;

    // Find least recently used key
    let lruKey = null;
    let oldestAccess = Date.now();

    for (const [key, accessTime] of this.accessOrder) {
      if (accessTime < oldestAccess) {
        oldestAccess = accessTime;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
      this.accessOrder.delete(lruKey);
      this.stats.evictions++;
    }
  }

  _addToExpirationQueue(key, expires) {
    this.expirationQueue.push({ key, expires });
    // Simple sort - in production, use a proper min-heap
    this.expirationQueue.sort((a, b) => a.expires - b.expires);
  }

  _cleanup() {
    const now = Date.now();
    const expired = [];

    // Remove expired items
    for (const [key, item] of this.cache) {
      if (now > item.expires) {
        expired.push(key);
      }
    }

    for (const key of expired) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
    }

    // Clean up expiration queue
    this.expirationQueue = this.expirationQueue.filter((item) => {
      if (now > item.expires) {
        this.cache.delete(item.key);
        this.accessOrder.delete(item.key);
        return false;
      }
      return true;
    });
  }

  _resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      startTime: Date.now(),
    };
  }

  // Cleanup on destruction
  destroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.clear();
  }
}

const inMemoryCache = new OptimizedInMemoryCache({
  maxSize: 10000, // Maximum 10k items
  maxMemoryMB: 50, // Maximum 50MB memory usage
  cleanupInterval: 60000, // Cleanup every minute
});

export const cache = {
  set(key, value, ttl = config.CACHE_API_RESPONSE_TTL) {
    return inMemoryCache.set(key, value, ttl);
  },
  get(key) {
    return inMemoryCache.get(key);
  },
  del(key) {
    return inMemoryCache.del(key);
  },
  exists(key) {
    return inMemoryCache.exists(key);
  },
  clear() {
    return inMemoryCache.clear();
  },
  async stats() {
    try {
      // Directly call the inMemoryCache stats method
      if (inMemoryCache && typeof inMemoryCache.stats === 'function') {
        return await inMemoryCache.stats();
      } else {
        // Fallback stats if inMemoryCache is not available
        return {
          memory_usage: '0 MB',
          keys_count: 0,
          type: 'optimized-in-memory',
          hit_ratio: 0,
          total_operations: 0,
          evictions: 0,
          uptime_seconds: 0,
        };
      }
    } catch (error) {
      // Return fallback stats on any error
      return {
        memory_usage: '0 MB',
        keys_count: 0,
        type: 'optimized-in-memory',
        hit_ratio: 0,
        total_operations: 0,
        evictions: 0,
        uptime_seconds: 0,
      };
    }
  },
  // Batch operations for better performance
  mget(keys) {
    return inMemoryCache.mget(keys);
  },
  mset(keyValuePairs, ttl = config.CACHE_API_RESPONSE_TTL) {
    return inMemoryCache.mset(keyValuePairs, ttl);
  },
  mdel(keys) {
    return inMemoryCache.mdel(keys);
  },
  // Health check
  async ping() {
    try {
      await this.set('__ping__', 'pong', 1);
      const result = await this.get('__ping__');
      await this.del('__ping__');
      return result === 'pong';
    } catch {
      return false;
    }
  },
};

export const cacheKeys = {
  user: (userId) => `user:${userId}`,
  userProfile: (userId) => `user:profile:${userId}`,
  apiResponse: (method, url, query = '') => `api:${method}:${url}:${query}`,
  userStats: (userId) => `user:stats:${userId}`,
};

export const cacheTTL = {
  userData: config.CACHE_USER_DATA_TTL,
  apiResponse: config.CACHE_API_RESPONSE_TTL,
};

export const initRedis = async () => {
  logger.debug('Redis disabled: using in-memory cache only');
  return false;
};

export const getRedisClient = () => null;

export const closeRedis = async () => true;

export default {
  initRedis,
  getRedisClient,
  closeRedis,
  cache,
  cacheKeys,
  cacheTTL,
};
