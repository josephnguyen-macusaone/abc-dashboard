// Ensure joi is loaded first to avoid import timing issues
import 'joi';

/* global URL */

// Load environment configuration FIRST (this will load the appropriate .env file)
import './src/infrastructure/config/env.js';

import http from 'http';
import express from 'express';
import compression from 'compression';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import expressSanitizer from 'express-sanitizer';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import connectDB from './src/infrastructure/config/database.js';
import { createRoutes } from './src/infrastructure/routes/index.js';
import { errorHandler } from './src/infrastructure/api/v1/middleware/error-handler.middleware.js';
import { correlationIdMiddleware } from './src/infrastructure/api/v1/middleware/correlation-id.middleware.js';
import { requestLogger } from './src/infrastructure/api/v1/middleware/request-logger.middleware.js';
import rateLimit from 'express-rate-limit';
import {
  securityHeaders,
  requestSizeLimiter,
  injectionProtection,
} from './src/infrastructure/api/v1/middleware/security.middleware.js';
import { extractUserIdForCache } from './src/infrastructure/api/v1/middleware/extract-user-id-for-cache.middleware.js';
import {
  cacheTrackingMiddleware,
  cacheInvalidationMiddleware,
  responseCachingMiddleware,
  userActivityMiddleware,
  securityMetricsMiddleware,
  performanceMiddleware,
} from './src/infrastructure/api/v1/middleware/metrics.middleware.js';
import logger from './src/infrastructure/config/logger.js';
import { config } from './src/infrastructure/config/config.js';
import swaggerSpec from './src/infrastructure/config/swagger.js';
import { monitorMiddleware, getHealthWithMetrics } from './src/infrastructure/config/monitoring.js';
import { responseHelpersMiddleware } from './src/shared/http/response-transformer.js';
import { awilixContainer } from './src/shared/kernel/container.js';

const app = express();
const PORT = config.PORT;
let server = null;

/**
 * Perform startup health checks
 */
const performStartupChecks = async () => {
  logger.startup(`Starting ABC Dashboard Server... (${config.NODE_ENV} on ${process.platform})`);

  const checks = {
    database: false,
    redis: false,
  };

  // Check PostgreSQL connection
  try {
    logger.startup('Checking PostgreSQL connection...');
    await connectDB();
    checks.database = true;
  } catch (error) {
    logger.error('PostgreSQL connection check failed', {
      error: error.message,
      willRetry: true,
    });
  }

  // Initialize Redis (optional; falls back to in-memory if unavailable)
  try {
    const { initRedis, cache } = await import('./src/infrastructure/config/redis.js');
    checks.redis = await initRedis();
    // Wire cache to app.locals so cacheTrackingMiddleware can read hit/miss stats.
    app.locals.cache = cache;
  } catch (error) {
    logger.warn('Redis init skipped, using in-memory cache', { error: error.message });
  }

  const cacheStatus = checks.redis ? 'Redis' : 'In-Memory';
  const dbStatus = checks.database ? 'Connected' : 'Failed';
  logger.startup(`Startup Health Check Summary - PostgreSQL: ${dbStatus}, Cache: ${cacheStatus}`);

  return checks;
};

// Correlation ID middleware (must be first)
app.use(correlationIdMiddleware);

// Security middleware
app.use(helmet());
app.use(securityHeaders);

// CORS configuration — restrict to the configured client origin in all environments.
// SEC-1: never use `origin: true` as it reflects any origin, bypassing CORS protection.
const corsOptions = {
  origin: config.CLIENT_URL || false,
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// Response compression (gzip) for JSON and text - typically 70–90% size reduction
app.use(compression());

// Request size and injection protection (before body parsing)
app.use(requestSizeLimiter);
app.use(injectionProtection);

// Rate limiting via express-rate-limit.
// When Redis is available, use rate-limit-redis for a distributed store so limits
// work correctly across multiple replicas (SEC-2/3).  Falls back to the built-in
// memory store when Redis is not configured.
//
// IMPORTANT: express-rate-limit v7 throws ERR_ERL_CREATED_IN_REQUEST_HANDLER if
// rateLimit() is called inside a request handler. We therefore create the limiter
// synchronously at module level (memory store) and optionally upgrade it to a
// Redis-backed instance during startServer() after Redis has been initialised.
const RATE_LIMIT_WINDOW_MS = 30 * 60 * 1000;
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '2000', 10) || 2000;
const RATE_LIMIT_HANDLER = (_req, res) => {
  res.status(429).json({ success: false, error: 'Too many requests, please try again later.' });
};

// Synchronous in-memory limiter — created here, not inside a request handler.
let activeRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/api/v1/health',
  handler: RATE_LIMIT_HANDLER,
});

// Proxy middleware: delegates to whichever instance is current (swapped to Redis after startup).
app.use((req, res, next) => activeRateLimiter(req, res, next));

/**
 * Attempt to upgrade the in-memory rate limiter to a Redis-backed one.
 * Called once during startServer() after Redis has been initialised.
 */
const upgradeRateLimiterToRedis = async () => {
  if (!config.REDIS_ENABLED || !config.REDIS_URL) return;
  try {
    const { RedisStore } = await import('rate-limit-redis');
    const { redisClient } = await import('./src/infrastructure/config/redis.js');
    if (!redisClient) return;
    activeRateLimiter = rateLimit({
      windowMs: RATE_LIMIT_WINDOW_MS,
      max: RATE_LIMIT_MAX,
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => req.path === '/api/v1/health',
      handler: RATE_LIMIT_HANDLER,
      store: new RedisStore({
        sendCommand: (...args) => redisClient.call(...args),
        prefix: 'rl:',
      }),
    });
    logger.info('Rate limiter: upgraded to Redis store');
  } catch (err) {
    logger.warn('Rate limiter: Redis store unavailable, keeping in-memory', { error: err.message });
  }
};

// Request logging middleware
app.use(requestLogger);

// API monitoring middleware
app.use(monitorMiddleware);

// Extract userId from JWT for cache key scoping (must run before response caching)
app.use('/api', extractUserIdForCache);

// Response caching middleware (must be before auth middleware)
app.use(responseCachingMiddleware);

// Metrics collection middleware
app.use(cacheTrackingMiddleware);
app.use(userActivityMiddleware);
app.use(securityMetricsMiddleware);
app.use(performanceMiddleware);

// Cache invalidation middleware (applied to all API routes)
app.use('/api', cacheInvalidationMiddleware);

// Response helpers middleware (adds res.paginated, res.success, etc.)
app.use(responseHelpersMiddleware);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Input sanitization (req.body, req.query, req.params) - must run after body parsing
app.use(expressSanitizer());

// API Documentation with balanced CSP for Swagger UI functionality
app.use('/api-docs', (req, res, next) => {
  // Balanced CSP that allows Swagger UI search/filter while maintaining security
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      "connect-src 'self' http://localhost:5000 http://localhost:5002 http://localhost:3000 ws://localhost:3000",
      "frame-src 'none'",
      "object-src 'none'",
    ].join('; ')
  );
  next();
});

// Serve swagger spec as JSON
app.get('/swagger-spec.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-cache');
  res.send(swaggerSpec);
});

// API Documentation
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    explorer: true,
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'none',
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
      syntaxHighlight: {
        activate: true,
        theme: 'arta',
      },
    },
  })
);

// Health check endpoint
app.get('/api/v1/health', getHealthWithMetrics);

// Favicon (serve existing logo as lightweight icon)
app.get('/favicon.ico', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'assets', 'logo_dark.svg'), {
    headers: { 'Content-Type': 'image/svg+xml' },
  });
});

// Root dashboard
// Serve dashboard HTML file with appropriate CSP for dashboard functionality
app.get('/', (req, res) => {
  // CSP that allows dashboard functionality while maintaining security
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'", // Allow inline scripts for dashboard
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", // Allow inline styles for progress bars
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https:", // Allow data URIs for small images
      "connect-src 'self' http://localhost:5000 https://portal.abcsalon.us", // Allow API calls
      "frame-src 'none'",
      "object-src 'none'",
    ].join('; ')
  );
  // Prevent browser caching to ensure updates are loaded immediately
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(process.cwd(), 'public', 'dashboard.html'));
});

// Serve static files from public directory
app.use(express.static(path.join(process.cwd(), 'public')));

// Start server with health checks
const startServer = async () => {
  try {
    // Perform startup health checks
    const healthChecks = await performStartupChecks();

    // Upgrade rate limiter to Redis-backed store now that Redis is initialised.
    await upgradeRateLimiterToRedis();

    // Only start server if critical services are available
    if (!healthChecks.database) {
      logger.error('CRITICAL: Cannot start server without PostgreSQL connection');
      logger.error('SUGGESTION: Please ensure PostgreSQL is running and accessible');
      logger.error('TROUBLESHOOTING:');
      logger.error('   - Check if PostgreSQL service is running');
      logger.error(
        '   - Verify connection string in environment variables (DATABASE_URL or POSTGRES_*)'
      );
      logger.error('   - Ensure PostgreSQL is accepting connections on the configured host/port');
      process.exit(1);
    }

    // Create and apply API routes
    const v1Routes = await createRoutes();
    app.use('/api/v1', v1Routes);

    // Error handling middleware (MUST be after routes)
    app.use(errorHandler);

    // 404 handler (MUST be last)
    app.use((req, res) => {
      logger.withRequest(req).warn('Route not found', {
        method: req.method,
        url: req.originalUrl,
      });

      res.status(404).json({
        success: false,
        message: 'Route not found',
        correlationId: req.correlationId,
      });
    });

    // Create HTTP server (required for Socket.IO attachment)
    server = http.createServer(app);

    // Initialize Socket.IO for real-time sync (Phase 2)
    if (config.WEBSOCKET_ENABLED) {
      try {
        const { initSocketIO } = await import('./src/infrastructure/realtime/socket-server.js');
        const io = initSocketIO(server);
        const realtimeService = awilixContainer.getLicenseRealtimeService();
        realtimeService.attach(io);
        logger.startup('WebSocket (Socket.IO) enabled for real-time sync');
      } catch (error) {
        logger.warn('WebSocket initialization failed, real-time sync disabled', {
          error: error.message,
        });
      }
    }

    // Start the HTTP server
    server.listen(PORT, async () => {
      logger.startup(`Server started successfully on port ${PORT}`);
      logger.startup(`API available at http://localhost:${PORT}`);
      logger.startup(`API Documentation at http://localhost:${PORT}/api-docs`);
      logger.startup(`Health Check at http://localhost:${PORT}/api/v1/health`);

      // Initialize and start license lifecycle scheduler
      try {
        const lifecycleScheduler = await awilixContainer.getLicenseLifecycleScheduler();
        await lifecycleScheduler.start();
        logger.startup('License lifecycle scheduler started successfully');
      } catch (error) {
        logger.error('Failed to start license lifecycle scheduler', {
          error: error.message,
          stack: error.stack,
        });
        // Don't fail server startup for scheduler issues
      }

      // Initialize and start license sync scheduler
      try {
        const syncScheduler = await awilixContainer.getLicenseSyncScheduler();
        await syncScheduler.start();
        logger.startup('License sync scheduler started successfully');
      } catch (error) {
        logger.error('Failed to start license sync scheduler', {
          error: error.message,
          stack: error.stack,
        });
        // Don't fail server startup for scheduler issues
      }
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

// Handle graceful shutdown
const gracefulShutdown = async (signal) => {
  logger.startup(`Received ${signal}, starting graceful shutdown...`);

  try {
    // Stop license lifecycle scheduler
    try {
      const lifecycleScheduler = await awilixContainer.getLicenseLifecycleScheduler();
      await lifecycleScheduler.gracefulShutdown();
      logger.startup('License lifecycle scheduler stopped');
    } catch (error) {
      logger.error('Error stopping license lifecycle scheduler', {
        error: error.message,
      });
    }

    // Stop license sync scheduler
    try {
      const syncScheduler = await awilixContainer.getLicenseSyncScheduler();
      await syncScheduler.gracefulShutdown();
      logger.startup('License sync scheduler stopped');
    } catch (error) {
      logger.error('Error stopping license sync scheduler', {
        error: error.message,
      });
    }

    // Close server
    if (server) {
      await new Promise((resolve) => {
        server.close(resolve);
      });
      logger.startup('HTTP server closed');
    }

    // Close Redis connection
    try {
      const { closeRedis } = await import('./src/infrastructure/config/redis.js');
      await closeRedis();
      logger.startup('Redis connection closed');
    } catch (error) {
      logger.error('Error closing Redis', { error: error.message });
    }

    // Close database connections
    const { closeDB } = await import('./src/infrastructure/config/database.js');
    await closeDB();

    logger.startup('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error(`Error during graceful shutdown: ${error.message}`);
    process.exit(1);
  }
};

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.message}`);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, _promise) => {
  logger.error(`Unhandled Rejection: ${reason?.message || reason}`);
  process.exit(1);
});

// Start the server only when this file is run directly (not when imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

export default app;
