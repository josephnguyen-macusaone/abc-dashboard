import crypto from 'crypto';
import { LicenseValidator } from '../../application/validators/license-validator.js';
import {
  ValidationException,
  ConcurrentModificationException,
} from '../../domain/exceptions/domain.exception.js';
import { sendErrorResponse, formatCanonicalError } from '../../shared/http/error-responses.js';
import logger from '../../shared/utils/logger.js';
import { cache, cacheKeys, cacheTTL } from '../config/redis.js';
import { ROLES } from '../../shared/constants/roles.js';

/** Fields allowed in PATCH /licenses/bulk array body (`lastActive` is sync-only). */
const BULK_UPDATE_UPDATABLE_FIELDS = [
  'dba',
  'zip',
  'startsAt',
  'status',
  'plan',
  'term',
  'dueDate',
  'seatsTotal',
  'seatsUsed',
  'cancelDate',
  'lastPayment',
  'smsPurchased',
  'smsSent',
  'smsBalance',
  'agents',
  'agentsName',
  'agentsCost',
  'notes',
  'key',
  'product',
  'expectedUpdatedAt',
  'updatedAt',
];

/**
 * Normalize bulk update body to `{ id, updates }[]`.
 * @param {object|Array} body
 * @returns {Array<{ id: string, updates: object }>}
 */
function parseBulkUpdatePayload(body) {
  if (body?.updates && Array.isArray(body.updates)) {
    return body.updates;
  }
  if (Array.isArray(body)) {
    const licensesToUpdate = body.map((license) => {
      const updates = {};
      BULK_UPDATE_UPDATABLE_FIELDS.forEach((field) => {
        if (license[field] !== undefined) {
          updates[field] = license[field];
        }
      });
      return { id: license.id, updates };
    });
    licensesToUpdate.forEach((item, index) => {
      if (!item.id) {
        throw new ValidationException(`License at index ${index} is missing required 'id' field`);
      }
      if (!item.updates || Object.keys(item.updates).length === 0) {
        throw new ValidationException(`License at index ${index} has no valid fields to update`);
      }
    });
    return licensesToUpdate;
  }
  throw new ValidationException(
    'Invalid request format. Expected array of licenses or object with updates property'
  );
}

/** @param {import('express').Request} req */
function resolveLicenseAuditPagination(req) {
  const pageParsed = Number.parseInt(String(req.query.page ?? '1'), 10);
  const page =
    req.validatedQuery?.page ?? (Number.isFinite(pageParsed) && pageParsed >= 1 ? pageParsed : 1);
  const limitParsed = Number.parseInt(String(req.query.limit ?? '50'), 10);
  const limitRaw =
    req.validatedQuery?.limit ??
    (Number.isFinite(limitParsed) && limitParsed >= 1 ? limitParsed : 50);
  const limit = Math.min(Math.max(1, limitRaw), 100);
  return { page, limit };
}

export class LicenseController {
  constructor(licenseService, licenseSyncScheduler = null, licenseRealtimeService = null) {
    this.licenseService = licenseService;
    this.licenseSyncScheduler = licenseSyncScheduler;
    this.licenseRealtimeService = licenseRealtimeService;
  }

  getLicenses = async (req, res) => {
    try {
      const query = LicenseValidator.validateListQuery(req.query);
      if (req.user?.role === ROLES.AGENT && req.user?.id) {
        query.filters = {
          ...(query.filters || {}),
          assignedUserId: req.user.id,
        };
      }

      logger.debug('License API request initiated', {
        correlationId: req.correlationId,
        page: query.page,
        limit: query.limit,
      });

      const result = await this.licenseService.getLicenses(query);

      // VALIDATION: Check for external API data contamination (logged inside _validateInternalDataIntegrity)
      this._validateInternalDataIntegrity(result, query, req.correlationId);

      // Get the correct total count from external API for display
      // BUT ONLY when no filters are applied - when filters are active, use the filtered total
      let correctedMeta = { ...result.getMeta() }; // Deep copy to avoid mutation

      logger.info('License list', {
        correlationId: req.correlationId,
        page: query.page,
        limit: query.limit,
        total: result.getMeta()?.total,
        dataLength: result.getData()?.length || 0,
      });

      // Always use internal database results - no external API override
      correctedMeta = { ...result.getMeta() };

      // Return result with correct meta (filtered total when filters are active)
      return res.success(result.getData(), 'Licenses retrieved successfully', correctedMeta);
    } catch (error) {
      logger.error('License controller getLicenses error', {
        correlationId: req.correlationId,
        error: error.message,
        stack: error.stack,
        query: req.query,
      });

      if (error instanceof ValidationException) {
        return res.badRequest(error.message);
      }
      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  /**
   * Validate that license data comes from internal database, not external API.
   * Contamination = returning unfiltered external API total when filters are applied.
   * @returns {Object} Validation result with violations array
   */
  _validateInternalDataIntegrity(result, query, correlationId) {
    const data = result.getData();
    const meta = result.getMeta();
    const hasFilters = query.filters && Object.keys(query.filters).length > 0;
    const total = meta?.total ?? 0;

    const violations = this._collectDataIntegrityViolations(data, hasFilters, total);
    if (violations.length > 0) {
      logger.warn('Possible external API data contamination', {
        correlationId,
        violations: violations.map((v) => v.description),
        hasFilters,
        dataLength: data.length,
        reportedTotal: total,
        filters: Object.keys(query.filters || {}),
      });
      this._applyMetaCorrectionIfNeeded(violations, hasFilters, data, meta, total, correlationId);
    }

    return { violations, hasViolations: violations.length > 0 };
  }

  _collectDataIntegrityViolations(data, hasFilters, total) {
    const violations = [];
    if (hasFilters && total === 2836) {
      violations.push({
        type: 'known_external_total_with_filters',
        description:
          'Filtered query total (2836) matches external API total — likely unfiltered count',
        severity: 'critical',
      });
    }
    if (hasFilters && data.length === 1 && total > 10) {
      violations.push({
        type: 'single_result_high_total',
        description: `Single result but total (${total}) suggests unfiltered data`,
        severity: 'high',
      });
    }
    return violations;
  }

  _applyMetaCorrectionIfNeeded(violations, hasFilters, data, meta, total, correlationId) {
    const hasSevere = violations.some((v) => v.severity === 'high' || v.severity === 'critical');
    if (!hasFilters || !hasSevere) {
      return;
    }
    logger.debug('Auto-correcting meta for filtered query', { correlationId });
    if (data.length === 0 && total > 0 && meta && typeof meta === 'object') {
      meta.total = 0;
      meta.totalPages = 0;
    }
  }

  /**
   * Manually trigger license sync (for admin use).
   * Routes through scheduler so syncInProgress is set and frontend can show banner/disable button.
   */
  syncLicenses = async (req, res) => {
    try {
      if (!this.licenseSyncScheduler) {
        return res.badRequest('Sync service not available');
      }

      // Fire-and-forget: scheduler sets syncInProgress, runs sync, emits on complete
      const syncPromise = this.licenseSyncScheduler.runManualSync({
        comprehensive: false,
        batchSize: 20,
        syncToInternalOnly: false,
        forceFullSync: false,
      });

      // Return immediately
      res.success({ message: 'Sync started in background' }, 'Sync initiated successfully');

      syncPromise.catch((error) => {
        logger.error('Manual sync failed', { error: error.message });
      });
    } catch (error) {
      logger.error('Failed to initiate manual sync', { error: error.message });
      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  getLicenseById = async (req, res) => {
    try {
      if (req.user?.role === ROLES.AGENT) {
        const hasAssignment = await this.licenseService.licenseRepository.hasUserAssignment(
          req.params.id,
          req.user.id
        );
        if (!hasAssignment) {
          return res.forbidden('You can only access licenses assigned to you');
        }
      }

      const license = await this.licenseService.getLicenseById(req.params.id);
      if (!license) {
        return sendErrorResponse(res, 'RESOURCE_NOT_FOUND');
      }

      return res.success({ license }, 'License retrieved successfully');
    } catch {
      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  getLicenseAuditEvents = async (req, res) => {
    try {
      const licenseId = req.params.id;

      if (req.user?.role === ROLES.AGENT) {
        const hasAssignment = await this.licenseService.licenseRepository.hasUserAssignment(
          licenseId,
          req.user.id
        );
        if (!hasAssignment) {
          return res.forbidden('You can only access licenses assigned to you');
        }
      }

      const licenseEntity = await this.licenseService.licenseRepository.findById(licenseId);
      if (!licenseEntity) {
        return sendErrorResponse(res, 'RESOURCE_NOT_FOUND');
      }

      const { page, limit } = resolveLicenseAuditPagination(req);

      const result = await this.licenseService.getAuditEvents(licenseId, { page, limit });
      const events = result.events.map((e) => (typeof e.toJSON === 'function' ? e.toJSON() : e));

      return res.success(
        {
          events,
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
        },
        'License audit events retrieved successfully'
      );
    } catch {
      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  createLicense = async (req, res) => {
    try {
      LicenseValidator.validateCreateInput(req.body);

      const context = {
        userId: req.user?.id,
        userRole: req.user?.role,
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
        userRole: req.user?.role,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        expectedUpdatedAt: req.body?.expectedUpdatedAt || req.body?.updatedAt,
      };

      const updated = await this.licenseService.updateLicense(req.params.id, req.body, context);
      if (!updated) {
        return sendErrorResponse(res, 'RESOURCE_NOT_FOUND');
      }

      return res.success({ license: updated }, 'License updated successfully');
    } catch (error) {
      if (error instanceof ValidationException) {
        return res.badRequest(error.message);
      }
      if (error instanceof ConcurrentModificationException) {
        return sendErrorResponse(
          res,
          'CONCURRENT_MODIFICATION',
          { resource: 'License' },
          {
            ...(error.additionalData || {}),
          }
        );
      }
      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  bulkUpdate = async (req, res) => {
    let licensesToUpdate = [];
    try {
      licensesToUpdate = parseBulkUpdatePayload(req.body);

      const bulkContext = {
        userId: req.user?.id,
        userRole: req.user?.role,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      };
      const updated = await this.licenseService.bulkUpdateLicenses(licensesToUpdate, bulkContext);

      const message =
        updated.length === licensesToUpdate.length
          ? 'All licenses updated successfully'
          : `${updated.length} of ${licensesToUpdate.length} licenses updated successfully`;

      if (this.licenseRealtimeService?.emitDataChanged) {
        this.licenseRealtimeService.emitDataChanged({
          source: 'bulk_update',
          ids: updated.map((u) => String(u?.id)).filter(Boolean),
        });
      }

      // For bulk operations, return data as array for frontend compatibility
      return res.status(200).json({
        success: true,
        message,
        timestamp: new Date().toISOString(),
        data: updated,
      });
    } catch (error) {
      if (error instanceof ValidationException) {
        return res.badRequest(error.message);
      }
      if (error instanceof ConcurrentModificationException) {
        return sendErrorResponse(
          res,
          'CONCURRENT_MODIFICATION',
          { resource: 'License' },
          {
            ...(error.additionalData || {}),
          }
        );
      }
      logger.error('Bulk update failed', {
        error: error.message,
        stack: error.stack,
        count: licensesToUpdate?.length || 0,
      });
      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  bulkCreate = async (req, res) => {
    try {
      // Handle both structured format {licenses: [...]} and direct array format [...]
      let licensesToCreate = [];
      if (req.body.licenses && Array.isArray(req.body.licenses)) {
        // Structured format
        licensesToCreate = req.body.licenses;
      } else if (Array.isArray(req.body)) {
        // Direct array format - transform to structured format
        const today = new Date().toISOString().slice(0, 10);
        licensesToCreate = req.body.map((license) => {
          // Handle field name differences (startsAt vs startDay); DB requires starts_at
          const processedLicense = { ...license };
          const startValue = processedLicense.startsAt || processedLicense.startDay;
          processedLicense.startDay =
            startValue && String(startValue).trim()
              ? String(startValue).trim().slice(0, 10)
              : today;
          delete processedLicense.startsAt;
          return processedLicense;
        });
      } else {
        throw new ValidationException(
          'Invalid request format. Expected array of licenses or object with licenses property'
        );
      }

      // Basic validation
      if (licensesToCreate.length === 0) {
        throw new ValidationException('No licenses provided for creation');
      }

      // Strip client-supplied createdBy/updatedBy; bulkCreateLicenses applies req.user via context for FK + license_audit_events.
      const licensesWithAudit = licensesToCreate.map((license) => ({
        ...license,
        createdBy: undefined,
        updatedBy: undefined,
        seatsUsed: license.seatsUsed || 0, // Ensure seatsUsed is set
      }));

      const bulkContext = {
        userId: req.user?.id,
        userRole: req.user?.role,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      };
      const { createdLicenses, errors } = await this.licenseService.bulkCreateLicenses(
        licensesWithAudit,
        bulkContext
      );

      if (this.licenseRealtimeService?.emitDataChanged && createdLicenses.length > 0) {
        this.licenseRealtimeService.emitDataChanged({
          source: 'bulk_create',
          ids: createdLicenses.map((l) => String(l?.id)).filter(Boolean),
        });
      }

      if (createdLicenses.length === 0) {
        const message =
          errors.length > 0
            ? `License creation failed: ${errors[0].error}`
            : 'No licenses were created. Check validation or server logs.';
        const payload = formatCanonicalError('VALIDATION_FAILED', {
          customMessage: message,
          details: {
            data: [],
            errors: errors.length > 0 ? errors : [{ index: 0, key: 'unknown', error: message }],
          },
        });
        return res.status(payload.error.statusCode).json(payload);
      }

      return res.created(createdLicenses, 'Licenses created successfully');
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
      const payload = { ...req.body };
      if (!payload.dba) {
        payload.dba = '';
      }
      if (!payload.startDay) {
        payload.startDay = new Date().toISOString().slice(0, 10);
      }

      const context = {
        userId: req.user?.id,
        userRole: req.user?.role,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      };
      const license = await this.licenseService.createLicense(payload, context);
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
      const bulkContext = {
        userId: req.user?.id,
        userRole: req.user?.role,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      };
      const deletedCount = await this.licenseService.bulkDelete(req.body.ids, bulkContext);

      if (this.licenseRealtimeService?.emitDataChanged && deletedCount > 0) {
        this.licenseRealtimeService.emitDataChanged({
          source: 'bulk_delete',
          ids: req.body.ids?.map(String) || [],
        });
      }

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
        userRole: req.user?.role,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      };

      const removed = await this.licenseService.deleteLicense(req.params.id, context);
      if (!removed) {
        return sendErrorResponse(res, 'RESOURCE_NOT_FOUND');
      }

      return res.success(null, 'License deleted successfully');
    } catch {
      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  getDashboardMetrics = async (req, res) => {
    try {
      const query = LicenseValidator.validateListQuery(req.query);
      if (req.user?.role === ROLES.AGENT && req.user?.id) {
        query.filters = {
          ...(query.filters || {}),
          assignedUserId: req.user.id,
        };
      }
      const dateRange = {};
      if (req.query.startsAtFrom) {
        dateRange.startsAtFrom = decodeURIComponent(req.query.startsAtFrom);
      }
      if (req.query.startsAtTo) {
        dateRange.startsAtTo = decodeURIComponent(req.query.startsAtTo);
      }
      const options = {
        filters: query.filters,
        ...(Object.keys(dateRange).length > 0 && { dateRange }),
      };

      // Short-TTL response cache (Redis or in-memory) to avoid repeated heavy queries
      const cachePayload = JSON.stringify({
        filters: options.filters,
        dateRange: options.dateRange,
      });
      const queryHash = crypto.createHash('sha256').update(cachePayload).digest('hex').slice(0, 16);
      const cacheKey = cacheKeys.dashboardMetrics(queryHash);
      const cachedRaw = await cache.get(cacheKey);
      if (cachedRaw) {
        logger.debug('Dashboard metrics cache hit', { correlationId: req.correlationId });
        const cached = typeof cachedRaw === 'string' ? JSON.parse(cachedRaw) : cachedRaw;
        return res.success(cached, 'Dashboard metrics retrieved successfully');
      }

      const metrics = await this.licenseService.getDashboardMetrics(options);
      await cache.set(cacheKey, metrics, cacheTTL.dashboardMetrics);

      logger.info('Dashboard metrics', {
        correlationId: req.correlationId,
        userId: req.user?.id,
      });

      return res.success(metrics, 'Dashboard metrics retrieved successfully');
    } catch (error) {
      logger.error('Dashboard metrics error:', {
        error: error.message,
        stack: error.stack,
        query: req.query,
      });
      if (error instanceof ValidationException) {
        return res.badRequest(error.message);
      }
      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  /**
   * Get all unique agent names
   */
  getAllAgentNames = async (req, res) => {
    try {
      logger.debug('Getting all agent names', {
        correlationId: req.correlationId,
      });

      const agentNames = await this.licenseService.getAllAgentNames();

      logger.info('Agent names retrieved successfully', {
        correlationId: req.correlationId,
        count: agentNames.length,
      });

      return res.success({ agents: agentNames }, 'Agent names retrieved successfully');
    } catch (error) {
      logger.error('License controller getAllAgentNames error', {
        correlationId: req.correlationId,
        error: error.message,
        stack: error.stack,
      });
      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };
}
