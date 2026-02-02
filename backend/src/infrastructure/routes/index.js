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

  // License routes
  const licenseController = await awilixContainer.getLicenseController();
  const lifecycleController = await awilixContainer.getLicenseLifecycleController();
  const authMiddleware = await awilixContainer.getAuthMiddleware();
  const licenseRoutes = createLicenseRoutes(licenseController, lifecycleController, authMiddleware);

  router.use('/licenses', licenseRoutes);

  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    router.get('/debug-test-bypass', (req, res) => {
      return res.json({ success: true, message: 'Bypass route works' });
    });

    router.get('/debug-external-licenses', async (req, res) => {
      try {
        await awilixContainer.getExternalLicenseController();
        return res.json({ success: true, message: 'External license controller works' });
      } catch (error) {
        return res.json({ success: false, error: error.message });
      }
    });
  }

  // External License routes (real external API integration)
  const externalLicenseController = await awilixContainer.getExternalLicenseController();
  router.use(
    '/external-licenses',
    createExternalLicenseRoutes(externalLicenseController, authMiddleware)
  );

  // License Sync Monitoring routes
  router.use('/license-sync', licenseSyncMonitoringRoutes);

  return router;
};
