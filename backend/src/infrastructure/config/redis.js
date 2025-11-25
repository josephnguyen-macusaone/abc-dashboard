import { createClient } from 'redis';
import { config } from './config.js';
import logger from './logger.js';

let redisClient = null;

// In-memory cache fallback when Redis is not available
class InMemoryCache {
  constructor() {
    this.cache = new Map();
    this.timeouts = new Map();
  }

  async set(key, value, ttl = 300) {
    try {
      this.cache.set(key, {
        value,
        expires: Date.now() + (ttl * 1000)
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
      if (!item) return null;

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
      if (!item) return false;

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

  async clear(pattern = '*') {
    try {
      // Simple implementation - clear all for now
      // In a real implementation, you'd filter by pattern
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
      memory_usage: `${(this.cache.size * 1024)} bytes`, // Rough estimate
      keys_count: this.cache.size,
      type: 'in-memory'
    };
  }
}

// Create in-memory cache instance
const inMemoryCache = new InMemoryCache();

// Create Redis client
const createRedisClient = () => {
  if (!config.REDIS_ENABLED) {
    logger.info('Redis is disabled, using in-memory cache');
    return null;
  }

  try {
    const clientOptions = {
      socket: {
        host: config.REDIS_HOST,
        port: config.REDIS_PORT,
      },
      database: config.REDIS_DB,
    };

    // Add password if provided
    if (config.REDIS_PASSWORD) {
      clientOptions.password = config.REDIS_PASSWORD;
    }

    // Use REDIS_URL if provided
    if (config.REDIS_URL) {
      clientOptions.url = config.REDIS_URL;
    }

    const client = createClient(clientOptions);

    // Handle connection events
    client.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });

    client.on('connect', () => {
      logger.info('Connected to Redis');
    });

    client.on('ready', () => {
      logger.info('Redis client ready');
    });

    client.on('end', () => {
      logger.info('Redis connection ended');
    });

    return client;
  } catch (error) {
    logger.error('Failed to create Redis client:', error);
    return null;
  }
};

// Initialize Redis client
export const initRedis = async () => {
  if (!config.REDIS_ENABLED) {
    return false;
  }

  if (redisClient) {
    return true; // Already initialized
  }

  try {
    redisClient = createRedisClient();

    if (!redisClient) {
      return false;
    }

    await redisClient.connect();
    return true;
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    redisClient = null;
    return false;
  }
};

// Get Redis client
export const getRedisClient = () => {
  return redisClient;
};

// Close Redis connection
export const closeRedis = async () => {
  if (redisClient) {
    try {
      await redisClient.quit();
      redisClient = null;
      logger.info('Redis connection closed');
    } catch (error) {
      logger.error('Error closing Redis connection:', error);
    }
  }
};

// Cache operations with fallback to in-memory cache
export const cache = {
  // Set cache value
  async set(key, value, ttl = config.REDIS_CACHE_TTL) {
    if (redisClient) {
      // Use Redis if available
      try {
        const serializedValue = JSON.stringify(value);
        await redisClient.setEx(key, ttl, serializedValue);
        return true;
      } catch (error) {
        logger.error(`Redis cache set error for key ${key}:`, error);
        // Fall back to in-memory cache
        return await inMemoryCache.set(key, value, ttl);
      }
    } else {
      // Use in-memory cache
      return await inMemoryCache.set(key, value, ttl);
    }
  },

  // Get cache value
  async get(key) {
    if (redisClient) {
      // Try Redis first
      try {
        const value = await redisClient.get(key);
        if (value !== null) {
          return JSON.parse(value);
        }
      } catch (error) {
        logger.warn(`Redis cache get error for key ${key}:`, error.message);
      }
    }

    // Fall back to in-memory cache
    return await inMemoryCache.get(key);
  },

  // Delete cache key
  async del(key) {
    let redisSuccess = false;
    let memorySuccess = false;

    if (redisClient) {
      try {
        await redisClient.del(key);
        redisSuccess = true;
      } catch (error) {
        logger.warn(`Redis cache delete error for key ${key}:`, error.message);
      }
    }

    try {
      memorySuccess = await inMemoryCache.del(key);
    } catch (error) {
      logger.warn(`In-memory cache delete error for key ${key}:`, error.message);
    }

    return redisSuccess || memorySuccess;
  },

  // Check if key exists
  async exists(key) {
    if (redisClient) {
      // Try Redis first
      try {
        const result = await redisClient.exists(key);
        if (result === 1) return true;
      } catch (error) {
        logger.warn(`Redis cache exists error for key ${key}:`, error.message);
      }
    }

    // Fall back to in-memory cache
    return await inMemoryCache.exists(key);
  },

  // Set multiple keys
  async mset(keyValuePairs, ttl = config.REDIS_CACHE_TTL) {
    if (redisClient) {
      // Try Redis first
      try {
        const pipeline = redisClient.multi();

        for (const [key, value] of Object.entries(keyValuePairs)) {
          const serializedValue = JSON.stringify(value);
          pipeline.setEx(key, ttl, serializedValue);
        }

        await pipeline.exec();
        return true;
      } catch (error) {
        logger.warn('Redis cache mset error, falling back to in-memory:', error.message);
      }
    }

    // Fall back to in-memory cache
    try {
      for (const [key, value] of Object.entries(keyValuePairs)) {
        await inMemoryCache.set(key, value, ttl);
      }
      return true;
    } catch (error) {
      logger.error('In-memory cache mset error:', error);
      return false;
    }
  },

  // Clear all cache (dangerous - use with caution)
  async clear(pattern = '*') {
    let redisSuccess = false;
    let memorySuccess = false;

    if (redisClient) {
      try {
        const keys = await redisClient.keys(pattern);
        if (keys.length > 0) {
          await redisClient.del(keys);
          logger.info(`Cleared ${keys.length} Redis cache keys matching pattern: ${pattern}`);
        }
        redisSuccess = true;
      } catch (error) {
        logger.warn(`Redis cache clear error for pattern ${pattern}:`, error.message);
      }
    }

    try {
      memorySuccess = await inMemoryCache.clear(pattern);
    } catch (error) {
      logger.error('In-memory cache clear error:', error);
    }

    return redisSuccess || memorySuccess;
  },

  // Get cache statistics
  async stats() {
    if (redisClient) {
      try {
        const info = await redisClient.info();
        const stats = {};

        // Parse Redis info
        const lines = info.split('\r\n');
        for (const line of lines) {
          if (line.includes(':')) {
            const [key, value] = line.split(':');
            stats[key] = value;
          }
        }

        return {
          connected_clients: stats.connected_clients,
          used_memory: stats.used_memory_human,
          total_connections_received: stats.total_connections_received,
          total_commands_processed: stats.total_commands_processed,
          uptime_in_seconds: stats.uptime_in_seconds,
          cache_type: 'redis'
        };
      } catch (error) {
        logger.warn('Failed to get Redis cache stats:', error.message);
      }
    }

    // Fall back to in-memory cache stats
    try {
      return await inMemoryCache.stats();
    } catch (error) {
      logger.error('Failed to get in-memory cache stats:', error);
      return null;
    }
  }
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

export default {
  initRedis,
  getRedisClient,
  closeRedis,
  cache,
  cacheKeys,
  cacheTTL,
};
