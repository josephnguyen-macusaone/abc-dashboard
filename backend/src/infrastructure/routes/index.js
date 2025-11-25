import express from 'express';
import { createAuthRoutes } from './auth-routes.js';
import { createUserRoutes } from './user-routes.js';
import { container } from '../../shared/kernel/container.js';

/**
 * Main API Routes
 * Combines all route modules
 */
const router = express.Router();

// Auth routes
const authController = container.getAuthController();
router.use('/auth', createAuthRoutes(authController));

// User routes
const userController = container.getUserController();
router.use('/users', createUserRoutes(userController));

export default router;
