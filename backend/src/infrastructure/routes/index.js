import express from 'express';
import { createAuthRoutes } from './auth-routes.js';
import { createUserRoutes } from './user-routes.js';
import { createProfileRoutes } from './profile-routes.js';
import { createLicenseRoutes } from './license-routes.js';
import { createExternalLicenseRoutes } from './external-license-routes.js';
import licenseSyncMonitoringRoutes from './license-sync-monitoring-routes.js';
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

  // License routes (mock-backed for initial integration)
  const licenseController = await awilixContainer.getLicenseController();
  const authMiddleware = await awilixContainer.getAuthMiddleware();
  router.use('/licenses', createLicenseRoutes(licenseController, authMiddleware));

  // External License routes (real external API integration)
  const externalLicenseController = await awilixContainer.getExternalLicenseController();
  router.use('/external-licenses', createExternalLicenseRoutes(externalLicenseController, authMiddleware));

  // License Sync Monitoring routes
  router.use('/license-sync', licenseSyncMonitoringRoutes);

  return router;
};
