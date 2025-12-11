import { LicenseValidator } from '../../application/validators/license-validator.js';
import { ValidationException } from '../../domain/exceptions/domain.exception.js';
import { sendErrorResponse } from '../../shared/http/error-responses.js';

export class LicenseController {
  constructor(store) {
    this.store = store;
  }

  getLicenses = (req, res) => {
    try {
      const query = LicenseValidator.validateListQuery(req.query);
      const result = this.store.list(query);

      return res.paginated(
        result.items,
        result.page,
        result.limit,
        result.total,
        'Licenses retrieved successfully'
      );
    } catch (error) {
      if (error instanceof ValidationException) {
        return res.badRequest(error.message);
      }
      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  getLicenseById = (req, res) => {
    try {
      const license = this.store.getById(req.params.id);
      if (!license) {
        return sendErrorResponse(res, 'NOT_FOUND');
      }

      return res.success({ license }, 'License retrieved successfully');
    } catch {
      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  createLicense = (req, res) => {
    try {
      LicenseValidator.validateCreateInput(req.body);
      const license = this.store.create(req.body);
      return res.created({ license }, 'License created successfully');
    } catch (error) {
      if (error instanceof ValidationException) {
        return res.badRequest(error.message);
      }
      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  updateLicense = (req, res) => {
    try {
      LicenseValidator.validateUpdateInput(req.body);
      const updated = this.store.update(req.params.id, req.body);
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

  bulkUpdate = (req, res) => {
    try {
      LicenseValidator.validateBulkUpdateInput(req.body);
      const updated = this.store.bulkUpdate(req.body.updates);

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

  bulkCreate = (req, res) => {
    try {
      LicenseValidator.validateBulkCreateInput(req.body);
      const created = this.store.bulkCreate(req.body.licenses);

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

  addRow = (req, res) => {
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

      const license = this.store.createRow(payload);
      return res.created({ license }, 'License row created successfully');
    } catch (error) {
      if (error instanceof ValidationException) {
        return res.badRequest(error.message);
      }
      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  bulkDelete = (req, res) => {
    try {
      LicenseValidator.validateIdsArray(req.body);
      const result = this.store.bulkDelete(req.body.ids);

      return res.success(
        { deleted: result.deleted, notFound: result.notFound },
        result.notFound.length > 0
          ? 'Some licenses could not be found'
          : 'Licenses deleted successfully'
      );
    } catch (error) {
      if (error instanceof ValidationException) {
        return res.badRequest(error.message);
      }
      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  deleteLicense = (req, res) => {
    try {
      const removed = this.store.delete(req.params.id);
      if (!removed) {
        return sendErrorResponse(res, 'NOT_FOUND');
      }
      return res.success(null, 'License deleted successfully');
    } catch {
      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };
}
