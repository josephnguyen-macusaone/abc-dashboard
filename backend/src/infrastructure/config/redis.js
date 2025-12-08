import { config } from './config.js';
import logger from './logger.js';

// In-memory cache implementation
class InMemoryCache {
  constructor() {
    this.cache = new Map();
    this.timeouts = new Map();
  }

  async set(key, value, ttl = 300) {
    this.cache.set(key, {
      value,
      expires: Date.now() + ttl * 1000,
    });

    if (this.timeouts.has(key)) {
      clearTimeout(this.timeouts.get(key));
    }

    const timeout = setTimeout(() => {
      this.cache.delete(key);
      this.timeouts.delete(key);
    }, ttl * 1000);

    this.timeouts.set(key, timeout);
    return true;
  }

  async get(key) {
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
  }

  async del(key) {
    this.cache.delete(key);
    if (this.timeouts.has(key)) {
      clearTimeout(this.timeouts.get(key));
      this.timeouts.delete(key);
    }
    return true;
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
    for (const timeout of this.timeouts.values()) {
      clearTimeout(timeout);
    }
    this.timeouts.clear();
    return true;
  }

  async stats() {
    return {
      memory_usage: `${this.cache.size * 1024} bytes`,
      keys_count: this.cache.size,
      type: 'in-memory',
    };
  }
}

const inMemoryCache = new InMemoryCache();

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
  stats() {
    return inMemoryCache.stats();
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
