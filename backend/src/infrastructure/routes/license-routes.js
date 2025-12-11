import express from 'express';

export const createLicenseRoutes = (controller, authMiddleware) => {
  const router = express.Router();

  // All routes require authentication
  router.use(authMiddleware.authenticate);

  router.get('/', controller.getLicenses);
  router.get('/:id', controller.getLicenseById);
  router.post('/', controller.createLicense);
  router.put('/:id', controller.updateLicense);
  router.patch('/bulk', controller.bulkUpdate);
  router.post('/bulk', controller.bulkCreate);
  router.post('/row', controller.addRow);
  router.delete('/bulk', controller.bulkDelete);
  router.delete('/:id', controller.deleteLicense);

  return router;
};
