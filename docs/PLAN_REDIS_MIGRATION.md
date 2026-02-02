# Plan: Migrate from In-Memory Cache to Redis

## Date: 2026-02-02
## Status: 📋 PLANNING

---

## Executive Summary

**Current:** In-memory cache (process-local, lost on restart)  
**Target:** Redis cache (persistent, shared across instances)  
**Impact:** Better scalability, cache persistence, multi-instance support  
**Effort:** ~2-3 hours (Docker setup + code changes + testing)

---

## Why Migrate to Redis?

### Current Limitations (In-Memory)

| Issue | Impact |
|-------|--------|
| **Lost on restart** | Every backend restart = cache cleared, cold start performance |
| **Not shared** | If running multiple backend instances, each has separate cache |
| **Memory limits** | 50 MB limit, manual LRU eviction |
| **No persistence** | Metrics, stats, session data lost on crash |
| **No clustering** | Can't scale horizontally |

### Redis Benefits

| Benefit | Impact |
|---------|--------|
| **Persistent** | Cache survives restarts, faster warm-up |
| **Shared** | Multiple backend instances share cache (horizontal scaling) |
| **Battle-tested** | Redis handles memory, eviction, expiration natively |
| **Atomic operations** | Thread-safe increments, locks, pub/sub |
| **Monitoring** | Built-in stats, memory info, slow log |

---

## Current Architecture Analysis

### Cache Usage Map

**Files using cache (6 total):**

1. **`backend/src/infrastructure/config/redis.js`**
   - Exports: `cache`, `cacheKeys`, `cacheTTL`
   - Current: `OptimizedInMemoryCache` class with LRU
   - Methods: `set`, `get`, `del`, `exists`, `clear`, `stats`, `mget`, `mset`, `mdel`, `ping`

2. **`backend/src/shared/services/cache-service.js`**
   - Exports: `cacheService`, `CacheKeys`, `CacheTTL`, `CacheInvalidation`
   - Used for: License, user, assignment caching
   - Methods: `get`, `set`, `delete`, `clearPattern`, `remember`

3. **`backend/src/infrastructure/config/metrics.js`**
   - Uses: `cache` from `redis.js`
   - Caches: API metrics, performance data

4. **`backend/src/infrastructure/config/monitoring.js`**
   - Uses: `cache`, `cacheKeys` from `redis.js`
   - Caches: Monitoring data, health checks

5. **`backend/src/infrastructure/api/v1/middleware/security.middleware.js`**
   - Uses: `cache` from `redis.js`
   - Caches: Security tokens, rate limiting

6. **`backend/src/infrastructure/api/v1/middleware/metrics.middleware.js`**
   - Uses: `cache`, `cacheKeys`, `cacheTTL` from `redis.js`
   - Caches: Request metrics, response times

### Cache Methods Used

| Method | Current (In-Memory) | Redis Equivalent |
|--------|---------------------|------------------|
| `set(key, val, ttl)` | Map.set | `SETEX key ttl val` |
| `get(key)` | Map.get | `GET key` |
| `del(key)` | Map.delete | `DEL key` |
| `exists(key)` | Map.has + TTL check | `EXISTS key` |
| `clear()` | Map.clear | `FLUSHDB` |
| `mget(keys)` | Loop Map.get | `MGET keys...` |
| `mset(pairs, ttl)` | Loop Map.set | `MSET ...` + `EXPIRE` |
| `mdel(keys)` | Loop Map.delete | `DEL keys...` |
| `stats()` | Manual tracking | `INFO stats` |
| `ping()` | set/get/del test | `PING` |

---

## Migration Plan

### Phase 1: Docker & Infrastructure Setup

#### 1.1. Add Redis Service to docker-compose.yml

```yaml
services:
  redis:
    image: redis:7-alpine
    container_name: abc-dashboard-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    networks:
      - abc-dashboard-network
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3
      start_period: 10s

  backend:
    # ... existing config ...
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      # ... existing vars ...
      - REDIS_URL=redis://redis:6379
      - CACHE_TYPE=redis

volumes:
  postgres_data:
  redis_data:  # Add Redis data volume
```

**Key config:**
- `--appendonly yes` — Persist cache to disk (survives restarts)
- `--maxmemory 256mb` — Limit Redis memory usage
- `--maxmemory-policy allkeys-lru` — Evict least recently used keys when full

#### 1.2. Update .env and .env.example

```bash
# .env
REDIS_URL=redis://redis:6379
CACHE_TYPE=redis  # Options: redis, memory

# .env.example
# CACHE CONFIGURATION
REDIS_URL=redis://localhost:6379
CACHE_TYPE=redis  # Options: redis (recommended), memory (dev only)
```

---

### Phase 2: Install Redis Client

#### 2.1. Add ioredis dependency

```bash
cd backend
npm install ioredis@5.3.2
```

**Why ioredis?**
- ✅ Better TypeScript support
- ✅ Promise-based API
- ✅ Clustering support
- ✅ Auto-reconnect
- ✅ Pipeline support
- ✅ Better performance than `node-redis`

---

### Phase 3: Implement Redis Cache Adapter

#### 3.1. Create Redis Client (`backend/src/infrastructure/config/redis.js`)

**Replace the entire file with:**

```javascript
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
        const delay = Math.min(times * 50, 2000);
        logger.warn(`Redis retry attempt ${times}`, { delay });
        return delay;
      },
      reconnectOnError(err) {
        logger.error('Redis reconnect on error', { error: err.message });
        return true;
      },
    });

    // Event handlers
    redisClient.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    redisClient.on('ready', () => {
      logger.info('Redis ready to accept commands');
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

    // Wait for connection
    await redisClient.ping();
    logger.info('Redis ping successful');

    isRedisEnabled = true;
    return true;

  } catch (error) {
    logger.error('Failed to initialize Redis, falling back to in-memory cache', {
      error: error.message,
      stack: error.stack,
    });
    isRedisEnabled = false;
    redisClient = null;
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

    this.stats = {
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

    this.stats.sets++;
    return true;
  }

  async get(key) {
    const item = this.cache.get(key);
    if (!item) {
      this.stats.misses++;
      return null;
    }

    if (Date.now() > item.expires) {
      await this.del(key);
      this.stats.misses++;
      return null;
    }

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

  async mget(keys) {
    const values = [];
    for (const key of keys) {
      values.push(await this.get(key));
    }
    return values;
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
      if (await this.del(key)) count++;
    }
    return count;
  }

  _estimateSize(value) {
    const str = JSON.stringify(value);
    return str.length * 2; // Rough estimate: 2 bytes per char
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
      this.stats.evictions++;
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
    this.stats = {
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

// Fallback in-memory cache
const inMemoryCache = new OptimizedInMemoryCache({
  maxSize: 10000,
  maxMemoryMB: 50,
  cleanupInterval: 60000,
});

/**
 * Unified cache interface (works with Redis or in-memory)
 */
export const cache = {
  async set(key, value, ttl = config.CACHE_API_RESPONSE_TTL) {
    try {
      if (isRedisEnabled && redisClient) {
        // Serialize value for Redis
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
    
    // Fallback to in-memory
    return inMemoryCache.set(key, value, ttl);
  },

  async get(key) {
    try {
      if (isRedisEnabled && redisClient) {
        const value = await redisClient.get(key);
        if (value === null) return null;
        
        // Deserialize from Redis
        try {
          return JSON.parse(value);
        } catch {
          // If not JSON, return as-is
          return value;
        }
      }
    } catch (error) {
      logger.warn('Redis get failed, using in-memory fallback', {
        key,
        error: error.message,
      });
    }

    // Fallback to in-memory
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
        const info = await redisClient.info('stats');
        const keyspace = await redisClient.info('keyspace');
        const dbsize = await redisClient.dbsize();
        
        // Parse Redis INFO output
        const parseInfo = (str) => {
          const result = {};
          str.split('\r\n').forEach(line => {
            const [key, value] = line.split(':');
            if (key && value) result[key] = value;
          });
          return result;
        };

        const statsData = parseInfo(info);
        const memoryInfo = await redisClient.info('memory');
        const memData = parseInfo(memoryInfo);

        return {
          memory_usage: memData.used_memory_human || '0B',
          keys_count: dbsize,
          type: 'redis',
          hit_ratio: parseFloat(statsData.keyspace_hits || 0) / 
            (parseFloat(statsData.keyspace_hits || 0) + parseFloat(statsData.keyspace_misses || 1)),
          total_operations: parseInt(statsData.total_commands_processed || 0),
          evictions: parseInt(statsData.evicted_keys || 0),
          uptime_seconds: parseInt(statsData.uptime_in_seconds || 0),
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
        return values.map(v => {
          if (v === null) return null;
          try {
            return JSON.parse(v);
          } catch {
            return v;
          }
        });
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

    // Test in-memory cache
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
```

**Key features:**
- ✅ Automatic fallback to in-memory if Redis unavailable
- ✅ Graceful degradation (logs warnings, continues)
- ✅ Auto-reconnect on connection loss
- ✅ Pipeline support for batch operations
- ✅ JSON serialization/deserialization
- ✅ Same API as current implementation (no code changes needed elsewhere)

---

### Phase 4: Update Server Startup

#### 4.1. Initialize Redis on server start

**File:** `backend/server.js`

**Add before starting HTTP server:**

```javascript
// After database connection, before server.listen()
const { initRedis } = await import('./src/infrastructure/config/redis.js');
const redisConnected = await initRedis();

if (redisConnected) {
  logger.startup('Redis cache initialized successfully');
} else {
  logger.startup('Using in-memory cache (Redis disabled or unavailable)');
}
```

#### 4.2. Close Redis on shutdown

**In `gracefulShutdown()` function:**

```javascript
// After stopping schedulers, before closing database
const { closeRedis } = await import('./src/infrastructure/config/redis.js');
await closeRedis();
logger.startup('Redis connection closed');
```

---

### Phase 5: Update Health Check

**File:** `backend/src/infrastructure/routes/health-routes.js` (or wherever health check is)

Add Redis status to health check:

```javascript
import { cache } from '../config/redis.js';

// In health check endpoint:
const redisHealthy = await cache.ping();
const cacheStats = await cache.stats();

return res.success({
  status: 'healthy',
  timestamp: new Date().toISOString(),
  services: {
    database: dbHealthy ? 'connected' : 'disconnected',
    cache: {
      type: cacheStats.type,
      status: redisHealthy ? 'connected' : 'disconnected',
      keys: cacheStats.keys_count,
      memory: cacheStats.memory_usage,
    },
  },
});
```

---

## Testing Strategy

### Test 1: Redis Connection

```bash
# Start services
docker compose up -d

# Check Redis is running
docker compose exec redis redis-cli ping
# Expected: PONG

# Check backend connects
docker compose logs backend | grep -i redis
# Expected: "Redis connected successfully"
```

### Test 2: Cache Operations

```bash
# Manual test via Redis CLI
docker compose exec redis redis-cli

# Inside redis-cli:
SET test:key "hello"
GET test:key
# Expected: "hello"

SETEX test:ttl 60 "expires in 60s"
TTL test:ttl
# Expected: ~60

DEL test:key test:ttl
```

### Test 3: Application Cache

**Test caching via API:**

```bash
# First request (cache miss)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/v1/licenses?page=1&limit=10

# Check Redis
docker compose exec redis redis-cli
> KEYS api:*
# Expected: See cached API response

# Second request (cache hit)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/v1/licenses?page=1&limit=10
# Expected: Faster response (from cache)
```

### Test 4: Fallback to In-Memory

```bash
# Stop Redis
docker compose stop redis

# Make API request
curl http://localhost:5000/api/v1/health
# Expected: Still works, logs show "using in-memory fallback"

# Check logs
docker compose logs backend | grep -i "fallback\|in-memory"
# Expected: Warnings about Redis, fallback messages
```

### Test 5: Cache Persistence

```bash
# Set a value
docker compose exec backend node -e "
  import('./src/infrastructure/config/env.js')
    .then(() => import('./src/infrastructure/config/redis.js'))
    .then(async ({ cache }) => {
      await cache.set('test:persist', { value: 'should survive restart' }, 3600);
      console.log('Set value in cache');
    });
"

# Restart backend (not Redis!)
docker compose restart backend

# Get the value
docker compose exec backend node -e "
  import('./src/infrastructure/config/env.js')
    .then(() => import('./src/infrastructure/config/redis.js'))
    .then(async ({ cache, initRedis }) => {
      await initRedis();
      const value = await cache.get('test:persist');
      console.log('Retrieved value:', value);
    });
"

# Expected: Value persists across backend restart
```

---

## Migration Steps (Step-by-Step)

### Step 1: Add Redis to Docker (5 min)

```bash
# 1. Update docker-compose.yml (add redis service + volume)
# 2. Update backend depends_on
# 3. Add REDIS_URL to .env
```

### Step 2: Install ioredis (1 min)

```bash
cd backend
npm install ioredis@5.3.2
cd ..
```

### Step 3: Update redis.js (10 min)

```bash
# Replace backend/src/infrastructure/config/redis.js with new implementation
# (See Phase 3.1 above)
```

### Step 4: Update server.js (5 min)

```bash
# Add initRedis() call on startup
# Add closeRedis() call on shutdown
```

### Step 5: Update health check (5 min)

```bash
# Add Redis status to health endpoint
```

### Step 6: Build & Test (30 min)

```bash
# Build and start
docker compose down
docker compose up -d --build

# Wait for services to be healthy
docker compose ps

# Run test suite
# - Test 1: Connection
# - Test 2: Redis CLI operations
# - Test 3: API cache hit/miss
# - Test 4: Fallback when Redis down
# - Test 5: Persistence across restart

# Verify logs
docker compose logs redis
docker compose logs backend | grep -i redis
```

---

## Rollback Plan

If Redis causes issues:

### Quick Rollback (keep code, disable Redis)

**Option A: Environment variable**
```bash
# In .env
CACHE_TYPE=memory  # Change from 'redis' to 'memory'

# Restart backend
docker compose restart backend
# Backend will use in-memory cache, no code changes needed
```

### Full Rollback (remove Redis entirely)

```bash
# 1. Stop and remove Redis
docker compose stop redis
docker compose rm redis

# 2. Remove from docker-compose.yml
#    - redis service
#    - redis_data volume
#    - redis from backend depends_on

# 3. Restore old redis.js
git checkout HEAD -- backend/src/infrastructure/config/redis.js

# 4. Remove ioredis
cd backend && npm uninstall ioredis

# 5. Rebuild
docker compose up -d --build backend
```

---

## Performance Expectations

### Before (In-Memory)

| Metric | Value |
|--------|-------|
| Cache hit (same instance) | ~0.1ms |
| Cache miss | ~0.1ms |
| Lost on restart | ✅ Yes |
| Shared across instances | ❌ No |

### After (Redis)

| Metric | Value |
|--------|-------|
| Cache hit (Redis) | ~1-2ms (network overhead) |
| Cache miss | ~1-2ms |
| Lost on restart | ❌ No (persists) |
| Shared across instances | ✅ Yes |
| Memory management | ✅ Better (Redis eviction policies) |

**Trade-off:** Slightly slower per operation (~1ms more) but much better for:
- Multi-instance deployments
- Restart resilience
- Memory management
- Monitoring/debugging

---

## Configuration Options

### Environment Variables

```bash
# Required
REDIS_URL=redis://redis:6379
CACHE_TYPE=redis  # or 'memory' for fallback

# Optional (ioredis config)
REDIS_PASSWORD=your_password_here
REDIS_DB=0
REDIS_CONNECT_TIMEOUT=10000
REDIS_COMMAND_TIMEOUT=5000
```

### Redis Server Tuning

**For development:**
```bash
command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
```

**For production:**
```bash
command: redis-server --appendonly yes --maxmemory 1gb --maxmemory-policy allkeys-lru --save 60 1000
```

Options explained:
- `--appendonly yes` — Persist data to disk (AOF)
- `--maxmemory 256mb` — Limit memory usage
- `--maxmemory-policy allkeys-lru` — Evict least recently used keys
- `--save 60 1000` — Snapshot to disk every 60s if 1000+ keys changed

---

## Code Changes Summary

| File | Change | Lines | Complexity |
|------|--------|-------|------------|
| `docker-compose.yml` | Add Redis service + volume | ~20 | Low |
| `.env` | Add REDIS_URL, CACHE_TYPE | 2 | Low |
| `.env.example` | Update Redis config | 2 | Low |
| `backend/package.json` | Add ioredis dependency | 1 | Low |
| `backend/src/infrastructure/config/redis.js` | Replace with Redis + fallback | ~400 | Medium |
| `backend/server.js` | Init Redis on start, close on shutdown | ~10 | Low |
| Health check route | Add Redis status | ~5 | Low |

**Total effort:** ~440 lines changed/added

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Redis fails to start** | Medium | Automatic fallback to in-memory |
| **Redis connection lost** | Low | Auto-reconnect + fallback |
| **Performance regression** | Low | Cache hit/miss monitored; rollback if needed |
| **Data loss on restart** | None | AOF persistence enabled |
| **Memory overflow** | Low | maxmemory + LRU eviction |
| **Breaking existing cache** | None | API identical, transparent switch |

---

## Post-Migration Monitoring

### Metrics to track:

1. **Cache hit ratio:** Should be >80% for frequently accessed data
2. **Redis memory:** Should stay below maxmemory (256MB)
3. **Connection stability:** Should have 0 disconnects under normal operation
4. **Fallback usage:** Should be 0 in production (warnings logged if fallback used)
5. **Performance:** Response times should be similar or better

### Commands:

```bash
# Check Redis stats
docker compose exec redis redis-cli INFO stats

# Check memory
docker compose exec redis redis-cli INFO memory

# Check keys
docker compose exec redis redis-cli DBSIZE

# Monitor in real-time
docker compose exec redis redis-cli MONITOR

# Check hit/miss ratio
docker compose exec redis redis-cli INFO stats | grep keyspace_hits
```

---

## Estimated Timeline

| Phase | Duration | Complexity |
|-------|----------|------------|
| 1. Docker setup | 10 min | Low |
| 2. Install ioredis | 2 min | Low |
| 3. Update redis.js | 15 min | Medium |
| 4. Update server.js | 5 min | Low |
| 5. Update health check | 5 min | Low |
| 6. Testing | 30 min | Medium |
| 7. Documentation | 10 min | Low |

**Total:** ~1.5 hours for implementation + testing

---

## Recommendation

### For this project:

**Short-term (now):**
- ✅ Keep in-memory cache (working fine for single instance)
- ✅ System is stable and production-ready as-is

**Medium-term (before scaling):**
- Add Redis when:
  - Running multiple backend instances (load balancing)
  - Need cache persistence across restarts
  - Cache size exceeds 50 MB regularly

**Long-term (production at scale):**
- Redis + Redis Sentinel (high availability)
- Or Redis Cluster (if data > 256MB)
- Or managed Redis (AWS ElastiCache, Redis Cloud)

### Current vs Future:

| Scenario | Recommendation |
|----------|----------------|
| **Single backend instance** | In-memory is fine ✅ |
| **2-3 backend instances** | Redis recommended |
| **Load balanced (4+ instances)** | Redis required |
| **Cache > 50 MB** | Redis recommended |
| **Need persistence** | Redis required |

**For now:** In-memory is working well. Consider Redis when you:
1. Add load balancing
2. Need cache to survive restarts
3. See memory pressure

---

## Next Steps

**If proceeding with Redis migration:**

1. ✅ Review this plan
2. Create backup of current state
3. Implement Phase 1 (Docker)
4. Implement Phase 2 (npm install)
5. Implement Phase 3 (redis.js)
6. Implement Phase 4 (server.js)
7. Run test suite
8. Monitor for 24 hours
9. Document any issues

**Estimated total time:** 1.5-2 hours

Would you like me to proceed with the Redis implementation, or would you prefer to keep in-memory cache for now?
