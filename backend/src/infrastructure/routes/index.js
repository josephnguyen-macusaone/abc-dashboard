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
  console.log('🏗️ Main routes: Creating license routes');
  const licenseController = await awilixContainer.getLicenseController();
  const lifecycleController = await awilixContainer.getLicenseLifecycleController();
  const authMiddleware = await awilixContainer.getAuthMiddleware();
  console.log('🏗️ Main routes: Controllers created, mounting license routes');
  const licenseRoutes = createLicenseRoutes(licenseController, lifecycleController, authMiddleware);
  console.log('🏗️ Main routes: License routes created, type:', typeof licenseRoutes);

  // Debug: Log all routes in the license router
  console.log('🏗️ Main routes: License router stack:');
  licenseRoutes.stack.forEach((layer, index) => {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods).join(', ');
      console.log(`  ${index}: ${methods.toUpperCase()} ${layer.route.path}`);
    } else if (layer.name === 'authenticate') {
      console.log(`  ${index}: Middleware: ${layer.name}`);
    }
  });

  router.use('/licenses', licenseRoutes);
  console.log('🏗️ Main routes: License routes mounted successfully');

  // Debug route - bypass license router middleware
  router.get('/debug-test-bypass', (req, res) => {
    console.log('DEBUG: Bypass route called');
    return res.json({ success: true, message: 'Bypass route works' });
  });

  // External License routes (real external API integration)
  const externalLicenseController = await awilixContainer.getExternalLicenseController();
  router.use('/external-licenses', createExternalLicenseRoutes(externalLicenseController, authMiddleware));

  // License Sync Monitoring routes
  router.use('/license-sync', licenseSyncMonitoringRoutes);

  return router;
};
