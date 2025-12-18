import { LicenseValidator } from '../../application/validators/license-validator.js';
import { ValidationException } from '../../domain/exceptions/domain.exception.js';
import { sendErrorResponse } from '../../shared/http/error-responses.js';

export class LicenseController {
  constructor(licenseService) {
    this.licenseService = licenseService;
  }

  getLicenses = async (req, res) => {
    try {
      const query = LicenseValidator.validateListQuery(req.query);
      const result = await this.licenseService.getLicenses(query);

      // Use success with meta to include stats (like user controller)
      return res.success(result.getData(), 'Licenses retrieved successfully', result.getMeta());
    } catch (error) {
      if (error instanceof ValidationException) {
        return res.badRequest(error.message);
      }
      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  getLicenseById = async (req, res) => {
    try {
      const license = await this.licenseService.getLicenseById(req.params.id);
      if (!license) {
        return sendErrorResponse(res, 'NOT_FOUND');
      }

      return res.success({ license }, 'License retrieved successfully');
    } catch {
      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  createLicense = async (req, res) => {
    try {
      LicenseValidator.validateCreateInput(req.body);

      const context = {
        userId: req.user?.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      };

      const license = await this.licenseService.createLicense(req.body, context);
      return res.created({ license }, 'License created successfully');
    } catch (error) {
      if (error instanceof ValidationException) {
        return res.badRequest(error.message);
      }
      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  updateLicense = async (req, res) => {
    try {
      LicenseValidator.validateUpdateInput(req.body);

      const context = {
        userId: req.user?.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      };

      const updated = await this.licenseService.updateLicense(req.params.id, req.body, context);
      if (!updated) {
        return sendErrorResponse(res, 'NOT_FOUND');
      }

      return res.success({ license: updated }, 'License updated successfully');
    } catch (error) {
      if (error instanceof ValidationException) {
        return res.badRequest(error.message);
      }
      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  bulkUpdate = async (req, res) => {
    try {
      LicenseValidator.validateBulkUpdateInput(req.body);
      const updated = await this.licenseService.bulkUpdateLicenses(req.body.updates);

      return res.success(
        { licenses: updated, updated: updated.length },
        'Licenses updated successfully'
      );
    } catch (error) {
      if (error instanceof ValidationException) {
        return res.badRequest(error.message);
      }
      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  bulkCreate = async (req, res) => {
    try {
      LicenseValidator.validateBulkCreateInput(req.body);

      // Add audit fields to each license
      const licensesWithAudit = req.body.licenses.map((license) => ({
        ...license,
        createdBy: req.user?.id,
        updatedBy: req.user?.id,
        seatsUsed: license.seatsUsed || 0, // Ensure seatsUsed is set
      }));

      const created = await this.licenseService.bulkCreateLicenses(licensesWithAudit);

      return res.created(
        { licenses: created, created: created.length },
        'Licenses created successfully'
      );
    } catch (error) {
      if (error instanceof ValidationException) {
        return res.badRequest(error.message);
      }
      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  addRow = async (req, res) => {
    try {
      // Reuse create validation; allows empty dba/zip for grid add flow by relaxing requirements
      // Only enforce required fields after save
      const payload = { ...req.body };
      if (!payload.dba) {
        payload.dba = '';
      }
      if (!payload.startDay) {
        payload.startDay = new Date().toISOString().slice(0, 10);
      }

      const license = await this.repository.save(payload);
      return res.created({ license }, 'License row created successfully');
    } catch (error) {
      if (error instanceof ValidationException) {
        return res.badRequest(error.message);
      }
      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  bulkDelete = async (req, res) => {
    try {
      LicenseValidator.validateIdsArray(req.body);
      const deletedCount = await this.repository.bulkDelete(req.body.ids);

      return res.success({ deleted: deletedCount }, 'Licenses deleted successfully');
    } catch (error) {
      if (error instanceof ValidationException) {
        return res.badRequest(error.message);
      }
      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  deleteLicense = async (req, res) => {
    try {
      const context = {
        userId: req.user?.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      };

      const removed = await this.licenseService.deleteLicense(req.params.id, context);
      if (!removed) {
        return sendErrorResponse(res, 'NOT_FOUND');
      }

      return res.success(null, 'License deleted successfully');
    } catch {
      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  getDashboardMetrics = async (req, res) => {
    try {
      const query = LicenseValidator.validateListQuery(req.query);
      const metrics = await this.licenseService.getDashboardMetrics({
        filters: query.filters,
      });

      return res.success(metrics, 'Dashboard metrics retrieved successfully');
    } catch (error) {
      if (error instanceof ValidationException) {
        return res.badRequest(error.message);
      }
      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };
}
