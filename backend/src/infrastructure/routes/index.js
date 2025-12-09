import express from 'express';
import { createAuthRoutes } from './auth-routes.js';
import { createUserRoutes } from './user-routes.js';
import { createProfileRoutes } from './profile-routes.js';
import { awilixContainer } from '../../shared/kernel/container.js';

/**
 * Main API Routes
 * Combines all route modules
 * Routes are created lazily to ensure database connection is established
 */
export const createRoutes = async () => {
  const router = express.Router();

  // Auth routes
  const authController = await awilixContainer.getAuthController();
  router.use('/auth', createAuthRoutes(authController));

  // User routes
  const userController = await awilixContainer.getUserController();
  router.use('/users', createUserRoutes(userController));

  // Profile routes
  const profileController = await awilixContainer.getProfileController();
  router.use('/', createProfileRoutes(profileController));

  return router;
};
