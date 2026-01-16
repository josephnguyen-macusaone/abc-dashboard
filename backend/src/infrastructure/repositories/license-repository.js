import { License } from '../../domain/entities/license-entity.js';
import { LicenseAssignment } from '../../domain/entities/license-assignment-entity.js';
import { LicenseAuditEvent } from '../../domain/entities/license-audit-event-entity.js';
import { ILicenseRepository } from '../../domain/repositories/interfaces/i-license-repository.js';
import { withTimeout, TimeoutPresets } from '../../shared/utils/reliability/retry.js';
import logger from '../config/logger.js';

/**
 * License Repository Implementation
 * Implements the ILicenseRepository interface using PostgreSQL with Knex
 */
export class LicenseRepository extends ILicenseRepository {
  constructor(db, correlationId = null) {
    super();
    this.db = db;
    this.licensesTable = 'licenses';
    this.assignmentsTable = 'license_assignments';
    this.auditEventsTable = 'license_audit_events';
    this.correlationId = correlationId;
    this.operationId = correlationId ? `${correlationId}_license_repo` : null;
  }

  // Method to set correlation ID for request-scoped operations
  setCorrelationId(correlationId) {
    this.correlationId = correlationId;
    this.operationId = correlationId ? `${correlationId}_license_repo` : null;
  }

  async findById(id) {
    return withTimeout(
      async () => {
        const licenseRow = await this.db(this.licensesTable).where('id', id).first();
        return licenseRow ? this._toLicenseEntity(licenseRow) : null;
      },
      TimeoutPresets.DATABASE,
      'license_findById',
      {
        correlationId: this.correlationId,
        onTimeout: () => {
          logger.error('License findById timed out', {
            correlationId: this.correlationId,
            licenseId: id,
            timeout: TimeoutPresets.DATABASE,
          });
        },
      }
    );
  }

  async findByKey(key) {
    if (!key) {
      throw new Error('License key is required for findByKey');
    }

    try {
      const licenseRow = await this.db(this.licensesTable)
        .whereRaw('LOWER(key) = ?', [key.toLowerCase()])
        .first();
      return licenseRow ? this._toLicenseEntity(licenseRow) : null;
    } catch (error) {
      logger.error('License findByKey error', {
        correlationId: this.correlationId,
        key,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Find license by external App ID
   */
  async findByAppId(appId) {
    if (!appId) {
      throw new Error('App ID is required for findByAppId');
    }

    try {
      const licenseRow = await this.db(this.licensesTable)
        .where('external_appid', appId)
        .first();
      return licenseRow ? this._toLicenseEntity(licenseRow) : null;
    } catch (error) {
      logger.error('License findByAppId error', {
        correlationId: this.correlationId,
        appId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Find license by external email
   */
  async findByEmail(email) {
    if (!email) {
      throw new Error('Email is required for findByEmail');
    }

    try {
      const licenseRow = await this.db(this.licensesTable)
        .whereRaw('LOWER(external_email) = ?', [email.toLowerCase()])
        .first();
      return licenseRow ? this._toLicenseEntity(licenseRow) : null;
    } catch (error) {
      logger.error('License findByEmail error', {
        correlationId: this.correlationId,
        email,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Find license by external count ID
   */
  async findByCountId(countId) {
    if (countId === undefined || countId === null) {
      throw new Error('Count ID is required for findByCountId');
    }

    try {
      const licenseRow = await this.db(this.licensesTable)
        .where('external_countid', countId)
        .first();
      return licenseRow ? this._toLicenseEntity(licenseRow) : null;
    } catch (error) {
      logger.error('License findByCountId error', {
        correlationId: this.correlationId,
        countId,
        error: error.message,
      });
      throw error;
    }
  }

  async findLicenses(options = {}) {
    const {
      page = 1,
      limit = 10,
      filters = {},
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = options;

    // Map camelCase to snake_case for sorting
    const sortColumnMap = {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      startsAt: 'starts_at',
      expiresAt: 'expires_at',
      key: 'key',
      product: 'product',
      plan: 'plan',
      status: 'status',
      dba: 'dba',
      seatsTotal: 'seats_total',
      seatsUsed: 'seats_used',
      utilizationPercent: 'utilization_percent',
    };

    const sortColumn = sortColumnMap[sortBy] || sortBy;
    const offset = (page - 1) * limit;

    let query = this.db(this.licensesTable);
    let countQuery = this.db(this.licensesTable);

    if (filters.search) {
      const searchTerm = `%${filters.search}%`;

      if (filters.searchField) {
        // Single field search
        const fieldMap = {
          key: 'key',
          dba: 'dba',
          product: 'product',
          plan: 'plan',
        };
        const dbField = fieldMap[filters.searchField];

        if (dbField) {
          query = query.whereRaw(`${dbField} ILIKE ?`, [searchTerm]);
          countQuery = countQuery.whereRaw(`${dbField} ILIKE ?`, [searchTerm]);
        }
      } else {
        // Multi-field search (default): search across all fields
        query = query.where((qb) => {
          qb.whereRaw('key ILIKE ?', [searchTerm])
            .orWhereRaw('dba ILIKE ?', [searchTerm])
            .orWhereRaw('product ILIKE ?', [searchTerm])
            .orWhereRaw('plan ILIKE ?', [searchTerm]);
        });
        countQuery = countQuery.where((qb) => {
          qb.whereRaw('key ILIKE ?', [searchTerm])
            .orWhereRaw('dba ILIKE ?', [searchTerm])
            .orWhereRaw('product ILIKE ?', [searchTerm])
            .orWhereRaw('plan ILIKE ?', [searchTerm]);
        });
      }
    }

    // Individual field filters
    if (filters.key && !filters.search) {
      query = query.whereRaw('key ILIKE ?', [`%${filters.key}%`]);
      countQuery = countQuery.whereRaw('key ILIKE ?', [`%${filters.key}%`]);
    }
    if (filters.dba && !filters.search) {
      query = query.whereRaw('dba ILIKE ?', [`%${filters.dba}%`]);
      countQuery = countQuery.whereRaw('dba ILIKE ?', [`%${filters.dba}%`]);
    }
    if (filters.product && !filters.search) {
      query = query.whereRaw('product ILIKE ?', [`%${filters.product}%`]);
      countQuery = countQuery.whereRaw('product ILIKE ?', [`%${filters.product}%`]);
    }
    if (filters.plan && !filters.search) {
      query = query.whereRaw('plan ILIKE ?', [`%${filters.plan}%`]);
      countQuery = countQuery.whereRaw('plan ILIKE ?', [`%${filters.plan}%`]);
    }

    // Start date range
    if (filters.startsAtFrom) {
      const fromDate = new Date(filters.startsAtFrom);
      query = query.where('starts_at', '>=', fromDate);
      countQuery = countQuery.where('starts_at', '>=', fromDate);
    }
    if (filters.startsAtTo) {
      const toDate = new Date(filters.startsAtTo);
      toDate.setHours(23, 59, 59, 999);
      query = query.where('starts_at', '<=', toDate);
      countQuery = countQuery.where('starts_at', '<=', toDate);
    }

    // Expiry date range
    if (filters.expiresAtFrom) {
      const fromDate = new Date(filters.expiresAtFrom);
      query = query.where('expires_at', '>=', fromDate);
      countQuery = countQuery.where('expires_at', '>=', fromDate);
    }
    if (filters.expiresAtTo) {
      const toDate = new Date(filters.expiresAtTo);
      toDate.setHours(23, 59, 59, 999);
      query = query.where('expires_at', '<=', toDate);
      countQuery = countQuery.where('expires_at', '<=', toDate);
    }

    // Updated date range
    if (filters.updatedAtFrom) {
      const fromDate = new Date(filters.updatedAtFrom);
      query = query.where('updated_at', '>=', fromDate);
      countQuery = countQuery.where('updated_at', '>=', fromDate);
    }
    if (filters.updatedAtTo) {
      const toDate = new Date(filters.updatedAtTo);
      toDate.setHours(23, 59, 59, 999);
      query = query.where('updated_at', '<=', toDate);
      countQuery = countQuery.where('updated_at', '<=', toDate);
    }

    // ========================================================================
    // Advanced Filters
    // ========================================================================

    // External data filter - licenses that have external identifiers
    if (filters.hasExternalData) {
      query = query.where((qb) => {
        qb.whereNotNull('external_appid')
          .orWhereNotNull('external_email')
          .orWhereNotNull('external_countid');
      });
      countQuery = countQuery.where((qb) => {
        qb.whereNotNull('external_appid')
          .orWhereNotNull('external_email')
          .orWhereNotNull('external_countid');
      });
    }

    // Status filter
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        query = query.whereIn('status', filters.status);
        countQuery = countQuery.whereIn('status', filters.status);
      } else {
      query = query.where('status', filters.status);
      countQuery = countQuery.where('status', filters.status);
      }
    }

    // Term filter
    if (filters.term) {
      query = query.where('term', filters.term);
      countQuery = countQuery.where('term', filters.term);
    }

    // Zip filter
    if (filters.zip) {
      query = query.where('zip', filters.zip);
      countQuery = countQuery.where('zip', filters.zip);
    }

    // Utilization percentage filter (using computed column)
    if (filters.utilizationMin !== undefined) {
      query = query.whereRaw('utilization_percent >= ?', [filters.utilizationMin]);
      countQuery = countQuery.whereRaw('utilization_percent >= ?', [filters.utilizationMin]);
    }
    if (filters.utilizationMax !== undefined) {
      query = query.whereRaw('utilization_percent <= ?', [filters.utilizationMax]);
      countQuery = countQuery.whereRaw('utilization_percent <= ?', [filters.utilizationMax]);
    }

    // Seats filters
    if (filters.seatsMin !== undefined) {
      query = query.where('seats_total', '>=', filters.seatsMin);
      countQuery = countQuery.where('seats_total', '>=', filters.seatsMin);
    }
    if (filters.seatsMax !== undefined) {
      query = query.where('seats_total', '<=', filters.seatsMax);
      countQuery = countQuery.where('seats_total', '<=', filters.seatsMax);
    }

    // Has available seats filter
    if (filters.hasAvailableSeats !== undefined) {
      if (filters.hasAvailableSeats) {
        query = query.whereRaw('seats_used < seats_total');
        countQuery = countQuery.whereRaw('seats_used < seats_total');
      } else {
        query = query.whereRaw('seats_used >= seats_total');
        countQuery = countQuery.whereRaw('seats_used >= seats_total');
      }
    }

    const [licenses, stats] = await Promise.all([
      query.orderBy(sortColumn, sortOrder).offset(offset).limit(limit),
      this.getLicenseStatsWithFilters(filters),
    ]);

    const total = stats.total || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      licenses: licenses.map((license) => this._toLicenseEntity(license)),
      total,
      page,
      totalPages,
      stats,
    };
  }

  async save(licenseData) {
    // Validate required fields
    if (!licenseData.key || !licenseData.product || !licenseData.plan) {
      throw new Error('Missing required license data fields');
    }

    const dbData = this._toLicenseDbFormat(licenseData);
    const [savedRow] = await this.db(this.licensesTable).insert(dbData).returning('*');

    return this._toLicenseEntity(savedRow);
  }

  async update(id, updates) {
    return withTimeout(
      async () => {
        const dbUpdates = this._toLicenseDbFormat(updates);
        dbUpdates.updated_at = new Date();

        const [updatedRow] = await this.db(this.licensesTable)
          .where('id', id)
          .update(dbUpdates)
          .returning('*');

        return updatedRow ? this._toLicenseEntity(updatedRow) : null;
      },
      TimeoutPresets.DATABASE,
      'license_update',
      {
        correlationId: this.correlationId,
        onTimeout: () => {
          logger.error('License update timed out', {
            correlationId: this.correlationId,
            licenseId: id,
            updateFields: Object.keys(updates),
            timeout: TimeoutPresets.DATABASE,
          });
        },
      }
    );
  }

  async delete(id) {
    const result = await this.db(this.licensesTable).where('id', id).del();
    return result > 0;
  }

  async keyExists(key, excludeId = null) {
    let query = this.db(this.licensesTable).whereRaw('LOWER(key) = ?', [key.toLowerCase()]);

    if (excludeId) {
      query = query.whereNot('id', excludeId);
    }

    const result = await query.count('id as count').first();
    return parseInt(result?.count || 0) > 0;
  }

  async getLicenseStatsWithFilters(filters = {}) {
    // Start with base query that applies the same filters as findLicenses
    let baseQuery = this.db(this.licensesTable);

    // Apply the same filters as findLicenses method
    if (filters.search) {
      const searchTerm = `%${filters.search}%`;

      if (filters.searchField) {
        // Single field search
        const fieldMap = {
          key: 'key',
          dba: 'dba',
          product: 'product',
          plan: 'plan',
        };
        const dbField = fieldMap[filters.searchField];

        if (dbField) {
          baseQuery = baseQuery.whereRaw(`${dbField} ILIKE ?`, [searchTerm]);
        }
      } else {
        // Multi-field search (default): search across all fields
        baseQuery = baseQuery.where((qb) => {
          qb.whereRaw('key ILIKE ?', [searchTerm])
            .orWhereRaw('dba ILIKE ?', [searchTerm])
            .orWhereRaw('product ILIKE ?', [searchTerm])
            .orWhereRaw('plan ILIKE ?', [searchTerm]);
        });
      }
    }

    // Individual field filters
    if (filters.key && !filters.search) {
      baseQuery = baseQuery.whereRaw('key ILIKE ?', [`%${filters.key}%`]);
    }
    if (filters.dba && !filters.search) {
      baseQuery = baseQuery.whereRaw('dba ILIKE ?', [`%${filters.dba}%`]);
    }
    if (filters.product && !filters.search) {
      baseQuery = baseQuery.whereRaw('product ILIKE ?', [`%${filters.product}%`]);
    }
    if (filters.plan && !filters.search) {
      baseQuery = baseQuery.whereRaw('plan ILIKE ?', [`%${filters.plan}%`]);
    }

    // Date range filters
    if (filters.startsAtFrom) {
      const fromDate = new Date(filters.startsAtFrom);
      baseQuery = baseQuery.where('starts_at', '>=', fromDate);
    }
    if (filters.startsAtTo) {
      const toDate = new Date(filters.startsAtTo);
      toDate.setHours(23, 59, 59, 999);
      baseQuery = baseQuery.where('starts_at', '<=', toDate);
    }

    if (filters.expiresAtFrom) {
      const fromDate = new Date(filters.expiresAtFrom);
      baseQuery = baseQuery.where('expires_at', '>=', fromDate);
    }
    if (filters.expiresAtTo) {
      const toDate = new Date(filters.expiresAtTo);
      toDate.setHours(23, 59, 59, 999);
      baseQuery = baseQuery.where('expires_at', '<=', toDate);
    }

    if (filters.updatedAtFrom) {
      const fromDate = new Date(filters.updatedAtFrom);
      baseQuery = baseQuery.where('updated_at', '>=', fromDate);
    }
    if (filters.updatedAtTo) {
      const toDate = new Date(filters.updatedAtTo);
      toDate.setHours(23, 59, 59, 999);
      baseQuery = baseQuery.where('updated_at', '<=', toDate);
    }

    // Advanced filters
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        baseQuery = baseQuery.whereIn('status', filters.status);
      } else {
      baseQuery = baseQuery.where('status', filters.status);
      }
    }
    if (filters.term) {
      baseQuery = baseQuery.where('term', filters.term);
    }
    if (filters.zip) {
      baseQuery = baseQuery.where('zip', filters.zip);
    }
    if (filters.utilizationMin !== undefined) {
      baseQuery = baseQuery.whereRaw('utilization_percent >= ?', [filters.utilizationMin]);
    }
    if (filters.utilizationMax !== undefined) {
      baseQuery = baseQuery.whereRaw('utilization_percent <= ?', [filters.utilizationMax]);
    }
    if (filters.seatsMin !== undefined) {
      baseQuery = baseQuery.where('seats_total', '>=', filters.seatsMin);
    }
    if (filters.seatsMax !== undefined) {
      baseQuery = baseQuery.where('seats_total', '<=', filters.seatsMax);
    }
    if (filters.hasAvailableSeats !== undefined) {
      if (filters.hasAvailableSeats) {
        baseQuery = baseQuery.whereRaw('seats_used < seats_total');
      } else {
        baseQuery = baseQuery.whereRaw('seats_used >= seats_total');
      }
    }

    // Calculate stats based on filtered query
    const [totalCount, activeCount, expiredCount, pendingCount, cancelCount] = await Promise.all([
      baseQuery.clone().count('id as count').first(),
      baseQuery.clone().where('status', 'active').count('id as count').first(),
      baseQuery.clone().where('status', 'expired').count('id as count').first(),
      baseQuery.clone().where('status', 'pending').count('id as count').first(),
      baseQuery.clone().where('status', 'cancel').count('id as count').first(),
    ]);

    return {
      total: parseInt(totalCount?.count || 0),
      active: parseInt(activeCount?.count || 0),
      expired: parseInt(expiredCount?.count || 0),
      pending: parseInt(pendingCount?.count || 0),
      cancel: parseInt(cancelCount?.count || 0),
    };
  }

  async getLicenseStats() {
    const [
      totalLicenses,
      activeCount,
      expiredCount,
      expiringCount,
      totalSeats,
      usedSeats,
      availableSeats,
    ] = await Promise.all([
      this.db(this.licensesTable).count('id as count').first(),
      this.db(this.licensesTable).where('status', 'active').count('id as count').first(),
      this.db(this.licensesTable).where('status', 'expired').count('id as count').first(),
      this.db(this.licensesTable).where('status', 'expiring').count('id as count').first(),
      this.db(this.licensesTable).sum('seats_total as total').first(),
      this.db(this.licensesTable).sum('seats_used as total').first(),
      this.db(this.licensesTable).sum(this.db.raw('seats_total - seats_used')).first(),
    ]);

    return {
      totalLicenses: parseInt(totalLicenses?.count || 0),
      active: parseInt(activeCount?.count || 0),
      expired: parseInt(expiredCount?.count || 0),
      expiring: parseInt(expiringCount?.count || 0),
      totalSeats: parseInt(totalSeats?.total || 0),
      usedSeats: parseInt(usedSeats?.total || 0),
      availableSeats: parseInt(availableSeats?.sum || 0),
    };
  }

  async assignLicense(assignmentData) {
    const { licenseId, userId, assignedBy } = assignmentData;

    // Validate required fields
    if (!licenseId || !userId) {
      throw new Error('License ID and User ID are required');
    }

    // Check if assignment already exists
    const existingAssignment = await this.db(this.assignmentsTable)
      .where({ license_id: licenseId, user_id: userId })
      .first();

    if (existingAssignment && existingAssignment.status === 'assigned') {
      throw new Error('User already has this license assigned');
    }

    // Check if license has available seats
    const license = await this.findById(licenseId);
    if (!license) {
      throw new Error('License not found');
    }

    if (!license.hasAvailableSeats()) {
      throw new Error('No available seats on this license');
    }

    const dbData = {
      id: this.db.raw('gen_random_uuid()'),
      license_id: licenseId,
      user_id: userId,
      status: 'assigned',
      assigned_at: new Date(),
      assigned_by: assignedBy,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const [savedRow] = await this.db(this.assignmentsTable).insert(dbData).returning('*');

    return this._toAssignmentEntity(savedRow);
  }

  async revokeAssignment(assignmentId, revokedBy) {
    const updates = {
      status: 'revoked',
      revoked_at: new Date(),
      revoked_by: revokedBy,
      updated_at: new Date(),
    };

    const [updatedRow] = await this.db(this.assignmentsTable)
      .where('id', assignmentId)
      .update(updates)
      .returning('*');

    return updatedRow ? this._toAssignmentEntity(updatedRow) : null;
  }

  async findAssignmentById(id) {
    const assignmentRow = await this.db(this.assignmentsTable).where('id', id).first();
    return assignmentRow ? this._toAssignmentEntity(assignmentRow) : null;
  }

  async findAssignmentsByLicense(licenseId, options = {}) {
    const { status = 'assigned' } = options;

    let query = this.db(this.assignmentsTable).where('license_id', licenseId);

    if (status) {
      query = query.where('status', status);
    }

    const assignments = await query.orderBy('assigned_at', 'desc');

    return assignments.map((assignment) => this._toAssignmentEntity(assignment));
  }

  async findAssignmentsByUser(userId, options = {}) {
    const { status = 'assigned' } = options;

    let query = this.db(this.assignmentsTable).where('user_id', userId);

    if (status) {
      query = query.where('status', status);
    }

    const assignments = await query.orderBy('assigned_at', 'desc');

    return assignments.map((assignment) => this._toAssignmentEntity(assignment));
  }

  async hasUserAssignment(licenseId, userId) {
    const assignment = await this.db(this.assignmentsTable)
      .where({
        license_id: licenseId,
        user_id: userId,
        status: 'assigned',
      })
      .first();

    return !!assignment;
  }

  async createAuditEvent(eventData) {
    const { type, actorId, entityId, entityType, metadata, ipAddress, userAgent } = eventData;

    // Validate required fields
    if (!type || !entityId || !entityType) {
      throw new Error('Type, entity ID, and entity type are required');
    }

    const dbData = {
      id: this.db.raw('gen_random_uuid()'),
      type,
      actor_id: actorId || null,
      entity_id: entityId,
      entity_type: entityType,
      metadata: JSON.stringify(metadata || {}),
      ip_address: ipAddress || null,
      user_agent: userAgent || null,
      created_at: new Date(),
    };

    const [savedRow] = await this.db(this.auditEventsTable).insert(dbData).returning('*');

    return this._toAuditEventEntity(savedRow);
  }

  async findAuditEvents(licenseId, options = {}) {
    const { page = 1, limit = 50 } = options;
    const offset = (page - 1) * limit;

    const [events, countResult] = await Promise.all([
      this.db(this.auditEventsTable)
        .where('entity_id', licenseId)
        .where('entity_type', 'license')
        .orderBy('created_at', 'desc')
        .offset(offset)
        .limit(limit),
      this.db(this.auditEventsTable)
        .where('entity_id', licenseId)
        .where('entity_type', 'license')
        .count('id as count')
        .first(),
    ]);

    const total = parseInt(countResult?.count || 0);

    return {
      events: events.map((event) => this._toAuditEventEntity(event)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findAllAuditEvents(options = {}) {
    const { page = 1, limit = 50, filters = {} } = options;
    const offset = (page - 1) * limit;

    let query = this.db(this.auditEventsTable);
    let countQuery = this.db(this.auditEventsTable);

    // Filter by entity type
    if (filters.entityType) {
      query = query.where('entity_type', filters.entityType);
      countQuery = countQuery.where('entity_type', filters.entityType);
    }

    // Filter by event type
    if (filters.type) {
      query = query.where('type', filters.type);
      countQuery = countQuery.where('type', filters.type);
    }

    // Filter by actor
    if (filters.actorId) {
      query = query.where('actor_id', filters.actorId);
      countQuery = countQuery.where('actor_id', filters.actorId);
    }

    // Date range filter
    if (filters.createdAtFrom) {
      const fromDate = new Date(filters.createdAtFrom);
      query = query.where('created_at', '>=', fromDate);
      countQuery = countQuery.where('created_at', '>=', fromDate);
    }
    if (filters.createdAtTo) {
      const toDate = new Date(filters.createdAtTo);
      toDate.setHours(23, 59, 59, 999);
      query = query.where('created_at', '<=', toDate);
      countQuery = countQuery.where('created_at', '<=', toDate);
    }

    const [events, countResult] = await Promise.all([
      query.orderBy('created_at', 'desc').offset(offset).limit(limit),
      countQuery.count('id as count').first(),
    ]);

    const total = parseInt(countResult?.count || 0);

    return {
      events: events.map((event) => this._toAuditEventEntity(event)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async bulkCreate(licensesData) {
    const dbDataArray = licensesData.map((data) => this._toLicenseDbFormat(data));
    const savedRows = await this.db(this.licensesTable).insert(dbDataArray).returning('*');
    return savedRows.map((row) => this._toLicenseEntity(row));
  }

  async bulkUpdate(updates) {
    const updatedLicenses = [];

    // Use transaction for bulk updates
    await this.db.transaction(async (trx) => {
      for (const { id, updates: data } of updates) {
        try {
          const dbUpdates = this._toLicenseDbFormat(data);
          dbUpdates.updated_at = new Date();

          const [updatedRow] = await trx(this.licensesTable)
            .where('id', id)
            .update(dbUpdates)
            .returning('*');

          if (updatedRow) {
            updatedLicenses.push(this._toLicenseEntity(updatedRow));
          } else {
          }
        } catch (updateError) {
          throw updateError;
        }
      }
    });

    return updatedLicenses;
  }

  async bulkDelete(ids) {
    const result = await this.db(this.licensesTable).whereIn('id', ids).del();
    return result;
  }

  async findExpiringLicenses(daysThreshold = 30) {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysThreshold);

    const licenses = await this.db(this.licensesTable)
      .where('status', 'active')
      .whereNotNull('expires_at')
      .where('expires_at', '>', now)
      .where('expires_at', '<=', futureDate)
      .orderBy('expires_at', 'asc');

    return licenses.map((license) => this._toLicenseEntity(license));
  }

  async findExpiredLicenses() {
    const now = new Date();

    const licenses = await this.db(this.licensesTable)
      .whereNotNull('expires_at')
      .where('expires_at', '<', now)
      .orderBy('expires_at', 'desc');

    return licenses.map((license) => this._toLicenseEntity(license));
  }

  async findLicensesByOrganization(dba) {
    const licenses = await this.db(this.licensesTable)
      .whereRaw('dba ILIKE ?', [`%${dba}%`])
      .orderBy('created_at', 'desc');

    return licenses.map((license) => this._toLicenseEntity(license));
  }

  async findLicensesWithLowSeats(threshold = 80) {
    const licenses = await this.db(this.licensesTable)
      .whereRaw('seats_total > 0')
      .whereRaw('utilization_percent >= ?', [threshold])
      .orderBy('utilization_percent', 'desc');

    return licenses.map((license) => this._toLicenseEntity(license));
  }

  /**
   * Convert database row to License entity
   */
  _toLicenseEntity(licenseRow) {
    if (!licenseRow) {
      throw new Error('License row is null or undefined');
    }

    return new License({
      id: licenseRow.id,
      key: licenseRow.key,
      product: licenseRow.product,
      plan: licenseRow.plan,
      status: licenseRow.status,
      term: licenseRow.term,
      seatsTotal: licenseRow.seats_total,
      seatsUsed: licenseRow.seats_used,
      startsAt: licenseRow.starts_at,
      expiresAt: licenseRow.expires_at,
      cancelDate: licenseRow.cancel_date,
      lastActive: licenseRow.last_active,
      dba: licenseRow.dba,
      zip: licenseRow.zip,
      lastPayment: parseFloat(licenseRow.last_payment) || 0,
      smsPurchased: licenseRow.sms_purchased,
      smsSent: licenseRow.sms_sent,
      smsBalance: licenseRow.sms_balance,
      agents: licenseRow.agents,
      agentsName: licenseRow.agents_name,
      agentsCost: parseFloat(licenseRow.agents_cost) || 0,
      notes: licenseRow.notes,
      createdBy: licenseRow.created_by,
      updatedBy: licenseRow.updated_by,
      createdAt: licenseRow.created_at,
      updatedAt: licenseRow.updated_at,
    });
  }

  /**
   * Convert entity/updates to database format
   */
  _toLicenseDbFormat(data) {
    const dbData = {};

    if (data.id !== undefined) dbData.id = data.id;
    if (data.key !== undefined) dbData.key = data.key;
    if (data.product !== undefined) dbData.product = data.product;
    if (data.plan !== undefined) dbData.plan = data.plan;
    if (data.status !== undefined) dbData.status = data.status;
    if (data.term !== undefined) dbData.term = data.term;
    if (data.seatsTotal !== undefined) dbData.seats_total = data.seatsTotal;
    if (data.seatsUsed !== undefined) dbData.seats_used = data.seatsUsed;
    if (data.startsAt !== undefined) dbData.starts_at = data.startsAt;
    if (data.startDay !== undefined) dbData.starts_at = data.startDay; // Handle API field name
    if (data.expiresAt !== undefined) dbData.expires_at = data.expiresAt;
    if (data.cancelDate !== undefined) dbData.cancel_date = data.cancelDate;
    if (data.lastActive !== undefined) dbData.last_active = data.lastActive;
    if (data.dba !== undefined) dbData.dba = data.dba;
    if (data.zip !== undefined) dbData.zip = data.zip;
    if (data.lastPayment !== undefined) dbData.last_payment = data.lastPayment;
    if (data.smsPurchased !== undefined) dbData.sms_purchased = data.smsPurchased;
    if (data.smsSent !== undefined) dbData.sms_sent = data.smsSent;
    if (data.smsBalance !== undefined) dbData.sms_balance = data.smsBalance;
    if (data.agents !== undefined) dbData.agents = data.agents;
    if (data.agentsName !== undefined) dbData.agents_name = JSON.stringify(data.agentsName);
    if (data.agentsCost !== undefined) dbData.agents_cost = data.agentsCost;
    if (data.notes !== undefined) dbData.notes = data.notes;
    if (data.createdBy !== undefined) dbData.created_by = data.createdBy;
    if (data.updatedBy !== undefined) dbData.updated_by = data.updatedBy;
    if (data.createdAt !== undefined) dbData.created_at = data.createdAt;
    if (data.updatedAt !== undefined) dbData.updated_at = data.updatedAt;

    // External sync fields
    if (data.externalAppId !== undefined) dbData.external_appid = data.externalAppId;
    if (data.external_appid !== undefined) dbData.external_appid = data.external_appid;
    if (data.externalCountId !== undefined) dbData.external_countid = data.externalCountId;
    if (data.external_countid !== undefined) dbData.external_countid = data.external_countid;
    if (data.externalEmail !== undefined) dbData.external_email = data.externalEmail;
    if (data.external_email !== undefined) dbData.external_email = data.external_email;
    if (data.externalStatus !== undefined) dbData.external_status = data.externalStatus;
    if (data.external_status !== undefined) dbData.external_status = data.external_status;
    if (data.externalPackage !== undefined) dbData.external_package = JSON.stringify(data.externalPackage);
    if (data.external_package !== undefined) {
      dbData.external_package = typeof data.external_package === 'string'
        ? data.external_package
        : JSON.stringify(data.external_package);
    }
    if (data.externalSendbatWorkspace !== undefined) dbData.external_sendbat_workspace = data.externalSendbatWorkspace;
    if (data.external_sendbat_workspace !== undefined) dbData.external_sendbat_workspace = data.external_sendbat_workspace;
    if (data.externalComingExpired !== undefined) dbData.external_coming_expired = data.externalComingExpired;
    if (data.external_coming_expired !== undefined) dbData.external_coming_expired = data.external_coming_expired;
    if (data.externalSyncStatus !== undefined) dbData.external_sync_status = data.externalSyncStatus;
    if (data.external_sync_status !== undefined) dbData.external_sync_status = data.external_sync_status;
    if (data.lastExternalSync !== undefined) dbData.last_external_sync = data.lastExternalSync;
    if (data.last_external_sync !== undefined) dbData.last_external_sync = data.last_external_sync;
    if (data.externalSyncError !== undefined) dbData.external_sync_error = data.externalSyncError;
    if (data.external_sync_error !== undefined) dbData.external_sync_error = data.external_sync_error;

    return dbData;
  }

  /**
   * Convert database row to LicenseAssignment entity
   */
  _toAssignmentEntity(assignmentRow) {
    if (!assignmentRow) {
      throw new Error('Assignment row is null or undefined');
    }

    return new LicenseAssignment({
      id: assignmentRow.id,
      licenseId: assignmentRow.license_id,
      userId: assignmentRow.user_id,
      status: assignmentRow.status,
      assignedAt: assignmentRow.assigned_at,
      revokedAt: assignmentRow.revoked_at,
      assignedBy: assignmentRow.assigned_by,
      revokedBy: assignmentRow.revoked_by,
      createdAt: assignmentRow.created_at,
      updatedAt: assignmentRow.updated_at,
    });
  }

  /**
   * Convert database row to LicenseAuditEvent entity
   */
  _toAuditEventEntity(eventRow) {
    if (!eventRow) {
      throw new Error('Audit event row is null or undefined');
    }

    return new LicenseAuditEvent({
      id: eventRow.id,
      type: eventRow.type,
      actorId: eventRow.actor_id,
      entityId: eventRow.entity_id,
      entityType: eventRow.entity_type,
      metadata:
        typeof eventRow.metadata === 'string' ? JSON.parse(eventRow.metadata) : eventRow.metadata,
      ipAddress: eventRow.ip_address,
      userAgent: eventRow.user_agent,
      createdAt: eventRow.created_at,
    });
  }
}
