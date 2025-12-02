import express from 'express';
import { createAuthRoutes } from './auth-routes.js';
import { createUserRoutes } from './user-routes.js';
import { createProfileRoutes } from './profile-routes.js';
import { awilixContainer } from '../../shared/kernel/container.js';

/**
 * Main API Routes
 * Combines all route modules
 */
const router = express.Router();

// Auth routes
const authController = awilixContainer.getAuthController();
router.use('/auth', createAuthRoutes(authController));

// User routes
const userController = awilixContainer.getUserController();
router.use('/users', createUserRoutes(userController));

// Profile routes
const profileController = awilixContainer.getProfileController();
router.use('/', createProfileRoutes(profileController));

export default router;
