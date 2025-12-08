// Ensure joi is loaded first to avoid import timing issues
import 'joi';

/* global URL */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import connectDB from './src/infrastructure/config/database.js';
import v1Routes from './src/infrastructure/routes/index.js';
import { errorHandler } from './src/infrastructure/api/v1/middleware/error-handler.middleware.js';
import { correlationIdMiddleware } from './src/infrastructure/api/v1/middleware/correlation-id.middleware.js';
import { requestLogger } from './src/infrastructure/api/v1/middleware/request-logger.middleware.js';
import {
  securityHeaders,
  requestSizeLimiter,
  injectionProtection,
  createRateLimit,
} from './src/infrastructure/api/v1/middleware/security.middleware.js';
import logger from './src/infrastructure/config/logger.js';
import { config } from './src/infrastructure/config/config.js';
import swaggerSpec from './src/infrastructure/config/swagger.js';
import { monitorMiddleware, getHealthWithMetrics } from './src/infrastructure/config/monitoring.js';
import { responseHelpersMiddleware } from './src/shared/http/response-transformer.js';

// Load environment configuration (this will load the appropriate .env file)
import './src/infrastructure/config/env.js';

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
  };

  // Check MongoDB connection
  try {
    logger.startup('Checking MongoDB connection...');
    await connectDB();
    checks.database = true;
  } catch (error) {
    logger.error('MongoDB connection check failed', {
      error: error.message,
      willRetry: true,
    });
  }

  // Log startup summary
  const dbType = config.DATABASE_TYPE === 'postgresql' ? 'PostgreSQL' : 'MongoDB';
  const dbStatus = checks.database ? 'Connected' : 'Failed';
  logger.startup(`Startup Health Check Summary - ${dbType}: ${dbStatus}, Cache: In-Memory`);

  return checks;
};

// Correlation ID middleware (must be first)
app.use(correlationIdMiddleware);

// Security middleware
app.use(helmet());
app.use(securityHeaders);

// CORS configuration
const corsOptions =
  config.NODE_ENV === 'development'
    ? {
        origin(origin, callback) {
          // Allow requests with no origin (mobile apps, curl, etc.)
          if (!origin) {
            return callback(null, true);
          }

          // Allow localhost on any port for development
          if (origin.match(/^http:\/\/localhost:\d+$/)) {
            return callback(null, true);
          }

          // Allow the configured client URL
          if (origin === config.CLIENT_URL) {
            return callback(null, true);
          }

          // Reject other origins in development
          return callback(new Error('Not allowed by CORS'));
        },
        credentials: true,
      }
    : {
        origin(origin, callback) {
          // Allow requests with no origin (mobile apps, curl, server-side requests, etc.)
          if (!origin) {
            return callback(null, true);
          }

          // Allow the configured client URL if set
          if (config.CLIENT_URL && origin === config.CLIENT_URL) {
            return callback(null, true);
          }

          // In production, allow same-origin requests (when frontend and backend are on same domain)
          // Extract domain from origin and compare with current host
          try {
            const originUrl = new URL(origin);
            const hostUrl = new URL(config.CLIENT_URL || 'http://localhost:3000');

            // Allow if same domain (protocol + hostname + port)
            if (originUrl.origin === hostUrl.origin) {
              return callback(null, true);
            }

            // For HTTPS domains, also allow HTTP localhost for development access
            if (originUrl.protocol === 'https:' && originUrl.hostname === hostUrl.hostname) {
              return callback(null, true);
            }

            // Allow portal.abcsalon.us specifically for production
            if (origin === 'https://portal.abcsalon.us') {
              return callback(null, true);
            }
          } catch (error) {
            // Invalid URL format, reject
            return callback(new Error('Invalid origin'));
          }

          // Reject other origins in production
          return callback(new Error('Not allowed by CORS'));
        },
        credentials: true,
      };

app.use(cors(corsOptions));

// Request size and injection protection (before body parsing)
app.use(requestSizeLimiter);
app.use(injectionProtection);

// Rate limiting with custom implementation
const generalLimiter = createRateLimit(
  30 * 60 * 1000, // 30 minutes
  500, // max 500 requests per window
  'Too many requests from this IP, please try again later.'
);
app.use(generalLimiter);

// Request logging middleware
app.use(requestLogger);

// API monitoring middleware
app.use(monitorMiddleware);

// Response helpers middleware (adds res.paginated, res.success, etc.)
app.use(responseHelpersMiddleware);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

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

// Root dashboard
// Serve dashboard HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'dashboard.html'));
});

// API Routes
app.use('/api/v1', v1Routes);

// Serve static files from public directory
app.use(express.static(path.join(process.cwd(), 'public')));

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
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

// Start server with health checks
const startServer = async () => {
  try {
    // Perform startup health checks
    const healthChecks = await performStartupChecks();

    // Only start server if critical services are available
    if (!healthChecks.database) {
      logger.error('CRITICAL: Cannot start server without MongoDB connection');
      logger.error('SUGGESTION: Please ensure MongoDB is running and accessible');
      logger.error('TROUBLESHOOTING:');
      logger.error('   - Check if MongoDB service is running: net start MongoDB');
      logger.error('   - Verify connection string in environment variables');
      logger.error('   - Ensure MongoDB is bound to correct IP (0.0.0.0 for remote access)');
      process.exit(1);
    }

    // Start the HTTP server
    server = app.listen(PORT, () => {
      logger.startup(`Server started successfully on port ${PORT}`);
      logger.startup(`API available at http://localhost:${PORT}`);
      logger.startup(`API Documentation at http://localhost:${PORT}/api-docs`);
      logger.startup(`Health Check at http://localhost:${PORT}/api/v1/health`);
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
    // Close server
    if (server) {
      await new Promise((resolve) => {
        server.close(resolve);
      });
      logger.startup('HTTP server closed');
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
