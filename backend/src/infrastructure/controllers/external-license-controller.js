import { ValidationException } from '../../domain/exceptions/domain.exception.js';
import { sendErrorResponse } from '../../shared/http/error-responses.js';
import logger from '../../shared/utils/logger.js';
import { ROLES } from '../../shared/constants/roles.js';

/**
 * External License Controller
 * Handles HTTP requests for external license management
 */
export class ExternalLicenseController {
  constructor(
    syncExternalLicensesUseCase,
    manageExternalLicensesUseCase,
    licenseRepository = null
  ) {
    this.syncExternalLicensesUseCase = syncExternalLicensesUseCase;
    this.manageExternalLicensesUseCase = manageExternalLicensesUseCase;
    this.licenseRepository = licenseRepository;
  }

  getAllowedUpdateFieldsForRole(role) {
    if (role === ROLES.TECH) {
      return new Set(['ActivateDate', 'coming_expired', 'Coming_expired']);
    }
    if (role === ROLES.ACCOUNTANT) {
      return new Set([
        'status',
        'Package',
        'ActivateDate',
        'coming_expired',
        'Coming_expired',
        'monthlyFee',
      ]);
    }
    return null;
  }

  normalizeRoleScopedUpdates(req, updates) {
    const role = req.user?.role;
    const allowedFields = this.getAllowedUpdateFieldsForRole(role);
    if (!allowedFields) {
      return updates;
    }

    const receivedFields = Object.keys(updates || {});
    const disallowedFields = receivedFields.filter((field) => !allowedFields.has(field));
    if (disallowedFields.length > 0) {
      const allowed = Array.from(allowedFields).join(', ');
      throw new ValidationException(
        `${role} can only update the following fields: ${allowed}. Received unsupported fields: ${disallowedFields.join(', ')}`
      );
    }

    const normalized = { ...(updates || {}) };
    if (Object.prototype.hasOwnProperty.call(normalized, 'Coming_expired')) {
      normalized.coming_expired = normalized.Coming_expired;
      delete normalized.Coming_expired;
    }

    if (Object.keys(normalized).length === 0) {
      throw new ValidationException('No update fields were provided');
    }

    return normalized;
  }

  buildAuditMetadata(req, action, extra = {}) {
    return {
      action,
      actorRole: req.user?.role || null,
      createdBy: req.user?.id || null,
      updatedBy: req.user?.id || null,
      timestamp: new Date().toISOString(),
      ...extra,
    };
  }

  logOperation(req, action, extra = {}) {
    logger.info('external_license_operation', {
      correlationId: req.correlationId,
      userId: req.user?.id ?? null,
      userRole: req.user?.role ?? null,
      action,
      method: req.method,
      path: req.path,
      ...extra,
    });
  }

  handleExternalApiError(res, error) {
    if (error instanceof ValidationException) {
      const message = error.message || 'Validation failed';
      if (message.includes('assigned licenses')) {
        return res.forbidden(message);
      }
      return res.badRequest(message);
    }

    const message = String(error?.message || '');
    const statusMatch = message.match(/^HTTP\s+(\d{3})\s*:/i);
    if (statusMatch) {
      const statusCode = Number.parseInt(statusMatch[1], 10);
      if (statusCode === 400) {
        return res.badRequest(message);
      }
      if (statusCode === 401 || statusCode === 403) {
        return res.forbidden(message);
      }
      if (statusCode === 404) {
        return res.notFound(message);
      }
    }

    if (message === 'License not found') {
      return res.notFound(message);
    }

    return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
  }

  async resolveLicenseIdForAudit({ id, appid, countid }) {
    if (!this.licenseRepository) {
      return null;
    }
    if (id) {
      return id;
    }
    if (appid) {
      const license = await this.licenseRepository.findByAppId(appid);
      return license?.id ?? null;
    }
    if (countid !== undefined && countid !== null) {
      const license = await this.licenseRepository.findByCountId(countid);
      return license?.id ?? null;
    }
    return null;
  }

  async createExternalAuditEvent(req, { type, entityId, metadata }) {
    if (!this.licenseRepository || !entityId || !req.user?.id) {
      return;
    }
    try {
      await this.licenseRepository.createAuditEvent({
        type,
        actorId: req.user.id,
        entityId,
        entityType: 'license',
        metadata,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
    } catch (error) {
      logger.warn('Failed to create external license audit event', {
        correlationId: req.correlationId,
        type,
        entityId,
        error: error.message,
      });
    }
  }

  /**
   * SMS / external APIs use short app id (e.g. toJeMUW). Agents may still send EXT-… from stale clients.
   */
  normalizeSmsQueryAppid(value) {
    if (value === undefined || value === null) {
      return undefined;
    }
    const s = String(value).trim();
    if (!s) {
      return undefined;
    }
    const m = s.match(/^EXT-([^-]+)-/i);
    return m ? m[1].trim() : s;
  }

  async resolveInternalLicenseForSmsScope(identifier) {
    if (!this.licenseRepository) {
      return null;
    }
    if (identifier.appid) {
      const forLookup = this.normalizeSmsQueryAppid(identifier.appid) ?? identifier.appid;
      return this.licenseRepository.findByAppId(forLookup);
    }
    if (identifier.countid !== undefined && identifier.countid !== null) {
      return this.licenseRepository.findByCountId(identifier.countid);
    }
    if (identifier.emailLicense) {
      return this.licenseRepository.findByEmailLicense(identifier.emailLicense);
    }
    return null;
  }

  async ensureSmsScopeAccess(req, identifier) {
    const isAgent = req.user?.role === ROLES.AGENT;
    if (!isAgent) {
      return;
    }

    const hasIdentifier =
      identifier.appid ||
      (identifier.countid !== undefined && identifier.countid !== null) ||
      identifier.emailLicense;

    if (!hasIdentifier) {
      throw new ValidationException('Agent SMS operations require appid, countid, or emailLicense');
    }

    const internalLicense = await this.resolveInternalLicenseForSmsScope(identifier);
    if (!internalLicense) {
      throw new ValidationException('License not found for provided identifier');
    }

    const hasAssignment = await this.licenseRepository.hasUserAssignment(
      internalLicense.id,
      req.user.id
    );
    if (!hasAssignment) {
      throw new ValidationException('You can only access SMS operations for assigned licenses');
    }
  }

  async getAssignedExternalAppIdsForAgent(req) {
    if (req.user?.role !== ROLES.AGENT || !this.licenseRepository || !req.user?.id) {
      return null;
    }
    const assigned = await this.licenseRepository.findLicenses({
      page: 1,
      limit: 10000,
      filters: { assignedUserId: req.user.id },
    });
    return new Set(
      (assigned?.licenses || [])
        .map((item) =>
          String(item.appid || item.key || '')
            .trim()
            .toLowerCase()
        )
        .filter(Boolean)
    );
  }

  async ensureAgentExternalLicenseAccess(
    req,
    externalLicense,
    reason = 'You can only access licenses assigned to you'
  ) {
    if (req.user?.role !== ROLES.AGENT) {
      return;
    }
    if (!externalLicense) {
      throw new ValidationException('License not found');
    }
    const appid = String(externalLicense.appid || '')
      .trim()
      .toLowerCase();
    if (!appid) {
      throw new ValidationException(reason);
    }
    const assignedAppIds = await this.getAssignedExternalAppIdsForAgent(req);
    if (!assignedAppIds || !assignedAppIds.has(appid)) {
      throw new ValidationException(reason);
    }
  }

  async withExternalRepository(callback) {
    const { ExternalLicenseRepository } =
      await import('../repositories/external-license-repository.js');
    const knex = (await import('knex')).default;
    const { getKnexConfig } = await import('../config/database.js');
    const db = knex(getKnexConfig());
    try {
      const repo = new ExternalLicenseRepository(db);
      return await callback(repo);
    } finally {
      await this.destroyKnexConnection(db);
    }
  }

  getExternalListOptions(req) {
    return {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      filters: {
        ...(req.query.search ? { search: req.query.search } : {}),
        ...(req.query.status ? { status: req.query.status } : {}),
        ...(req.query.dba ? { dba: req.query.dba } : {}),
      },
      sortBy: req.query.sortBy || 'updated_at',
      sortOrder: req.query.sortOrder || 'desc',
    };
  }

  createAgentStatsPayload(licenses, daysThreshold = 30) {
    const now = new Date();
    const soon = new Date();
    soon.setDate(soon.getDate() + daysThreshold);

    const totalLicenses = licenses.length;
    const active = licenses.filter(
      (l) => String(l.status) === '1' || String(l.status).toLowerCase() === 'active'
    ).length;
    const expired = licenses.filter(
      (l) => l.coming_expired && new Date(l.coming_expired) < now
    ).length;
    const expiringSoon = licenses.filter((l) => {
      if (!l.coming_expired) {
        return false;
      }
      const exp = new Date(l.coming_expired);
      return exp >= now && exp <= soon;
    }).length;

    return {
      totalLicenses,
      active,
      expired,
      expiringSoon,
      pendingSync: 0,
      failedSync: 0,
    };
  }

  async syncBeforeExternalList(req, syncFirst) {
    if (!syncFirst) {
      return;
    }
    logger.info('External licenses getLicenses: syncing from external API first', {
      correlationId: req.correlationId,
      userId: req.user?.id,
    });
    try {
      await this.syncExternalLicensesUseCase.execute({
        syncToInternalOnly: false,
        comprehensive: true,
      });
    } catch (syncError) {
      logger.warn('Sync before getLicenses failed, returning existing DB data', {
        correlationId: req.correlationId,
        error: syncError.message,
      });
    }
  }

  filterAgentScopedLicenses(req, scopedLicenses) {
    const normalizedSearch = String(req.query.search || '')
      .trim()
      .toLowerCase();
    const normalizedStatus = req.query.status ? String(req.query.status).toLowerCase() : '';

    return scopedLicenses.filter((license) => {
      const matchesSearch = !normalizedSearch
        ? true
        : String(license.dba || '')
            .toLowerCase()
            .includes(normalizedSearch) ||
          String(license.appid || '')
            .toLowerCase()
            .includes(normalizedSearch) ||
          String(license.emailLicense || '')
            .toLowerCase()
            .includes(normalizedSearch);
      if (!matchesSearch) {
        return false;
      }
      if (!normalizedStatus) {
        return true;
      }
      const s = String(license.status ?? '').toLowerCase();
      return s === normalizedStatus;
    });
  }

  paginateLicenses(list, options) {
    const offset = (options.page - 1) * options.limit;
    return list.slice(offset, offset + options.limit);
  }

  async getAgentScopedExternalResult(req, repo, options) {
    const assigned = await this.licenseRepository.findLicenses({
      page: 1,
      limit: 10000,
      filters: { assignedUserId: req.user.id },
    });
    const appids = (assigned?.licenses || []).map((item) => item.appid || item.key).filter(Boolean);
    const byAppid = await repo.findByAppIds(appids);
    const scopedLicenses = byAppid instanceof Map ? Array.from(byAppid.values()) : [];
    const filtered = this.filterAgentScopedLicenses(req, scopedLicenses);
    const paginated = this.paginateLicenses(filtered, options);
    return { licenses: paginated, total: filtered.length };
  }

  async getExternalListResult(req, repo, options) {
    const isAgent = req.user?.role === ROLES.AGENT;
    if (!isAgent || !this.licenseRepository) {
      return {
        isAgent,
        result: await repo.findLicenses(options),
      };
    }
    return {
      isAgent,
      result: await this.getAgentScopedExternalResult(req, repo, options),
    };
  }

  async destroyKnexConnection(db) {
    if (!db) {
      return;
    }
    try {
      await db.destroy();
    } catch (_e) {
      // Ignore destroy errors
    }
  }

  ensureResetLicensePermission(req) {
    if (![ROLES.ADMIN, ROLES.TECH].includes(req.user?.role)) {
      throw new ValidationException('Only admin and tech can reset license IDs');
    }
  }

  async recordResetLicenseAudit(req, { appid, email, result }) {
    this.logOperation(req, 'external_reset_license_id', {
      appid: appid ?? null,
      email: email ?? null,
    });
    await this.createExternalAuditEvent(req, {
      type: 'license.external_reset',
      entityId: await this.resolveLicenseIdForAudit({
        id: result?.id,
        appid: appid ?? result?.appid,
        countid: result?.countid,
      }),
      metadata: this.buildAuditMetadata(req, 'external_reset', {
        appid: appid ?? result?.appid ?? null,
        email: email ?? null,
        countid: result?.countid ?? null,
      }),
    });
  }

  // ========================================================================
  // Sync Operations
  // ========================================================================

  /**
   * Sync all licenses from external API
   */
  syncLicenses = async (req, res) => {
    try {
      const options = {
        forceFullSync: req.query.force === 'true',
        batchSize: parseInt(req.query.batchSize) || 20,
        dryRun: req.query.dryRun === 'true',
        syncToInternalOnly: req.query.syncToInternalOnly === 'true',
        bidirectional: req.query.bidirectional === 'true',
        comprehensive: req.query.comprehensive !== 'false', // Default to true for comprehensive approach
        limit: req.query.limit ? parseInt(req.query.limit) : undefined, // e.g. limit=20 for test sync
        maxPages: req.query.maxPages ? parseInt(req.query.maxPages) : undefined, // e.g. maxPages=10 for test sync
      };

      logger.info('Starting external license sync via API', {
        correlationId: req.correlationId,
        options,
        userId: req.user?.id,
      });

      const result = await this.syncExternalLicensesUseCase.execute(options);

      return res.success(result, 'License sync completed successfully');
    } catch (error) {
      logger.error('External license sync failed via API', {
        correlationId: req.correlationId,
        error: error.message,
        userId: req.user?.id,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  /**
   * Sync single license by appid
   */
  syncSingleLicense = async (req, res) => {
    try {
      const { appid } = req.params;

      // Allow operations without appid for sync purposes
      // if (!appid) {
      //   return res.badRequest('App ID is required');
      // }

      logger.info('Syncing single external license via API', {
        correlationId: req.correlationId,
        appid,
        userId: req.user?.id,
      });

      const result = await this.syncExternalLicensesUseCase.syncSingleLicense(appid);

      if (!result.success) {
        return res.status(404).json({
          success: false,
          message: `License with appid ${appid} not found or sync failed: ${result.error}`,
          timestamp: new Date().toISOString(),
        });
      }

      return res.success(result, 'License synced successfully');
    } catch (error) {
      logger.error('Single license sync failed via API', {
        correlationId: req.correlationId,
        appid: req.params.appid,
        error: error.message,
        userId: req.user?.id,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  /**
   * Sync pending/failed licenses
   */
  syncPendingLicenses = async (req, res) => {
    try {
      const options = {
        limit: parseInt(req.query.limit) || 100,
        batchSize: parseInt(req.query.batchSize) || 25,
      };

      logger.info('Syncing pending external licenses via API', {
        correlationId: req.correlationId,
        options,
        userId: req.user?.id,
      });

      const result = await this.syncExternalLicensesUseCase.syncPendingLicenses(options);

      return res.success(result, 'Pending licenses sync completed');
    } catch (error) {
      logger.error('Pending licenses sync failed via API', {
        correlationId: req.correlationId,
        error: error.message,
        userId: req.user?.id,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  /**
   * Get sync status and statistics
   */
  getSyncStatus = async (req, res) => {
    try {
      const status = await this.syncExternalLicensesUseCase.getSyncStatus();

      return res.success(status, 'Sync status retrieved successfully');
    } catch (error) {
      logger.error('Failed to get sync status via API', {
        correlationId: req.correlationId,
        error: error.message,
        userId: req.user?.id,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  // ========================================================================
  // License Management Operations
  // ========================================================================

  /**
   * Get licenses with pagination and filtering.
   * When syncFirst=true, syncs from external API first so total reflects the external source of truth.
   */
  getLicenses = async (req, res) => {
    let db;
    try {
      const syncFirst = req.query.syncFirst === 'true';
      await this.syncBeforeExternalList(req, syncFirst);

      logger.debug('External licenses getLicenses called');

      const { ExternalLicenseRepository } =
        await import('../repositories/external-license-repository.js');
      const knex = (await import('knex')).default;
      const { getKnexConfig } = await import('../config/database.js');

      db = knex(getKnexConfig());
      const repo = new ExternalLicenseRepository(db);
      const options = this.getExternalListOptions(req);
      const { isAgent, result } = await this.getExternalListResult(req, repo, options);
      logger.debug('External licenses repository call completed', { hasResult: !!result });
      await this.destroyKnexConnection(db);
      db = null;

      const total = result.total || 0;
      const totalPages = Math.ceil(total / options.limit);

      this.logOperation(req, 'external_licenses_list', {
        page: options.page,
        limit: options.limit,
        total,
        isAgentScoped: isAgent,
      });

      return res.json({
        success: true,
        message: 'External licenses retrieved successfully',
        data: result.licenses || [],
        meta: {
          page: options.page,
          limit: options.limit,
          total,
          totalPages,
          hasNext: options.page < totalPages,
          hasPrev: options.page > 1,
        },
      });
    } catch (error) {
      await this.destroyKnexConnection(db);

      logger.error('Failed to get external licenses via API', {
        correlationId: req.correlationId,
        error: error.message,
        stack: error.stack,
        userId: req.user?.id,
      });

      return res.json({
        success: false,
        error: {
          code: 500,
          message: 'An unexpected error occurred. Please try again.',
          category: 'server',
        },
      });
    }
  };

  /**
   * Get single license by ID
   */
  getLicenseById = async (req, res) => {
    try {
      const { id } = req.params;
      const license = await this.manageExternalLicensesUseCase.getLicenseById(id);

      if (!license) {
        return res.status(404).json({
          success: false,
          message: 'License not found',
          timestamp: new Date().toISOString(),
        });
      }

      await this.ensureAgentExternalLicenseAccess(req, license);

      return res.success({ license }, 'License retrieved successfully');
    } catch (error) {
      if (error instanceof ValidationException) {
        return res.forbidden(error.message);
      }
      logger.error('Failed to get license by ID via API', {
        correlationId: req.correlationId,
        licenseId: req.params.id,
        error: error.message,
        userId: req.user?.id,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  /**
   * Get license by appid
   */
  getLicenseByAppId = async (req, res) => {
    try {
      const { appid } = req.params;
      const license = await this.manageExternalLicensesUseCase.getLicenseByAppId(appid);

      if (!license) {
        return res.status(404).json({
          success: false,
          message: 'License not found',
          timestamp: new Date().toISOString(),
        });
      }

      await this.ensureAgentExternalLicenseAccess(req, license);

      return res.success({ license }, 'License retrieved successfully');
    } catch (error) {
      if (error instanceof ValidationException) {
        return res.forbidden(error.message);
      }
      logger.error('Failed to get license by appid via API', {
        correlationId: req.correlationId,
        appid: req.params.appid,
        error: error.message,
        userId: req.user?.id,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  /**
   * Get license by email
   */
  getLicenseByEmail = async (req, res) => {
    try {
      const { email } = req.params;
      const license = await this.manageExternalLicensesUseCase.getLicenseByEmail(
        decodeURIComponent(email)
      );

      if (!license) {
        return res.status(404).json({
          success: false,
          message: 'License not found',
          timestamp: new Date().toISOString(),
        });
      }

      await this.ensureAgentExternalLicenseAccess(req, license);

      return res.success({ license }, 'License retrieved successfully');
    } catch (error) {
      if (error instanceof ValidationException) {
        return res.forbidden(error.message);
      }
      logger.error('Failed to get license by email via API', {
        correlationId: req.correlationId,
        email: req.params.email,
        error: error.message,
        userId: req.user?.id,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  /**
   * Get license by countid
   */
  getLicenseByCountId = async (req, res) => {
    try {
      const countid = parseInt(req.params.countid);
      const license = await this.manageExternalLicensesUseCase.getLicenseByCountId(countid);

      if (!license) {
        return res.status(404).json({
          success: false,
          message: 'License not found',
          timestamp: new Date().toISOString(),
        });
      }

      await this.ensureAgentExternalLicenseAccess(req, license);

      return res.success({ license }, 'License retrieved successfully');
    } catch (error) {
      if (error instanceof ValidationException) {
        return res.forbidden(error.message);
      }
      logger.error('Failed to get license by countid via API', {
        correlationId: req.correlationId,
        countid: req.params.countid,
        error: error.message,
        userId: req.user?.id,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  /**
   * Create new external license
   */
  createLicense = async (req, res) => {
    try {
      const license = await this.manageExternalLicensesUseCase.createLicense(req.body);
      const auditEntityId = await this.resolveLicenseIdForAudit({
        id: license?.id,
        appid: license?.appid,
        countid: license?.countid,
      });
      await this.createExternalAuditEvent(req, {
        type: 'license.external_created',
        entityId: auditEntityId,
        metadata: this.buildAuditMetadata(req, 'external_create', {
          appid: license?.appid ?? null,
          countid: license?.countid ?? null,
        }),
      });

      logger.info('External license created via API', {
        correlationId: req.correlationId,
        licenseId: license.id,
        appid: license.appid,
        userId: req.user?.id,
      });

      return res.created({ license }, 'License created successfully');
    } catch (error) {
      if (error instanceof ValidationException) {
        return res.badRequest(error.message);
      }

      logger.error('Failed to create external license via API', {
        correlationId: req.correlationId,
        error: error.message,
        userId: req.user?.id,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  /**
   * Update existing license
   */
  updateLicense = async (req, res) => {
    try {
      const { id } = req.params;
      const scopedUpdates = this.normalizeRoleScopedUpdates(req, req.body);
      const license = await this.manageExternalLicensesUseCase.updateLicense(id, scopedUpdates);

      if (!license) {
        return res.status(404).json({
          success: false,
          message: 'License not found',
          timestamp: new Date().toISOString(),
        });
      }

      logger.info('External license updated via API', {
        correlationId: req.correlationId,
        licenseId: id,
        appid: license.appid,
        updatedFields: Object.keys(scopedUpdates),
        userId: req.user?.id,
      });

      await this.createExternalAuditEvent(req, {
        type: 'license.external_updated',
        entityId: id,
        metadata: this.buildAuditMetadata(req, 'external_update', {
          updatedFields: Object.keys(scopedUpdates),
          appid: license?.appid ?? null,
          countid: license?.countid ?? null,
        }),
      });

      return res.success({ license }, 'License updated successfully');
    } catch (error) {
      if (error instanceof ValidationException) {
        return res.badRequest(error.message);
      }

      logger.error('Failed to update external license via API', {
        correlationId: req.correlationId,
        licenseId: req.params.id,
        error: error.message,
        userId: req.user?.id,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  /**
   * Delete license
   */
  deleteLicense = async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await this.manageExternalLicensesUseCase.deleteLicense(id);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'License not found',
          timestamp: new Date().toISOString(),
        });
      }

      logger.info('External license deleted via API', {
        correlationId: req.correlationId,
        licenseId: id,
        userId: req.user?.id,
      });

      return res.success({ deleted: true }, 'License deleted successfully');
    } catch (error) {
      logger.error('Failed to delete external license via API', {
        correlationId: req.correlationId,
        licenseId: req.params.id,
        error: error.message,
        userId: req.user?.id,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  // ========================================================================
  // Analytics and Reporting
  // ========================================================================

  /**
   * Get license statistics
   */
  getLicenseStats = async (req, res) => {
    try {
      let stats;
      if (req.user?.role === ROLES.AGENT) {
        stats = await this.withExternalRepository(async (repo) => {
          const options = this.getExternalListOptions(req);
          const scoped = await this.getAgentScopedExternalResult(req, repo, {
            ...options,
            page: 1,
            limit: 10000,
          });
          return this.createAgentStatsPayload(scoped.licenses || []);
        });
      } else {
        stats = await this.manageExternalLicensesUseCase.getLicenseStats();
      }

      return res.success({ stats }, 'License statistics retrieved successfully');
    } catch (error) {
      logger.error('Failed to get license stats via API', {
        correlationId: req.correlationId,
        error: error.message,
        userId: req.user?.id,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  /**
   * Get expiring licenses
   */
  getExpiringLicenses = async (req, res) => {
    try {
      const daysThreshold = parseInt(req.query.days) || 30;
      let licenses;
      if (req.user?.role === ROLES.AGENT) {
        licenses = await this.withExternalRepository(async (repo) => {
          const options = this.getExternalListOptions(req);
          const scoped = await this.getAgentScopedExternalResult(req, repo, {
            ...options,
            page: 1,
            limit: 10000,
          });
          const now = new Date();
          const soon = new Date();
          soon.setDate(soon.getDate() + daysThreshold);
          return (scoped.licenses || []).filter((license) => {
            if (!license.coming_expired) {
              return false;
            }
            const exp = new Date(license.coming_expired);
            return exp >= now && exp <= soon;
          });
        });
      } else {
        licenses = await this.manageExternalLicensesUseCase.getExpiringLicenses(daysThreshold);
      }

      return res.success(
        { licenses, count: licenses.length },
        'Expiring licenses retrieved successfully'
      );
    } catch (error) {
      logger.error('Failed to get expiring licenses via API', {
        correlationId: req.correlationId,
        daysThreshold: req.query.days,
        error: error.message,
        userId: req.user?.id,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  /**
   * Get expired licenses
   */
  getExpiredLicenses = async (req, res) => {
    try {
      let licenses;
      if (req.user?.role === ROLES.AGENT) {
        licenses = await this.withExternalRepository(async (repo) => {
          const options = this.getExternalListOptions(req);
          const scoped = await this.getAgentScopedExternalResult(req, repo, {
            ...options,
            page: 1,
            limit: 10000,
          });
          const now = new Date();
          return (scoped.licenses || []).filter(
            (license) => license.coming_expired && new Date(license.coming_expired) < now
          );
        });
      } else {
        licenses = await this.manageExternalLicensesUseCase.getExpiredLicenses();
      }

      return res.success(
        { licenses, count: licenses.length },
        'Expired licenses retrieved successfully'
      );
    } catch (error) {
      logger.error('Failed to get expired licenses via API', {
        correlationId: req.correlationId,
        error: error.message,
        userId: req.user?.id,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  /**
   * Get licenses by organization (DBA)
   */
  getLicensesByOrganization = async (req, res) => {
    try {
      const { dba } = req.params;
      const decodedDba = decodeURIComponent(dba);
      let licenses;
      if (req.user?.role === ROLES.AGENT) {
        licenses = await this.withExternalRepository(async (repo) => {
          const options = this.getExternalListOptions(req);
          const scoped = await this.getAgentScopedExternalResult(req, repo, {
            ...options,
            page: 1,
            limit: 10000,
          });
          return (scoped.licenses || []).filter((license) =>
            String(license.dba || '')
              .toLowerCase()
              .includes(decodedDba.toLowerCase())
          );
        });
      } else {
        licenses = await this.manageExternalLicensesUseCase.getLicensesByOrganization(decodedDba);
      }

      return res.success(
        { licenses, count: licenses.length },
        'Organization licenses retrieved successfully'
      );
    } catch (error) {
      logger.error('Failed to get licenses by organization via API', {
        correlationId: req.correlationId,
        dba: req.params.dba,
        error: error.message,
        userId: req.user?.id,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  // ========================================================================
  // Bulk Operations
  // ========================================================================

  /**
   * Bulk update licenses
   */
  bulkUpdateLicenses = async (req, res) => {
    try {
      const { updates: rawUpdates } = req.body;

      if (!rawUpdates || !Array.isArray(rawUpdates) || rawUpdates.length === 0) {
        return res.badRequest('Updates array is required');
      }
      const updates = rawUpdates.map((entry) => ({
        ...entry,
        updates: this.normalizeRoleScopedUpdates(req, entry?.updates || {}),
      }));

      logger.info('Starting bulk update of external licenses via API', {
        correlationId: req.correlationId,
        updateCount: updates.length,
        userId: req.user?.id,
      });

      const results = await this.manageExternalLicensesUseCase.bulkUpdateLicenses(updates);
      this.logOperation(req, 'external_bulk_update', {
        requested: updates.length,
        updated: results.length,
      });

      logger.info('Bulk update of external licenses completed via API', {
        correlationId: req.correlationId,
        requested: updates.length,
        successful: results.length,
        userId: req.user?.id,
      });

      return res.success(
        {
          results,
          count: results.length,
          requested: updates.length,
        },
        'Bulk update completed successfully'
      );
    } catch (error) {
      if (error instanceof ValidationException) {
        return res.badRequest(error.message);
      }

      logger.error('Bulk update of external licenses failed via API', {
        correlationId: req.correlationId,
        error: error.message,
        updateCount: req.body.updates?.length,
        userId: req.user?.id,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  /**
   * Bulk delete licenses
   */
  bulkDeleteLicenses = async (req, res) => {
    try {
      const { ids } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.badRequest('IDs array is required');
      }

      logger.info('Starting bulk delete of external licenses via API', {
        correlationId: req.correlationId,
        deleteCount: ids.length,
        userId: req.user?.id,
      });

      const deletedCount = await this.manageExternalLicensesUseCase.bulkDeleteLicenses(ids);

      logger.info('Bulk delete of external licenses completed via API', {
        correlationId: req.correlationId,
        requested: ids.length,
        deleted: deletedCount,
        userId: req.user?.id,
      });

      return res.success(
        {
          deleted: deletedCount,
          requested: ids.length,
        },
        'Bulk delete completed successfully'
      );
    } catch (error) {
      if (error instanceof ValidationException) {
        return res.badRequest(error.message);
      }

      logger.error('Bulk delete of external licenses failed via API', {
        correlationId: req.correlationId,
        error: error.message,
        deleteCount: req.body.ids?.length,
        userId: req.user?.id,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  // ========================================================================
  // MISSING ENDPOINTS FROM EXTERNAL API
  // ========================================================================

  /**
   * Update license by email (PUT /api/v1/licenses/email/{email})
   */
  updateLicenseByEmail = async (req, res) => {
    try {
      const { email } = req.params;
      const updates = this.normalizeRoleScopedUpdates(req, req.body);

      logger.info('Updating external license by email via API', {
        correlationId: req.correlationId,
        email,
        userId: req.user?.id,
      });

      const result = await this.manageExternalLicensesUseCase.updateLicenseByEmail(email, updates);
      const auditEntityId = await this.resolveLicenseIdForAudit({
        id: result?.id,
        appid: result?.appid,
        countid: result?.countid,
      });
      await this.createExternalAuditEvent(req, {
        type: 'license.external_updated',
        entityId: auditEntityId,
        metadata: this.buildAuditMetadata(req, 'external_update', {
          updatedFields: Object.keys(updates),
          email,
          appid: result?.appid ?? null,
          countid: result?.countid ?? null,
        }),
      });

      return res.success(result, 'License updated successfully');
    } catch (error) {
      logger.error('Update external license by email failed via API', {
        correlationId: req.correlationId,
        email: req.params.email,
        error: error.message,
        userId: req.user?.id,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  /**
   * Delete license by email (DELETE /api/v1/licenses/email/{email})
   */
  deleteLicenseByEmail = async (req, res) => {
    try {
      const { email } = req.params;

      logger.info('Deleting external license by email via API', {
        correlationId: req.correlationId,
        email,
        userId: req.user?.id,
      });

      const result = await this.manageExternalLicensesUseCase.deleteLicenseByEmail(email);

      return res.success(result, 'License deleted successfully');
    } catch (error) {
      logger.error('Delete external license by email failed via API', {
        correlationId: req.correlationId,
        email: req.params.email,
        error: error.message,
        userId: req.user?.id,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  /**
   * Update license by countid (PUT /api/v1/licenses/countid/{countid})
   */
  updateLicenseByCountId = async (req, res) => {
    try {
      const { countid } = req.params;
      const updates = this.normalizeRoleScopedUpdates(req, req.body);

      logger.info('Updating external license by countid via API', {
        correlationId: req.correlationId,
        countid,
        userId: req.user?.id,
      });

      const result = await this.manageExternalLicensesUseCase.updateLicenseByCountId(
        parseInt(countid),
        updates
      );
      const parsedCountId = parseInt(countid);
      const auditEntityId = await this.resolveLicenseIdForAudit({
        id: result?.id,
        appid: result?.appid,
        countid: Number.isNaN(parsedCountId) ? undefined : parsedCountId,
      });
      await this.createExternalAuditEvent(req, {
        type: 'license.external_updated',
        entityId: auditEntityId,
        metadata: this.buildAuditMetadata(req, 'external_update', {
          updatedFields: Object.keys(updates),
          countid: Number.isNaN(parsedCountId) ? countid : parsedCountId,
          appid: result?.appid ?? null,
        }),
      });

      return res.success(result, 'License updated successfully');
    } catch (error) {
      logger.error('Update external license by countid failed via API', {
        correlationId: req.correlationId,
        countid: req.params.countid,
        error: error.message,
        userId: req.user?.id,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  /**
   * Delete license by countid (DELETE /api/v1/licenses/countid/{countid})
   */
  deleteLicenseByCountId = async (req, res) => {
    try {
      const { countid } = req.params;

      logger.info('Deleting external license by countid via API', {
        correlationId: req.correlationId,
        countid,
        userId: req.user?.id,
      });

      const result = await this.manageExternalLicensesUseCase.deleteLicenseByCountId(
        parseInt(countid)
      );

      return res.success(result, 'License deleted successfully');
    } catch (error) {
      logger.error('Delete external license by countid failed via API', {
        correlationId: req.correlationId,
        countid: req.params.countid,
        error: error.message,
        userId: req.user?.id,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  /**
   * Reset license ID (POST /api/v1/licenses/reset)
   */
  resetLicense = async (req, res) => {
    try {
      try {
        this.ensureResetLicensePermission(req);
      } catch (permissionError) {
        return res.forbidden(permissionError.message);
      }

      const { appid, email } = req.body;

      logger.info('Resetting external license ID via API', {
        correlationId: req.correlationId,
        appid,
        email,
        userId: req.user?.id,
      });

      const result = await this.manageExternalLicensesUseCase.resetLicense({ appid, email });
      await this.recordResetLicenseAudit(req, { appid, email, result });

      return res.success(result, 'License reset successfully');
    } catch (error) {
      logger.error('Reset external license failed via API', {
        correlationId: req.correlationId,
        appid: req.body.appid,
        email: req.body.email,
        error: error.message,
        userId: req.user?.id,
      });

      return this.handleExternalApiError(res, error);
    }
  };

  /**
   * Bulk create licenses (POST /api/v1/licenses/bulk)
   */
  bulkCreateLicenses = async (req, res) => {
    try {
      const { licenses } = req.body;

      logger.info('Bulk creating external licenses via API', {
        correlationId: req.correlationId,
        count: licenses?.length || 0,
        userId: req.user?.id,
      });

      const result = await this.manageExternalLicensesUseCase.bulkCreateLicenses(licenses);

      return res.success(result, 'Licenses bulk created successfully');
    } catch (error) {
      logger.error('Bulk create external licenses failed via API', {
        correlationId: req.correlationId,
        error: error.message,
        userId: req.user?.id,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  /**
   * Add row license (POST /api/v1/licenses/row)
   */
  addRowLicense = async (req, res) => {
    try {
      const licenseData = req.body;

      logger.info('Adding row license via API', {
        correlationId: req.correlationId,
        userId: req.user?.id,
      });

      const result = await this.manageExternalLicensesUseCase.addRowLicense(licenseData);

      return res.success(result, 'License row added successfully');
    } catch (error) {
      logger.error('Add row license failed via API', {
        correlationId: req.correlationId,
        error: error.message,
        userId: req.user?.id,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };

  /**
   * Get SMS payments (GET /api/v1/sms-payments)
   */
  getSmsPayments = async (req, res) => {
    try {
      const options = {
        appid: req.query.appid,
        emailLicense: req.query.emailLicense,
        countid: req.query.countid ? parseInt(req.query.countid) : undefined,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
        sortBy: req.query.sortBy,
        sortOrder: req.query.sortOrder,
      };

      if (options.appid) {
        const normalizedAppid = this.normalizeSmsQueryAppid(options.appid);
        if (normalizedAppid) {
          options.appid = normalizedAppid;
        }
      }

      await this.ensureSmsScopeAccess(req, {
        appid: options.appid,
        countid: options.countid,
        emailLicense: options.emailLicense,
      });

      if (this.licenseRepository?.findEmailLicenseForSmsProxy) {
        const canonicalEmail = await this.licenseRepository.findEmailLicenseForSmsProxy({
          appid: options.appid,
          countid: options.countid,
        });
        if (canonicalEmail) {
          if (req.user?.role === ROLES.AGENT) {
            options.emailLicense = canonicalEmail;
          } else if (!options.emailLicense) {
            options.emailLicense = canonicalEmail;
          }
        }
      }

      logger.info('Getting SMS payments via API', {
        correlationId: req.correlationId,
        options,
        userId: req.user?.id,
      });

      const result = await this.manageExternalLicensesUseCase.getSmsPayments(options);
      this.logOperation(req, 'external_get_sms_payments', {
        appid: options.appid ?? null,
        countid: options.countid ?? null,
        page: options.page,
        limit: options.limit,
      });

      return res.success(result, 'SMS payments retrieved successfully');
    } catch (error) {
      logger.error('Get SMS payments failed via API', {
        correlationId: req.correlationId,
        error: error.message,
        userId: req.user?.id,
      });

      return this.handleExternalApiError(res, error);
    }
  };

  /**
   * Add SMS payment (POST /api/v1/add-sms-payment)
   */
  addSmsPayment = async (req, res) => {
    try {
      const paymentData = req.body;
      if (paymentData?.appid) {
        const n = this.normalizeSmsQueryAppid(paymentData.appid);
        if (n) {
          paymentData.appid = n;
        }
      }
      await this.ensureSmsScopeAccess(req, {
        appid: paymentData?.appid,
        countid: paymentData?.countid,
      });

      logger.info('Adding SMS payment via API', {
        correlationId: req.correlationId,
        userId: req.user?.id,
      });

      const result = await this.manageExternalLicensesUseCase.addSmsPayment(paymentData);
      this.logOperation(req, 'external_add_sms_payment', {
        appid: paymentData?.appid ?? null,
        countid: paymentData?.countid ?? null,
        amount: paymentData?.amount ?? null,
      });

      return res.success(result, 'SMS payment added successfully');
    } catch (error) {
      logger.error('Add SMS payment failed via API', {
        correlationId: req.correlationId,
        error: error.message,
        userId: req.user?.id,
      });

      return this.handleExternalApiError(res, error);
    }
  };

  /**
   * Get license analytics (GET /api/v1/license-analytic)
   */
  getLicenseAnalytics = async (req, res) => {
    try {
      const options = {
        month: req.query.month ? parseInt(req.query.month) : undefined,
        year: req.query.year ? parseInt(req.query.year) : undefined,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        status: req.query.status ? parseInt(req.query.status) : undefined,
        license_type: req.query.license_type,
      };

      logger.info('Getting license analytics via API', {
        correlationId: req.correlationId,
        options,
        userId: req.user?.id,
      });

      let result;
      if (req.user?.role === ROLES.AGENT) {
        result = await this.withExternalRepository(async (repo) => {
          const listOptions = this.getExternalListOptions(req);
          const scoped = await this.getAgentScopedExternalResult(req, repo, {
            ...listOptions,
            page: 1,
            limit: 10000,
          });
          const licenses = scoped.licenses || [];
          const stats = this.createAgentStatsPayload(licenses);
          return {
            summary: {
              totalLicenses: stats.totalLicenses,
              activeLicenses: stats.active,
              expiredLicenses: stats.expired,
              expiringSoonLicenses: stats.expiringSoon,
            },
            licenses,
          };
        });
      } else {
        result = await this.manageExternalLicensesUseCase.getLicenseAnalytics(options);
      }

      return res.success(result, 'License analytics retrieved successfully');
    } catch (error) {
      logger.error('Get license analytics failed via API', {
        correlationId: req.correlationId,
        error: error.message,
        userId: req.user?.id,
      });

      return sendErrorResponse(res, 'INTERNAL_SERVER_ERROR');
    }
  };
}
