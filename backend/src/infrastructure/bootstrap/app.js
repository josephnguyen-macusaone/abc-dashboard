// Application bootstrap for testing
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { config } from '../config/config.js';
import v1Routes from '../routes/index.js';
import { errorHandler } from '../api/v1/middleware/error-handler.middleware.js';
import { correlationIdMiddleware } from '../api/v1/middleware/correlation-id.middleware.js';
import { requestLogger } from '../api/v1/middleware/request-logger.middleware.js';
import {
  securityHeaders,
  requestSizeLimiter,
  injectionProtection,
  createRateLimit,
} from '../api/v1/middleware/security.middleware.js';
import { responseHelpersMiddleware } from '../../shared/http/response-transformer.js';
import {
  cacheTrackingMiddleware,
  userActivityMiddleware,
  securityMetricsMiddleware,
  performanceMiddleware,
} from '../api/v1/middleware/metrics.middleware.js';
import swaggerSpec from '../config/swagger.js';
import logger from '../config/logger.js';
import { sendErrorResponse } from '../../shared/http/error-responses.js';
import { getHealthWithMetrics } from '../config/monitoring.js';

// Create Express app
const app = express();

// Basic middleware setup for testing
app.use(correlationIdMiddleware);
app.use(helmet());
app.use(securityHeaders);
app.use(requestSizeLimiter);
app.use(injectionProtection);

// Rate limiting (reduced for testing)
const generalLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  1000, // Higher limit for testing
  'Too many requests from this IP, please try again later.'
);
app.use(generalLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(requestLogger);

// Performance monitoring
app.use(performanceMiddleware);

// Metrics collection middleware
app.use(cacheTrackingMiddleware);
app.use(userActivityMiddleware);
app.use(securityMetricsMiddleware);

// Response helpers
app.use(responseHelpersMiddleware);

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

// Health check with comprehensive metrics
app.get('/api/v1/health', getHealthWithMetrics);

// Detailed metrics endpoint (admin access recommended)
app.get('/api/v1/metrics', async (req, res) => {
  try {
    // In production, you might want to add authentication/authorization here
    const { getDetailedMetrics } = await import('../config/monitoring.js');
    await getDetailedMetrics(req, res);
  } catch (error) {
    logger.error('Error in metrics endpoint:', error);
    return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
  }
});

// Prometheus metrics removed - not in use

// API Routes
app.use('/api/v1', v1Routes);

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

// Error handling
app.use(errorHandler);

// Export for testing
export { app };
export default app;
