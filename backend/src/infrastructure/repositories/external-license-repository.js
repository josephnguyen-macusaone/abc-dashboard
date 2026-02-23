import { ExternalLicense } from '../../domain/entities/external-license-entity.js';
import { IExternalLicenseRepository } from '../../domain/repositories/interfaces/i-external-license-repository.js';
import { licenseSyncConfig } from '../config/license-sync-config.js';
import { withTimeout, TimeoutPresets } from '../../shared/utils/reliability/retry.js';
import logger from '../config/logger.js';

/**
 * External License Repository Implementation
 * Implements the IExternalLicenseRepository interface using PostgreSQL with Knex
 * This repository manages licenses synced from the external API
 */
export class ExternalLicenseRepository extends IExternalLicenseRepository {
  constructor(db, correlationId = null) {
    super();
    this.db = db;
    this.licensesTable = 'external_licenses';
    this.correlationId = correlationId;
    this.operationId = correlationId ? `${correlationId}_external_license_repo` : null;
  }

  // Method to set correlation ID for request-scoped operations
  setCorrelationId(correlationId) {
    this.correlationId = correlationId;
    this.operationId = correlationId ? `${correlationId}_external_license_repo` : null;
  }

  async findById(id) {
    return withTimeout(
      async () => {
        const licenseRow = await this.db(this.licensesTable).where('id', id).first();
        return licenseRow ? this._toExternalLicenseEntity(licenseRow) : null;
      },
      TimeoutPresets.DATABASE,
      'external_license_findById',
      {
        correlationId: this.correlationId,
        onTimeout: () => {
          logger.error('External license findById timed out', {
            correlationId: this.correlationId,
            licenseId: id,
            timeout: TimeoutPresets.DATABASE,
          });
        },
      }
    );
  }

  async findByAppId(appid) {
    // Coerce number to string (external API may send numeric appid)
    if (typeof appid === 'number' && !Number.isNaN(appid)) {
      appid = String(appid);
    }
    if (!appid || typeof appid !== 'string' || appid.trim() === '') {
      logger.warn('Invalid appid provided to findByAppId', {
        correlationId: this.correlationId,
        appid,
        appidType: typeof appid,
      });
      return null;
    }
    appid = appid.trim();

    try {
      const licenseRow = await this.db(this.licensesTable)
        .whereRaw('LOWER(appid) = ?', [appid.toLowerCase()])
        .first();
      return licenseRow ? this._toExternalLicenseEntity(licenseRow) : null;
    } catch (error) {
      logger.error('External license findByAppId error', {
        correlationId: this.correlationId,
        appid,
        error: error.message,
      });
      throw error;
    }
  }

  async findByEmail(email) {
    if (!email || typeof email !== 'string') {
      logger.warn('Invalid email provided to findByEmail', {
        correlationId: this.correlationId,
        email,
        emailType: typeof email,
      });
      return null;
    }

    try {
      const licenseRow = await this.db(this.licensesTable)
        .whereRaw('LOWER(email_license) = ?', [email.toLowerCase()])
        .first();
      return licenseRow ? this._toExternalLicenseEntity(licenseRow) : null;
    } catch (error) {
      logger.error('External license findByEmail error', {
        correlationId: this.correlationId,
        email,
        error: error.message,
      });
      throw error;
    }
  }

  async findByCountId(countid) {
    if (!countid) {
      throw new Error('Count ID is required for findByCountId');
    }

    try {
      const licenseRow = await this.db(this.licensesTable).where('countid', countid).first();
      return licenseRow ? this._toExternalLicenseEntity(licenseRow) : null;
    } catch (error) {
      logger.error('External license findByCountId error', {
        correlationId: this.correlationId,
        countid,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Find external licenses by multiple appids (for enrichment merge).
   * Returns map of lowercase appid -> external license entity.
   * @param {string[]} appids - App IDs to lookup (key or appid from internal license)
   * @returns {Promise<Map<string, ExternalLicense>>}
   */
  async findByAppIds(appids) {
    const normalized = (appids || [])
      .map((a) => (a !== null ? String(a).trim() : ''))
      .filter(Boolean);
    if (normalized.length === 0) {
      return new Map();
    }

    try {
      const lowerAppids = normalized.map((a) => a.toLowerCase());
      const rows = await this.db(this.licensesTable).whereRaw('LOWER(appid) = ANY(?)', [
        lowerAppids,
      ]);
      const map = new Map();
      for (const row of rows) {
        const entity = this._toExternalLicenseEntity(row);
        const key = (entity.appid || '').toLowerCase();
        if (key) {
          map.set(key, entity);
        }
      }
      return map;
    } catch (error) {
      logger.error('External license findByAppIds error', {
        correlationId: this.correlationId,
        appidCount: normalized.length,
        error: error.message,
      });
      return new Map();
    }
  }

  /**
   * Apply filters to findLicenses query. Extracted to reduce cyclomatic complexity.
   * @param {import('knex').Knex.QueryBuilder} query
   * @param {Object} filters
   * @returns {import('knex').Knex.QueryBuilder}
   */
  _applyFindLicensesFilters(query, filters) {
    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      query = query.where((qb) => {
        qb.whereRaw('appid ILIKE ?', [searchTerm])
          .orWhereRaw('email_license ILIKE ?', [searchTerm])
          .orWhereRaw('dba ILIKE ?', [searchTerm]);
      });
    }
    if (filters.appid) {
      query = query.whereRaw('appid ILIKE ?', [`%${filters.appid}%`]);
    }
    if (filters.email) {
      query = query.whereRaw('email_license ILIKE ?', [`%${filters.email}%`]);
    }
    if (filters.dba) {
      query = query.whereRaw('dba ILIKE ?', [`%${filters.dba}%`]);
    }
    if (filters.status !== undefined) {
      query = query.where('status', filters.status);
    }
    if (filters.license_type) {
      query = query.where('license_type', filters.license_type);
    }
    if (filters.syncStatus) {
      query = query.where('sync_status', filters.syncStatus);
    }
    if (filters.createdAtFrom) {
      query = query.where('created_at', '>=', new Date(filters.createdAtFrom));
    }
    if (filters.createdAtTo) {
      const toDate = new Date(filters.createdAtTo);
      toDate.setHours(23, 59, 59, 999);
      query = query.where('created_at', '<=', toDate);
    }
    return query;
  }

  async findLicenses(options = {}) {
    const {
      page = 1,
      limit = 10,
      filters = {},
      sortBy = 'updated_at',
      sortOrder = 'desc',
    } = options;

    const sortColumnMap = {
      countid: 'countid',
      appid: 'appid',
      emailLicense: 'email_license',
      licenseType: 'license_type',
      dba: 'dba',
      status: 'status',
      monthlyFee: 'monthly_fee',
      smsBalance: 'sms_balance',
      lastSyncedAt: 'last_synced_at',
      syncStatus: 'sync_status',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    };
    const sortColumn = sortColumnMap[sortBy] || sortBy;
    const offset = (page - 1) * limit;

    let query = this.db(this.licensesTable);
    query = this._applyFindLicensesFilters(query, filters);

    const [licenses, stats] = await Promise.all([
      query.orderBy(sortColumn, sortOrder).offset(offset).limit(limit),
      this.getLicenseStatsWithFilters(filters),
    ]);

    const total = stats.total || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      licenses: licenses.map((license) => this._toExternalLicenseEntity(license)),
      total,
      page,
      totalPages,
      stats,
    };
  }

  async upsert(licenseData) {
    const dbData = this._toExternalLicenseDbFormat(licenseData);
    const appid = licenseData.appid;

    // Allow operations without appid for sync purposes
    // if (!appid) {
    //   throw new Error('App ID is required for upsert operation');
    // }

    return withTimeout(
      async () => {
        const [upsertedRow] = await this.db(this.licensesTable)
          .insert(dbData)
          .onConflict('appid')
          .merge()
          .returning('*');

        return this._toExternalLicenseEntity(upsertedRow);
      },
      TimeoutPresets.DATABASE,
      'external_license_upsert',
      {
        correlationId: this.correlationId,
        onTimeout: () => {
          logger.error('External license upsert timed out', {
            correlationId: this.correlationId,
            appid,
            timeout: TimeoutPresets.DATABASE,
          });
        },
      }
    );
  }

  async update(id, updates) {
    return withTimeout(
      async () => {
        const dbUpdates = this._toExternalLicenseDbFormat(updates);
        dbUpdates.updated_at = new Date();

        const [updatedRow] = await this.db(this.licensesTable)
          .where('id', id)
          .update(dbUpdates)
          .returning('*');

        return updatedRow ? this._toExternalLicenseEntity(updatedRow) : null;
      },
      TimeoutPresets.DATABASE,
      'external_license_update',
      {
        correlationId: this.correlationId,
        onTimeout: () => {
          logger.error('External license update timed out', {
            correlationId: this.correlationId,
            licenseId: id,
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

  async existsByAppId(appid, excludeId = null) {
    let query = this.db(this.licensesTable).whereRaw('LOWER(appid) = ?', [appid.toLowerCase()]);

    if (excludeId) {
      query = query.whereNot('id', excludeId);
    }

    const result = await query.count('id as count').first();
    return parseInt(result?.count || 0) > 0;
  }

  async markSynced(id, syncedAt) {
    const updates = {
      sync_status: 'synced',
      last_synced_at: syncedAt,
      sync_error: null,
      updated_at: new Date(),
    };

    const result = await this.db(this.licensesTable).where('id', id).update(updates);

    return result > 0;
  }

  async markSyncFailed(id, error) {
    const updates = {
      sync_status: 'failed',
      sync_error: error,
      updated_at: new Date(),
    };

    const result = await this.db(this.licensesTable).where('id', id).update(updates);

    return result > 0;
  }

  async findLicensesNeedingSync(options = {}) {
    const { limit = 100 } = options;

    const licenses = await this.db(this.licensesTable)
      .whereIn('sync_status', ['pending', 'failed'])
      .orderBy('updated_at', 'asc')
      .limit(limit);

    return licenses.map((license) => this._toExternalLicenseEntity(license));
  }

  _parseCount(row) {
    return parseInt(row?.count || 0, 10);
  }

  async getSyncStats() {
    const [total, synced, failed, pending] = await Promise.all([
      this.db(this.licensesTable).count('id as count').first(),
      this.db(this.licensesTable).where('sync_status', 'synced').count('id as count').first(),
      this.db(this.licensesTable).where('sync_status', 'failed').count('id as count').first(),
      this.db(this.licensesTable).where('sync_status', 'pending').count('id as count').first(),
    ]);

    const totalCount = this._parseCount(total);
    const syncedCount = this._parseCount(synced);
    const successRate = totalCount > 0 ? Math.round((syncedCount / totalCount) * 100) : 0;

    return {
      total: totalCount,
      synced: syncedCount,
      failed: this._parseCount(failed),
      pending: this._parseCount(pending),
      successRate,
    };
  }

  /**
   * Process a single batch of bulk upsert. Extracted to reduce bulkUpsert line count.
   * @param {import('knex').Knex.Transaction} trx
   * @param {Object[]} batch
   * @param {number} batchNumber
   * @param {Object[]} created - Mutated in place
   * @param {Object[]} updated - Mutated in place
   * @param {Object[]} errors - Mutated in place
   */
  async _processBulkUpsertBatch(trx, batch, batchNumber, created, updated, errors) {
    const validBatchData = [];
    const batchErrors = [];

    for (const licenseData of batch) {
      try {
        validBatchData.push(this._toExternalLicenseDbFormat(licenseData));
      } catch (itemError) {
        batchErrors.push({
          data: licenseData,
          error: `Data formatting error: ${itemError.message}`,
        });
      }
    }
    errors.push(...batchErrors);

    if (validBatchData.length === 0) {
      logger.warn('No valid data in batch, skipping upsert', { batchNumber });
      return;
    }

    const seenAppIds = new Set();
    const deduplicatedData = validBatchData.filter((item) => {
      if (!item.appid || seenAppIds.has(item.appid)) {
        return false;
      }
      seenAppIds.add(item.appid);
      return true;
    });

    if (deduplicatedData.length !== validBatchData.length) {
      logger.debug('Removed duplicate appids from batch', {
        batchNumber,
        originalCount: validBatchData.length,
        deduplicatedCount: deduplicatedData.length,
      });
    }

    const results = await this._rawBulkUpsert(trx, deduplicatedData);

    logger.debug(`Bulk upsert completed for batch ${batchNumber}`, {
      inserted: results.length,
      batchSize: deduplicatedData.length,
    });

    for (const result of results) {
      const createdAt = new Date(result.created_at);
      const updatedAt = new Date(result.updated_at);
      const isCreated = Math.abs(updatedAt.getTime() - createdAt.getTime()) < 1000;
      (isCreated ? created : updated).push(result);
    }
  }

  async bulkUpsert(licensesData) {
    const created = [];
    const updated = [];
    const errors = [];
    const batchSize = licenseSyncConfig.database.maxBulkUpsertBatchSize;

    logger.debug('Starting bulk upsert operation', {
      totalLicenses: licensesData.length,
      batchSize,
      totalBatches: Math.ceil(licensesData.length / batchSize),
    });

    for (let i = 0; i < licensesData.length; i += batchSize) {
      const batch = licensesData.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;

      logger.debug(`Processing bulk upsert batch ${batchNumber}`, {
        batchSize: batch.length,
        totalProcessed: i,
        remaining: licensesData.length - i,
      });

      try {
        await this.db.transaction(async (trx) => {
          await this._processBulkUpsertBatch(trx, batch, batchNumber, created, updated, errors);
        });
      } catch (batchError) {
        logger.error('Bulk upsert batch failed', {
          correlationId: this.correlationId,
          batchNumber,
          batchStart: i,
          batchEnd: Math.min(i + batchSize, licensesData.length),
          error: batchError.message,
        });
        batch.forEach((licenseData) => {
          errors.push({ data: licenseData, error: batchError.message });
        });
      }
    }

    const summary = {
      created: created.length,
      updated: updated.length,
      errors,
      totalProcessed: created.length + updated.length + errors.length,
      successRate:
        licensesData.length > 0
          ? Math.round(((created.length + updated.length) / licensesData.length) * 100)
          : 0,
    };
    logger.debug('Bulk upsert operation completed', { ...summary, errorCount: errors.length });
    return summary;
  }

  async bulkUpdate(updates) {
    const updatedLicenses = [];
    const batchSize = licenseSyncConfig.database.maxIndividualUpdatesBatchSize;

    // Process in batches to avoid overwhelming the database
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);

      logger.debug('Processing bulk update batch', {
        batchNumber: Math.floor(i / batchSize) + 1,
        batchSize: batch.length,
        totalProcessed: i,
        remaining: updates.length - i,
      });

      await this.db.transaction(async (trx) => {
        // Use Promise.allSettled for better error handling in bulk operations
        const updatePromises = batch.map(async ({ id, updates: data }) => {
          try {
            const dbUpdates = this._toExternalLicenseDbFormat(data);
            dbUpdates.updated_at = new Date();

            const [updatedRow] = await trx(this.licensesTable)
              .where('id', id)
              .update(dbUpdates)
              .returning('*');

            if (updatedRow) {
              return { success: true, data: this._toExternalLicenseEntity(updatedRow) };
            } else {
              return { success: false, error: 'No rows updated', id };
            }
          } catch (updateError) {
            logger.warn('Bulk update item failed', {
              correlationId: this.correlationId,
              licenseId: id,
              error: updateError.message,
            });
            return { success: false, error: updateError.message, id };
          }
        });

        const results = await Promise.allSettled(updatePromises);

        // Process results
        for (const result of results) {
          if (result.status === 'fulfilled' && result.value.success) {
            updatedLicenses.push(result.value.data);
          } else if (result.status === 'rejected') {
            logger.error('Bulk update promise rejected', {
              correlationId: this.correlationId,
              error: result.reason?.message || result.reason,
            });
          }
          // Failed updates are logged but don't stop the batch
        }
      });
    }

    logger.debug('Bulk update completed', {
      totalRequested: updates.length,
      totalUpdated: updatedLicenses.length,
      successRate:
        updates.length > 0 ? Math.round((updatedLicenses.length / updates.length) * 100) : 0,
    });

    return updatedLicenses;
  }

  async bulkDelete(ids) {
    const result = await this.db(this.licensesTable).whereIn('id', ids).del();
    return result;
  }

  async bulkMarkSynced(ids, syncedAt) {
    const updates = {
      sync_status: 'synced',
      last_synced_at: syncedAt,
      sync_error: null,
      updated_at: new Date(),
    };

    const result = await this.db(this.licensesTable).whereIn('id', ids).update(updates);

    return result;
  }

  async findExpiredLicenses() {
    const now = new Date();

    const licenses = await this.db(this.licensesTable)
      .whereNotNull('coming_expired')
      .where('coming_expired', '<', now)
      .orderBy('coming_expired', 'desc');

    return licenses.map((license) => this._toExternalLicenseEntity(license));
  }

  async findExpiringSoonLicenses(daysThreshold = 30) {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysThreshold);

    const licenses = await this.db(this.licensesTable)
      .whereNotNull('coming_expired')
      .where('coming_expired', '>', now)
      .where('coming_expired', '<=', futureDate)
      .orderBy('coming_expired', 'asc');

    return licenses.map((license) => this._toExternalLicenseEntity(license));
  }

  async findLicensesByOrganization(dba) {
    const licenses = await this.db(this.licensesTable)
      .whereRaw('dba ILIKE ?', [`%${dba}%`])
      .orderBy('created_at', 'desc');

    return licenses.map((license) => this._toExternalLicenseEntity(license));
  }

  async getLicenseStatsWithFilters(filters = {}) {
    let baseQuery = this.db(this.licensesTable);
    baseQuery = this._applyFindLicensesFilters(baseQuery, filters);

    const [totalCount, activeCount, expiredCount, pendingCount, syncedCount] = await Promise.all([
      baseQuery.clone().count('id as count').first(),
      baseQuery.clone().where('status', 1).count('id as count').first(),
      baseQuery.clone().whereRaw('coming_expired < ?', [new Date()]).count('id as count').first(),
      baseQuery.clone().where('sync_status', 'pending').count('id as count').first(),
      baseQuery.clone().where('sync_status', 'synced').count('id as count').first(),
    ]);

    return {
      total: this._parseCount(totalCount),
      active: this._parseCount(activeCount),
      expired: this._parseCount(expiredCount),
      pending: this._parseCount(pendingCount),
      synced: this._parseCount(syncedCount),
    };
  }

  async getLicenseStats() {
    const [totalLicenses, activeCount, expiredCount, expiringCount, pendingSync, failedSync] =
      await Promise.all([
        this.db(this.licensesTable).count('id as count').first(),
        this.db(this.licensesTable).where('status', 1).count('id as count').first(),
        this.db(this.licensesTable)
          .whereRaw('coming_expired < ?', [new Date()])
          .count('id as count')
          .first(),
        this.db(this.licensesTable)
          .whereRaw('coming_expired > ? AND coming_expired <= ?', [
            new Date(),
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          ])
          .count('id as count')
          .first(),
        this.db(this.licensesTable).where('sync_status', 'pending').count('id as count').first(),
        this.db(this.licensesTable).where('sync_status', 'failed').count('id as count').first(),
      ]);

    return {
      totalLicenses: parseInt(totalLicenses?.count || 0),
      active: parseInt(activeCount?.count || 0),
      expired: parseInt(expiredCount?.count || 0),
      expiringSoon: parseInt(expiringCount?.count || 0),
      pendingSync: parseInt(pendingSync?.count || 0),
      failedSync: parseInt(failedSync?.count || 0),
    };
  }

  /**
   * Convert database row to ExternalLicense entity
   */
  _toExternalLicenseEntity(licenseRow) {
    if (!licenseRow) {
      throw new Error('License row is null or undefined');
    }

    return new ExternalLicense({
      countid: licenseRow.countid,
      id: licenseRow.id,
      appid: licenseRow.appid,
      license_type: licenseRow.license_type,
      dba: licenseRow.dba || licenseRow.email_license || '',
      zip: licenseRow.zip,
      mid: licenseRow.mid,
      status: licenseRow.status,
      ActivateDate: licenseRow.activate_date,
      Coming_expired: licenseRow.coming_expired,
      monthlyFee: parseFloat(licenseRow.monthly_fee) || 0,
      smsBalance: parseFloat(licenseRow.sms_balance) || 0,
      Email_license: licenseRow.email_license,
      pass: licenseRow.pass,
      Package: licenseRow.package
        ? typeof licenseRow.package === 'string'
          ? JSON.parse(licenseRow.package)
          : licenseRow.package
        : null,
      Note: licenseRow.note,
      Sendbat_workspace: licenseRow.sendbat_workspace,
      lastActive: licenseRow.last_active,
      // Internal fields
      lastSyncedAt: licenseRow.last_synced_at,
      syncStatus: licenseRow.sync_status,
      syncError: licenseRow.sync_error,
      createdAt: licenseRow.created_at,
      updatedAt: licenseRow.updated_at,
    });
  }

  /**
   * Normalize date for DB storage (MM/DD/YYYY or Date -> ISO date string).
   * Explicitly parses MM/DD/YYYY to avoid locale ambiguity.
   * @param {string|Date} value - ActivateDate from API or entity
   * @returns {string} YYYY-MM-DD for timestamp column
   */
  _normalizeDateForDb(value) {
    if (!value) {
      return value;
    }
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? value : value.toISOString().split('T')[0];
    }
    const str = String(value).trim();
    if (!str) {
      return value;
    }
    // Explicit MM/DD/YYYY parsing (external API format)
    const mmddyyyy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mmddyyyy) {
      const [, month, day, year] = mmddyyyy;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    const d = new Date(str);
    return Number.isNaN(d.getTime()) ? value : d.toISOString().split('T')[0];
  }

  /**
   * Convert entity/updates to database format
   */
  _truncate(value, maxLen) {
    if (value === undefined || value === null) {
      return value;
    }
    return String(value).substring(0, maxLen);
  }

  _toExternalLicenseDbFormat(data) {
    const dbData = {};
    const set = (srcKey, destKey, transform) => {
      if (data[srcKey] !== undefined) {
        dbData[destKey] = transform ? transform(data[srcKey]) : data[srcKey];
      }
    };
    const setFromKeys = (keys, destKey, transform) => {
      const val = keys.reduce((acc, k) => acc ?? data[k], undefined);
      if (val !== undefined && val !== null) {
        dbData[destKey] = transform ? transform(val) : val;
      }
    };

    set('countid', 'countid');
    set('id', 'id');
    set('appid', 'appid', (v) => this._truncate(v, 255));
    set('license_type', 'license_type', (v) => this._truncate(v, 50));
    set('dba', 'dba', (v) => this._truncate(v, 255));
    set('zip', 'zip', (v) => this._truncate(v, 10));
    set('mid', 'mid', (v) => this._truncate(v, 255));
    set('status', 'status');
    setFromKeys(['ActivateDate', 'activateDate'], 'activate_date', (v) =>
      this._normalizeDateForDb(v)
    );
    setFromKeys(['Coming_expired', 'comingExpired'], 'coming_expired', (v) =>
      this._normalizeDateForDb(v)
    );
    set('monthlyFee', 'monthly_fee');
    dbData.sms_balance = this._normalizeSmsBalance(data);
    setFromKeys(['Email_license', 'emailLicense'], 'email_license', (v) =>
      this._truncate(String(v), 255)
    );
    set('pass', 'pass', (v) => this._truncate(v, 255));
    setFromKeys(['Package', 'package'], 'package', (v) =>
      typeof v === 'string' ? v : JSON.stringify(v)
    );
    setFromKeys(['Note', 'note'], 'note', (v) => (typeof v === 'string' ? v : String(v)));
    setFromKeys(['Sendbat_workspace', 'sendbatWorkspace'], 'sendbat_workspace', (v) =>
      this._truncate(String(v), 255)
    );
    setFromKeys(['lastActive', 'last_active'], 'last_active', (v) => this._normalizeDateForDb(v));
    set('lastSyncedAt', 'last_synced_at');
    set('syncStatus', 'sync_status');
    set('syncError', 'sync_error');
    set('createdAt', 'created_at');
    set('updatedAt', 'updated_at');
    return dbData;
  }

  _normalizeSmsBalance(data) {
    const raw = data.smsBalance ?? data.sms_balance ?? data.SmsBalance;
    const val = raw !== undefined && raw !== null ? Number(raw) : 0;
    return Number.isNaN(val) ? 0 : val;
  }

  /** Columns for bulk upsert (order matches _toExternalLicenseDbFormat output). */
  static get BULK_UPSERT_COLS() {
    return [
      'appid',
      'countid',
      'id',
      'license_type',
      'dba',
      'zip',
      'mid',
      'status',
      'activate_date',
      'coming_expired',
      'monthly_fee',
      'sms_balance',
      'email_license',
      'pass',
      'package',
      'note',
      'sendbat_workspace',
      'last_active',
    ];
  }

  /**
   * Bulk upsert using Knex insert().onConflict().merge() to avoid raw SQL binding issues.
   * @param {import('knex').Knex.Transaction} trx
   * @param {Object[]} rows - Pre-formatted DB rows from _toExternalLicenseDbFormat
   * @returns {Promise<Object[]>} Returning rows (id, appid, created_at, updated_at)
   */
  async _rawBulkUpsert(trx, rows) {
    if (rows.length === 0) {
      return [];
    }

    const cols = ExternalLicenseRepository.BULK_UPSERT_COLS;
    const now = new Date();

    const insertRows = rows.map((row) => {
      const obj = {};
      for (const col of cols) {
        obj[col] = row[col] === undefined ? null : row[col];
      }
      obj.updated_at = now;
      return obj;
    });

    const mergeCols = cols.filter((c) => c !== 'appid');
    mergeCols.push('updated_at');

    const result = await trx(this.licensesTable)
      .insert(insertRows)
      .onConflict('appid')
      .merge(mergeCols)
      .returning(['id', 'appid', 'created_at', 'updated_at']);

    return result || [];
  }

  /**
   * Sync external license data into internal license table
   * This method updates the internal licenses table with external API data
   */
  /**
   * Sync external licenses to internal licenses using comprehensive reconciliation
   * This approach gets all external licenses first, then all internal licenses,
   * then compares to identify what fields are missing and need synchronization
   */
  /* eslint-disable max-lines-per-function, complexity, max-depth */
  async syncToInternalLicensesComprehensive(internalLicenseRepo) {
    try {
      logger.info('Starting comprehensive sync from external to internal licenses');

      // Step 1: Get total count of external licenses first (memory efficient)
      const externalStats = await this.getLicenseStatsWithFilters({});
      const totalExternalLicenses = externalStats.total || 0;

      logger.info(`Step 1: Found ${totalExternalLicenses} external licenses to process`);

      // Early exit if no external licenses
      if (totalExternalLicenses === 0) {
        logger.info('No external licenses found, skipping comprehensive sync');
        return { syncedCount: 0, updatedCount: 0, createdCount: 0 };
      }

      // Step 2: Process external licenses in chunks to manage memory
      const chunkSize = licenseSyncConfig.database.maxBulkUpsertBatchSize;
      const externalLookupMaps = await this._buildExternalLookupMapsInChunks(chunkSize);

      logger.info('Step 2: Built external license lookup maps', {
        appIdCount: externalLookupMaps.externalByAppId.size,
        countIdCount: externalLookupMaps.externalByCountId.size,
      });

      // Step 3: Process internal licenses in chunks and analyze gaps
      const syncOperations = [];
      let processedInternalCount = 0;

      logger.info('Step 3: Analyzing field gaps between external and internal licenses');

      // Process internal licenses in chunks to manage memory
      const internalChunkSize = 1000; // Process internal licenses in smaller chunks
      let internalPage = 1;
      let hasMoreInternal = true;

      while (hasMoreInternal) {
        const internalChunk = await internalLicenseRepo.findLicenses({
          page: internalPage,
          limit: internalChunkSize,
          filters: {},
        });

        if (internalChunk.licenses.length === 0) {
          hasMoreInternal = false;
          break;
        }

        logger.debug(`Processing internal license chunk ${internalPage}`, {
          chunkSize: internalChunk.licenses.length,
          totalProcessed: processedInternalCount,
        });

        // Analyze each internal license in this chunk
        for (const internalLicense of internalChunk.licenses) {
          const syncOp = this._analyzeInternalLicenseGaps(internalLicense, externalLookupMaps);

          if (syncOp.needsSync) {
            syncOperations.push(syncOp);
          }
        }

        processedInternalCount += internalChunk.licenses.length;
        internalPage++;

        // Safety check to prevent infinite loops
        if (internalPage > 1000) {
          logger.warn('Reached maximum internal page limit, stopping processing');
          break;
        }
      }

      // Step 4: Check for external licenses that don't have internal counterparts
      logger.info('Step 4: Checking for external licenses without internal matches');

      // Process external licenses in chunks to find ones without internal matches
      let externalPage = 1;
      const externalPageSize = 500; // Check external licenses in smaller batches
      let hasMoreExternal = true;

      while (
        hasMoreExternal &&
        syncOperations.length < licenseSyncConfig.sync.maxLicensesForComprehensive
      ) {
        const externalChunk = await this.findLicenses({
          page: externalPage,
          limit: externalPageSize,
          filters: {},
        });

        if (externalChunk.licenses.length === 0) {
          hasMoreExternal = false;
          break;
        }

        logger.debug(`Checking external license chunk ${externalPage} for new licenses`, {
          chunkSize: externalChunk.licenses.length,
        });

        for (const externalLicense of externalChunk.licenses) {
          // Check if this external license has an internal match
          let hasInternalMatch = false;

          // Try appid match first
          if (externalLicense.appid) {
            try {
              const internalMatch = await internalLicenseRepo.findByAppId(externalLicense.appid);
              if (internalMatch) {
                hasInternalMatch = true;
              }
            } catch (error) {
              logger.debug('Error checking appid match', {
                appid: externalLicense.appid,
                error: error.message,
              });
            }
          }

          // Try countid match if no appid match
          if (
            !hasInternalMatch &&
            externalLicense.countid !== undefined &&
            externalLicense.countid !== null
          ) {
            try {
              const internalMatch = await internalLicenseRepo.findByCountId(
                externalLicense.countid
              );
              if (internalMatch) {
                hasInternalMatch = true;
              }
            } catch (error) {
              logger.debug('Error checking countid match', {
                countid: externalLicense.countid,
                error: error.message,
              });
            }
          }

          if (!hasInternalMatch) {
            logger.debug(
              `Creating new internal license for external ${externalLicense.appid || externalLicense.countid}`
            );
            syncOperations.push({
              type: 'create',
              externalLicense,
              reason: 'No internal license match found',
            });
          }
        }

        externalPage++;

        // Safety check
        if (externalPage > 1000) {
          logger.warn('Reached maximum external page limit, stopping processing');
          break;
        }
      }

      logger.info(`Step 5: Identified ${syncOperations.length} sync operations needed`, {
        totalInternalProcessed: processedInternalCount,
      });

      // Step 6: Execute sync operations in batches for better performance
      const operationBatchSize = 50; // Process operations in smaller batches
      let syncedCount = 0;
      let updatedCount = 0;
      let createdCount = 0;

      logger.info('Step 6: Executing sync operations in batches');

      for (let i = 0; i < syncOperations.length; i += operationBatchSize) {
        const operationBatch = syncOperations.slice(i, i + operationBatchSize);

        logger.debug(`Processing operation batch ${Math.floor(i / operationBatchSize) + 1}`, {
          batchSize: operationBatch.length,
          totalProcessed: i,
          remaining: syncOperations.length - i,
        });

        // Execute operations in this batch (can be parallelized if needed)
        for (const operation of operationBatch) {
          try {
            if (operation.type === 'update') {
              const updateData = this._createExternalUpdateData(operation.externalLicense);
              updateData.external_sync_status = 'synced';
              updateData.last_external_sync = new Date();

              await internalLicenseRepo.update(operation.internalLicense.id, updateData);
              updatedCount++;

              logger.debug(`Updated internal license with missing external data`, {
                internal_id: operation.internalLicense.id,
                external_appid: operation.externalLicense.appid,
                missing_fields: operation.missingFields,
                updated_fields: Object.keys(updateData).filter(
                  (key) => key !== 'external_sync_status' && key !== 'last_external_sync'
                ),
              });
            } else if (operation.type === 'create') {
              const licenseKey = this._generateLicenseKey(operation.externalLicense);
              const internalLicenseData = this._externalToInternalFormat(operation.externalLicense);

              const newLicense = await internalLicenseRepo.save({
                ...internalLicenseData,
                key: licenseKey,
                external_sync_status: 'synced',
                last_external_sync: new Date(),
              });
              createdCount++;

              logger.debug(`Created new internal license from external data`, {
                external_appid: operation.externalLicense.appid,
                internal_id: newLicense.id,
                generated_key: licenseKey,
                reason: operation.reason,
              });
            }

            syncedCount++;
          } catch (error) {
            logger.error(`Failed to execute sync operation:`, {
              operation: operation.type,
              external_appid: operation.externalLicense?.appid,
              internal_id: operation.internalLicense?.id,
              error: error.message,
            });
          }
        }
      }

      logger.info('Comprehensive sync completed', {
        total_external: totalExternalLicenses,
        total_internal: processedInternalCount,
        sync_operations_identified: syncOperations.length,
        sync_operations_executed: syncedCount,
        updated: updatedCount,
        created: createdCount,
      });

      return { syncedCount, updatedCount, createdCount };
    } catch (error) {
      logger.error('Failed to perform comprehensive sync', {
        error: error.message,
        correlationId: this.correlationId,
      });
      throw error;
    }
  }
  /* eslint-enable max-lines-per-function, complexity, max-depth */

  /**
   * Build external license lookup maps in chunks to manage memory usage
   * @private
   */
  async _buildExternalLookupMapsInChunks(chunkSize) {
    const externalByAppId = new Map();
    const externalByCountId = new Map();

    let page = 1;
    let hasMorePages = true;

    logger.debug('Building external license lookup maps in chunks', { chunkSize });

    while (hasMorePages) {
      const chunk = await this.findLicenses({
        page,
        limit: chunkSize,
        filters: {},
      });

      if (chunk.licenses.length === 0) {
        hasMorePages = false;
        break;
      }

      // Build lookup maps for this chunk
      for (const extLicense of chunk.licenses) {
        if (extLicense.appid) {
          externalByAppId.set(extLicense.appid, extLicense);
        }
        if (extLicense.countid !== undefined && extLicense.countid !== null) {
          externalByCountId.set(extLicense.countid, extLicense);
        }
      }

      logger.debug(`Processed external chunk ${page}`, {
        chunkSize: chunk.licenses.length,
        totalAppIds: externalByAppId.size,
        totalCountIds: externalByCountId.size,
      });

      page++;

      // Safety check to prevent infinite loops
      if (page > 1000) {
        logger.warn('Reached maximum page limit while building lookup maps');
        break;
      }
    }

    return { externalByAppId, externalByCountId };
  }

  /**
   * Analyze what external data is missing from an internal license
   * @private
   */
  /* eslint-disable complexity */
  _analyzeInternalLicenseGaps(internalLicense, externalLookups) {
    const { externalByAppId, externalByCountId } = externalLookups;
    const missingFields = [];
    let matchingExternalLicense = null;

    // Try to find matching external license
    if (internalLicense.appid && externalByAppId.has(internalLicense.appid)) {
      matchingExternalLicense = externalByAppId.get(internalLicense.appid);
    } else if (
      internalLicense.countid !== undefined &&
      externalByCountId.has(internalLicense.countid)
    ) {
      matchingExternalLicense = externalByCountId.get(internalLicense.countid);
    }

    if (!matchingExternalLicense) {
      return { needsSync: false };
    }

    // Check for missing or outdated fields
    // Business contact info
    if (!internalLicense.dba && matchingExternalLicense.dba) {
      missingFields.push('dba');
    }
    if (!internalLicense.zip && matchingExternalLicense.zip) {
      missingFields.push('zip');
    }

    // Financial/payment data
    if (!internalLicense.lastPayment && matchingExternalLicense.monthlyFee !== undefined) {
      missingFields.push('lastPayment');
    }

    // Activity and status data
    if (!internalLicense.lastActive && matchingExternalLicense.lastActive) {
      missingFields.push('lastActive');
    }

    // SMS data
    if (!internalLicense.smsBalance && matchingExternalLicense.smsBalance !== undefined) {
      missingFields.push('smsBalance');
    }
    if (!internalLicense.smsPurchased && matchingExternalLicense.smsPurchased !== undefined) {
      missingFields.push('smsPurchased');
    }

    // License timing data
    if (!internalLicense.startsAt && matchingExternalLicense.ActivateDate) {
      missingFields.push('startsAt');
    }

    // Notes and additional info
    if (!internalLicense.notes && matchingExternalLicense.Note) {
      missingFields.push('notes');
    }

    // Check for outdated data (simple comparison)
    if (
      internalLicense.lastPayment !== undefined &&
      matchingExternalLicense.monthlyFee !== undefined &&
      internalLicense.lastPayment !== matchingExternalLicense.monthlyFee
    ) {
      missingFields.push('lastPayment_update');
    }

    if (
      internalLicense.smsBalance !== undefined &&
      matchingExternalLicense.smsBalance !== undefined &&
      internalLicense.smsBalance !== matchingExternalLicense.smsBalance
    ) {
      missingFields.push('smsBalance_update');
    }

    // Status updates
    if (
      matchingExternalLicense.status !== undefined &&
      internalLicense.external_status !== matchingExternalLicense.status
    ) {
      missingFields.push('status_update');
    }

    // External identifier updates
    if (
      matchingExternalLicense.mid !== undefined &&
      internalLicense.mid !== matchingExternalLicense.mid
    ) {
      missingFields.push('mid_update');
    }

    if (
      matchingExternalLicense.license_type !== undefined &&
      internalLicense.license_type !== matchingExternalLicense.license_type
    ) {
      missingFields.push('license_type_update');
    }

    // Package/workspace updates
    if (
      matchingExternalLicense.Package &&
      JSON.stringify(internalLicense.package_data) !==
        JSON.stringify(matchingExternalLicense.Package)
    ) {
      missingFields.push('package_update');
    }

    if (
      matchingExternalLicense.Sendbat_workspace &&
      internalLicense.external_sendbat_workspace !== matchingExternalLicense.Sendbat_workspace
    ) {
      missingFields.push('workspace_update');
    }

    // Coming expired date updates
    if (
      matchingExternalLicense.Coming_expired &&
      internalLicense.external_coming_expired !== matchingExternalLicense.Coming_expired
    ) {
      missingFields.push('coming_expired_update');
    }

    return {
      needsSync: missingFields.length > 0,
      type: 'update',
      internalLicense,
      externalLicense: matchingExternalLicense,
      missingFields,
      matchedBy: internalLicense.appid ? 'appid' : 'countid',
    };
  }

  /**
   * Legacy method - kept for backward compatibility
   * Sync external licenses to internal licenses using external-driven approach
   */
  async syncToInternalLicenses(internalLicenseRepo) {
    try {
      logger.debug('Starting sync from external licenses to internal licenses');
      const externalLicenses = await this.findLicenses({});
      let syncedCount = 0;
      let updatedCount = 0;
      let createdCount = 0;

      logger.debug('Processing external licenses for internal sync', {
        count: externalLicenses.licenses.length,
      });

      for (const externalLicense of externalLicenses.licenses) {
        try {
          // Try to find existing internal license by various identifiers
          let internalLicense = null;

          // Priority order for matching: appid > email > countid
          // This ensures we match the most specific identifier first

          // First try by appid if it exists (most specific)
          if (externalLicense.appid) {
            internalLicense = await internalLicenseRepo.findByAppId(externalLicense.appid);
          }

          // Then try by email if no match and email exists
          if (!internalLicense && externalLicense.emailLicense) {
            internalLicense = await internalLicenseRepo.findByEmail(externalLicense.emailLicense);
          }

          // Finally try by countid if no match and countid exists
          if (
            !internalLicense &&
            externalLicense.countid !== undefined &&
            externalLicense.countid !== null
          ) {
            internalLicense = await internalLicenseRepo.findByCountId(externalLicense.countid);
          }

          // Convert external license to internal license format
          const internalLicenseData = this._externalToInternalFormat(externalLicense);

          if (internalLicense) {
            // Update existing internal license with external data - only update fields that external provides
            const updateData = this._createExternalUpdateData(externalLicense);
            updateData.external_sync_status = 'synced';
            updateData.last_external_sync = new Date();

            await internalLicenseRepo.update(internalLicense.id, updateData);
            updatedCount++;

            logger.debug(`Updated existing internal license`, {
              external_appid: externalLicense.appid,
              external_email: externalLicense.emailLicense,
              internal_license_id: internalLicense.id,
              matched_by: externalLicense.appid
                ? 'appid'
                : externalLicense.emailLicense
                  ? 'email'
                  : 'countid',
              updated_fields: Object.keys(updateData).filter(
                (key) => key !== 'external_sync_status' && key !== 'last_external_sync'
              ),
            });
          } else {
            // Create new internal license from external data
            // Generate a unique key for the new license
            const licenseKey = this._generateLicenseKey(externalLicense);

            const newLicense = await internalLicenseRepo.save({
              ...internalLicenseData,
              key: licenseKey,
              external_sync_status: 'synced',
              last_external_sync: new Date(),
            });
            createdCount++;

            logger.debug(`Created new internal license from external data`, {
              external_appid: externalLicense.appid,
              external_email: externalLicense.emailLicense,
              internal_license_id: newLicense.id,
              generated_key: licenseKey,
            });
          }

          syncedCount++;
        } catch (error) {
          logger.error(`Failed to sync external license ${externalLicense.appid}:`, error);
          // Note: We don't update external sync status for internal sync operations
        }
      }

      return { syncedCount, updatedCount, createdCount };
    } catch (error) {
      logger.error('Failed to sync external licenses to internal:', error);
      throw error;
    }
  }

  async _syncSingleInternalLicenseToExternal(internalLicense, externalApiService, counters) {
    const hasId =
      internalLicense.external_appid ||
      internalLicense.external_email ||
      internalLicense.external_countid;
    if (!hasId) {
      return;
    }

    const externalLicenseData = this._internalToExternalFormat(internalLicense);
    let updateResult = null;

    if (internalLicense.external_appid) {
      try {
        updateResult = await externalApiService.updateLicense(
          internalLicense.external_appid,
          externalLicenseData
        );
      } catch {
        // Fall through to try email
      }
    }
    if (!updateResult && internalLicense.external_email) {
      try {
        updateResult = await externalApiService.updateLicenseByEmail(
          internalLicense.external_email,
          externalLicenseData
        );
      } catch {
        // Fall through
      }
    }

    if (updateResult) {
      counters.updated++;
    } else {
      counters.failed++;
      counters.errors.push({
        internal_id: internalLicense.id,
        error: 'No valid external identifiers for update',
      });
    }
    counters.synced++;
  }

  /**
   * Sync internal license changes back to external API
   */
  async syncFromInternalLicenses(internalLicenseRepo, externalApiService) {
    try {
      logger.info('Starting sync from internal licenses to external API');

      const internalLicenses = await internalLicenseRepo.findLicenses({
        page: 1,
        limit: 10000,
        filters: { hasExternalData: true },
      });

      const counters = { synced: 0, updated: 0, failed: 0, errors: [] };
      logger.info(
        `Processing ${internalLicenses.licenses.length} internal licenses for external sync`
      );

      for (const internalLicense of internalLicenses.licenses) {
        try {
          await this._syncSingleInternalLicenseToExternal(
            internalLicense,
            externalApiService,
            counters
          );
        } catch (error) {
          logger.error(`Failed to sync internal license to external`, {
            internal_id: internalLicense.id,
            error: error.message,
          });
          counters.failed++;
          counters.errors.push({ internal_id: internalLicense.id, error: error.message });
        }
      }

      logger.info('Internal to external licenses sync completed', {
        processed: counters.synced,
        updated: counters.updated,
        failed: counters.failed,
      });

      return {
        syncedCount: counters.synced,
        updatedCount: counters.updated,
        failedCount: counters.failed,
        errors: counters.errors,
      };
    } catch (error) {
      logger.error('Failed to sync internal licenses to external:', error);
      throw error;
    }
  }

  /**
   * Generate a unique license key for new licenses created from external data
   */
  _generateLicenseKey(externalLicense) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();

    // Use external appid if available, otherwise use countid or timestamp
    const identifier =
      externalLicense.appid ||
      (externalLicense.countid ? `C${externalLicense.countid}` : timestamp.toString().slice(-6));

    // Create key in format: EXT-{identifier}-{random}
    return `EXT-${identifier}-${random}`;
  }

  /**
   * Convert internal license format to external license format
   */
  _internalToExternalFormat(internalLicense) {
    return {
      dba: internalLicense.dba || '',
      zip: internalLicense.zip || '',
      status: internalLicense.status === 'active' ? 1 : 0,
      monthlyFee: internalLicense.lastPayment || 0,
      smsBalance: internalLicense.smsBalance || 0,
      Note: internalLicense.notes || '',
      // Add other fields as needed for external API
    };
  }

  _normalizeExternalStatus(status) {
    if (status === undefined || status === null) {
      return null;
    }
    if (typeof status === 'number') {
      return status === 1 ? 'active' : 'cancel';
    }
    return status === 'active' ? 'active' : 'cancel';
  }

  /**
   * Create selective update data from external license - only includes fields that external actually provides
   */
  _createExternalUpdateData(externalLicense) {
    const updateData = {};
    const setIfPresent = (key, destKey = key) => {
      const val = externalLicense[key];
      if (val !== undefined && val !== null) {
        updateData[destKey] = val;
      }
    };

    setIfPresent('dba');
    setIfPresent('zip');
    setIfPresent('monthlyFee', 'lastPayment');
    setIfPresent('lastActive');
    setIfPresent('Note', 'notes');
    setIfPresent('appid');
    setIfPresent('countid');

    const activateDate = externalLicense.ActivateDate ?? externalLicense.activateDate;
    if (activateDate !== undefined && activateDate !== null) {
      updateData.startsAt = activateDate;
    }

    const newStatus = this._normalizeExternalStatus(externalLicense.status);
    if (newStatus) {
      updateData.status = newStatus;
      if (newStatus === 'cancel') {
        updateData.cancelDate = externalLicense.lastActive || new Date().toISOString();
      }
    }

    if (externalLicense.smsBalance !== undefined && externalLicense.smsBalance !== null) {
      const val = Number(externalLicense.smsBalance);
      updateData.smsBalance = Number.isNaN(val) ? 0 : val;
    }

    updateData.mid = externalLicense.mid;
    updateData.license_type = externalLicense.license_type;
    updateData.package_data = externalLicense.package;
    updateData.sendbat_workspace = externalLicense.sendbatWorkspace;
    updateData.coming_expired = externalLicense.comingExpired;
    return updateData;
  }

  /**
   * Convert external license format to internal license format (for new licenses)
   * This provides defaults for creating new licenses from external data
   */
  _externalToInternalFormat(externalLicense) {
    // Ensure DBA always has a meaningful value
    const dba = externalLicense.dba || externalLicense.Email_license;
    const defaultDba = dba && dba.trim() ? dba.trim() : 'External License';

    // Handle both numeric (1/0) and string ('active'/'inactive') status formats
    const status =
      typeof externalLicense.status === 'number'
        ? externalLicense.status === 1
          ? 'active'
          : 'cancel'
        : externalLicense.status === 'active'
          ? 'active'
          : 'cancel';

    // Set cancel date for cancelled licenses
    const cancelDate =
      status === 'cancel' ? externalLicense.lastActive || new Date().toISOString() : undefined;

    // ActivateDate (PascalCase) from external API; activateDate (camelCase) from entity
    const activateDate = externalLicense.ActivateDate ?? externalLicense.activateDate;

    return {
      product: 'ABC Business Suite', // Default product for external licenses
      dba: defaultDba,
      zip: externalLicense.zip || '',
      startsAt: activateDate || new Date().toISOString().split('T')[0],
      status,
      cancelDate,
      plan: 'Basic', // Default plan for new licenses
      term: 'monthly',
      lastPayment: externalLicense.monthlyFee || 0,
      lastActive: externalLicense.lastActive || new Date().toISOString(),
      smsPurchased: 0, // External API doesn't provide this
      smsSent: 0,
      smsBalance: (() => {
        const val = Number(externalLicense.smsBalance);
        return Number.isNaN(val) ? 0 : val;
      })(),
      seatsTotal: 1, // Default to 1 seat for external licenses
      seatsUsed: 0,
      agents: 0,
      agentsName: '',
      agentsCost: 0,
      notes: externalLicense.Note ?? externalLicense.note ?? '',

      // Store external API identifiers for future sync (unified)
      appid: externalLicense.appid,
      countid: externalLicense.countid,
      mid: externalLicense.mid,
      license_type: externalLicense.license_type,
      package_data: externalLicense.package,
      sendbat_workspace: externalLicense.sendbatWorkspace,
      coming_expired: externalLicense.comingExpired,
    };
  }
}
