import { config } from './config.js';
import logger from './logger.js';
import Redis from 'ioredis';

// Redis client instance
let redisClient = null;
let isRedisEnabled = false;

/**
 * Initialize Redis connection
 */
export const initRedis = async () => {
  const cacheType = process.env.CACHE_TYPE || 'memory';

  if (cacheType !== 'redis') {
    logger.info('Redis disabled: using in-memory cache', { cacheType });
    isRedisEnabled = false;
    return false;
  }

  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    logger.info('Initializing Redis connection', { url: redisUrl });

    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      enableOfflineQueue: true,
      lazyConnect: false,
      retryStrategy(times) {
        if (times > 3) {
          return null;
        }
        const delay = Math.min(times * 50, 2000);
        if (times <= 2) {
          logger.warn(`Redis retry attempt ${times}`, { delay });
        }
        return delay;
      },
      reconnectOnError(err) {
        logger.error('Redis reconnect on error', { error: err.message });
        return true;
      },
    });

    redisClient.on('connect', () => {
      // No log: we log once after ping below
    });

    redisClient.on('ready', () => {
      isRedisEnabled = true;
    });

    redisClient.on('error', (err) => {
      logger.error('Redis error', { error: err.message });
      isRedisEnabled = false;
    });

    redisClient.on('close', () => {
      logger.warn('Redis connection closed');
      isRedisEnabled = false;
    });

    redisClient.on('reconnecting', () => {
      logger.info('Redis reconnecting...');
    });

    await redisClient.ping();
    logger.info('Redis ready', { url: redisUrl });

    isRedisEnabled = true;
    return true;
  } catch (error) {
    logger.error('Failed to initialize Redis, falling back to in-memory cache', {
      error: error.message,
      stack: error.stack,
    });
    isRedisEnabled = false;
    if (redisClient) {
      try {
        redisClient.disconnect();
      } catch (disconnectErr) {
        logger.warn('Redis disconnect on init failure', { error: disconnectErr.message });
      }
      redisClient = null;
    }
    return false;
  }
};

/**
 * Get Redis client (or null if using in-memory)
 */
export const getRedisClient = () => redisClient;

/**
 * Close Redis connection
 */
export const closeRedis = async () => {
  if (redisClient) {
    logger.info('Closing Redis connection');
    await redisClient.quit();
    redisClient = null;
    isRedisEnabled = false;
  }
  return true;
};

/**
 * Optimized In-memory cache (fallback when Redis is unavailable)
 */
class OptimizedInMemoryCache {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 10000;
    this.maxMemoryMB = options.maxMemoryMB || 50;
    this.cleanupInterval = options.cleanupInterval || 60000;

    this.cache = new Map();
    this.accessOrder = new Map();
    this.expirationQueue = [];

    this._stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      startTime: Date.now(),
    };

    this.cleanupTimer = setInterval(() => this._cleanup(), this.cleanupInterval);
  }

  async set(key, value, ttl = 300) {
    const expires = Date.now() + ttl * 1000;
    const item = { value, expires, size: this._estimateSize(value) };

    if (
      this.cache.size >= this.maxSize ||
      this._getMemoryUsage() + item.size > this.maxMemoryMB * 1024 * 1024
    ) {
      this._evictLRU();
    }

    if (this.cache.has(key)) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
    }

    this.cache.set(key, item);
    this.accessOrder.set(key, Date.now());
    this._addToExpirationQueue(key, expires);

    this._stats.sets++;
    return true;
  }

  async get(key) {
    const item = this.cache.get(key);
    if (!item) {
      this._stats.misses++;
      return null;
    }

    if (Date.now() > item.expires) {
      await this.del(key);
      this._stats.misses++;
      return null;
    }

    this.accessOrder.set(key, Date.now());
    this._stats.hits++;
    return item.value;
  }

  async del(key) {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.accessOrder.delete(key);
      this._stats.deletes++;
    }
    return deleted;
  }

  async exists(key) {
    const item = this.cache.get(key);
    if (!item) {
      return false;
    }
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
    const uptime = now - this._stats.startTime;

    return {
      memory_usage: `${(this._getMemoryUsage() / (1024 * 1024)).toFixed(2)} MB`,
      keys_count: this.cache.size,
      type: 'optimized-in-memory',
      cache_type: 'in-memory',
      connected_clients: undefined,
      hit_ratio: this._stats.hits / (this._stats.hits + this._stats.misses) || 0,
      total_operations:
        this._stats.hits + this._stats.misses + this._stats.sets + this._stats.deletes,
      evictions: this._stats.evictions,
      uptime_seconds: Math.floor(uptime / 1000),
    };
  }

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
    let count = 0;
    for (const key of keys) {
      if (await this.del(key)) {
        count++;
      }
    }
    return count;
  }

  _estimateSize(value) {
    const str = JSON.stringify(value);
    return str.length * 2;
  }

  _getMemoryUsage() {
    let total = 0;
    for (const item of this.cache.values()) {
      total += item.size || 0;
    }
    return total;
  }

  _evictLRU() {
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, time] of this.accessOrder.entries()) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.accessOrder.delete(oldestKey);
      this._stats.evictions++;
    }
  }

  _addToExpirationQueue(key, expires) {
    this.expirationQueue.push({ key, expires });
  }

  _cleanup() {
    const now = Date.now();
    const expired = [];

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        expired.push(key);
      }
    }

    for (const key of expired) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
    }

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
    this._stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      startTime: Date.now(),
    };
  }

  destroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.clear();
  }
}

const inMemoryCache = new OptimizedInMemoryCache({
  maxSize: 10000,
  maxMemoryMB: 50,
  cleanupInterval: 60000,
});

function parseRedisInfo(str) {
  const result = {};
  if (!str) {
    return result;
  }
  str.split('\r\n').forEach((line) => {
    const [key, value] = line.split(':');
    if (key && value && !key.startsWith('#')) {
      result[key] = value;
    }
  });
  return result;
}

/**
 * Unified cache interface (works with Redis or in-memory)
 */
export const cache = {
  async set(key, value, ttl = config.CACHE_API_RESPONSE_TTL) {
    try {
      if (isRedisEnabled && redisClient) {
        const serialized = JSON.stringify(value);
        if (ttl > 0) {
          await redisClient.setex(key, ttl, serialized);
        } else {
          await redisClient.set(key, serialized);
        }
        return true;
      }
    } catch (error) {
      logger.warn('Redis set failed, using in-memory fallback', {
        key,
        error: error.message,
      });
    }

    return inMemoryCache.set(key, value, ttl);
  },

  async get(key) {
    try {
      if (isRedisEnabled && redisClient) {
        const value = await redisClient.get(key);
        if (value === null) {
          return null;
        }

        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      }
    } catch (error) {
      logger.warn('Redis get failed, using in-memory fallback', {
        key,
        error: error.message,
      });
    }

    return inMemoryCache.get(key);
  },

  async del(key) {
    try {
      if (isRedisEnabled && redisClient) {
        await redisClient.del(key);
        return true;
      }
    } catch (error) {
      logger.warn('Redis del failed, using in-memory fallback', {
        key,
        error: error.message,
      });
    }

    return inMemoryCache.del(key);
  },

  async exists(key) {
    try {
      if (isRedisEnabled && redisClient) {
        const result = await redisClient.exists(key);
        return result === 1;
      }
    } catch (error) {
      logger.warn('Redis exists failed, using in-memory fallback', {
        key,
        error: error.message,
      });
    }

    return inMemoryCache.exists(key);
  },

  async clear() {
    try {
      if (isRedisEnabled && redisClient) {
        await redisClient.flushdb();
        return true;
      }
    } catch (error) {
      logger.warn('Redis clear failed, using in-memory fallback', {
        error: error.message,
      });
    }

    return inMemoryCache.clear();
  },

  async stats() {
    try {
      if (isRedisEnabled && redisClient) {
        const [infoStats, infoMemory, infoClients, dbsize] = await Promise.all([
          redisClient.info('stats'),
          redisClient.info('memory'),
          redisClient.info('clients'),
          redisClient.dbsize(),
        ]);

        const statsData = parseRedisInfo(infoStats);
        const memData = parseRedisInfo(infoMemory);
        const clientsData = parseRedisInfo(infoClients);

        const hits = parseFloat(statsData.keyspace_hits || 0);
        const misses = parseFloat(statsData.keyspace_misses || 0);
        const hitRatio = hits + misses > 0 ? hits / (hits + misses) : 0;

        return {
          memory_usage: memData.used_memory_human || '0B',
          keys_count: dbsize,
          type: 'redis',
          cache_type: 'redis',
          connected_clients: parseInt(clientsData.connected_clients || '0', 10),
          hit_ratio: hitRatio,
          total_operations: parseInt(statsData.total_commands_processed || 0, 10),
          evictions: parseInt(statsData.evicted_keys || 0, 10),
          uptime_seconds: parseInt(statsData.uptime_in_seconds || 0, 10),
        };
      }
    } catch (error) {
      logger.warn('Redis stats failed, using in-memory fallback', {
        error: error.message,
      });
    }

    return inMemoryCache.stats();
  },

  async mget(keys) {
    try {
      if (isRedisEnabled && redisClient) {
        const values = await redisClient.mget(...keys);
        const results = {};
        keys.forEach((key, i) => {
          const v = values[i];
          if (v === null) {
            results[key] = null;
          } else {
            try {
              results[key] = JSON.parse(v);
            } catch {
              results[key] = v;
            }
          }
        });
        return results;
      }
    } catch (error) {
      logger.warn('Redis mget failed, using in-memory fallback', {
        error: error.message,
      });
    }

    return inMemoryCache.mget(keys);
  },

  async mset(keyValuePairs, ttl = config.CACHE_API_RESPONSE_TTL) {
    try {
      if (isRedisEnabled && redisClient) {
        const pipeline = redisClient.pipeline();

        for (const [key, value] of Object.entries(keyValuePairs)) {
          const serialized = JSON.stringify(value);
          if (ttl > 0) {
            pipeline.setex(key, ttl, serialized);
          } else {
            pipeline.set(key, serialized);
          }
        }

        await pipeline.exec();
        return true;
      }
    } catch (error) {
      logger.warn('Redis mset failed, using in-memory fallback', {
        error: error.message,
      });
    }

    return inMemoryCache.mset(keyValuePairs, ttl);
  },

  async mdel(keys) {
    try {
      if (isRedisEnabled && redisClient) {
        const result = await redisClient.del(...keys);
        return result;
      }
    } catch (error) {
      logger.warn('Redis mdel failed, using in-memory fallback', {
        error: error.message,
      });
    }

    return inMemoryCache.mdel(keys);
  },

  async ping() {
    try {
      if (isRedisEnabled && redisClient) {
        const result = await redisClient.ping();
        return result === 'PONG';
      }
    } catch (error) {
      logger.warn('Redis ping failed', { error: error.message });
      return false;
    }

    await this.set('__ping__', 'pong', 1);
    const result = await this.get('__ping__');
    await this.del('__ping__');
    return result === 'pong';
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

export default {
  initRedis,
  getRedisClient,
  closeRedis,
  cache,
  cacheKeys,
  cacheTTL,
};
