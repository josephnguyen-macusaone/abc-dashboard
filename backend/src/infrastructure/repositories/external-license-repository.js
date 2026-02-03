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

  async findLicenses(options = {}) {
    const {
      page = 1,
      limit = 10,
      filters = {},
      sortBy = 'updated_at',
      sortOrder = 'desc',
    } = options;

    // Map camelCase to snake_case for sorting
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

    // Apply filters
    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      query = query.where((qb) => {
        qb.whereRaw('appid ILIKE ?', [searchTerm])
          .orWhereRaw('email_license ILIKE ?', [searchTerm])
          .orWhereRaw('dba ILIKE ?', [searchTerm]);
      });
    }

    // Individual field filters
    if (filters.appid) {
      query = query.whereRaw('appid ILIKE ?', [`%${filters.appid}%`]);
    }
    if (filters.email) {
      query = query.whereRaw('email_license ILIKE ?', [`%${filters.email}%`]);
    }
    if (filters.dba) {
      query = query.whereRaw('dba ILIKE ?', [`%${filters.dba}%`]);
    }

    // Status filter
    if (filters.status !== undefined) {
      query = query.where('status', filters.status);
    }

    // License type filter
    if (filters.license_type) {
      query = query.where('license_type', filters.license_type);
    }

    // Sync status filter
    if (filters.syncStatus) {
      query = query.where('sync_status', filters.syncStatus);
    }

    // Date range filters
    if (filters.createdAtFrom) {
      const fromDate = new Date(filters.createdAtFrom);
      query = query.where('created_at', '>=', fromDate);
    }
    if (filters.createdAtTo) {
      const toDate = new Date(filters.createdAtTo);
      toDate.setHours(23, 59, 59, 999);
      query = query.where('created_at', '<=', toDate);
    }

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

  async getSyncStats() {
    const [total, synced, failed, pending] = await Promise.all([
      this.db(this.licensesTable).count('id as count').first(),
      this.db(this.licensesTable).where('sync_status', 'synced').count('id as count').first(),
      this.db(this.licensesTable).where('sync_status', 'failed').count('id as count').first(),
      this.db(this.licensesTable).where('sync_status', 'pending').count('id as count').first(),
    ]);

    return {
      total: parseInt(total?.count || 0),
      synced: parseInt(synced?.count || 0),
      failed: parseInt(failed?.count || 0),
      pending: parseInt(pending?.count || 0),
      successRate:
        parseInt(total?.count || 0) > 0
          ? Math.round((parseInt(synced?.count || 0) / parseInt(total?.count || 0)) * 100)
          : 0,
    };
  }

  async bulkUpsert(licensesData) {
    const created = [];
    const updated = [];
    const errors = [];

    // Process in smaller batches to avoid database timeouts
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
          // Pre-validate batch data and prepare for bulk operation
          const validBatchData = [];
          const batchErrors = [];

          for (const licenseData of batch) {
            try {
              const dbData = this._toExternalLicenseDbFormat(licenseData);
              validBatchData.push(dbData);
            } catch (itemError) {
              batchErrors.push({
                data: licenseData,
                error: `Data formatting error: ${itemError.message}`,
              });
            }
          }

          // Add validation errors to main errors array
          errors.push(...batchErrors);

          if (validBatchData.length === 0) {
            logger.warn('No valid data in batch, skipping upsert', { batchNumber });
            return;
          }

          // Deduplicate by appid to prevent ON CONFLICT errors
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
              duplicatesRemoved: validBatchData.length - deduplicatedData.length,
            });
          }

          // Use bulk upsert with ON CONFLICT for better performance
          // This approach is more efficient than individual checks
          const results = await trx(this.licensesTable)
            .insert(deduplicatedData)
            .onConflict('appid')
            .merge()
            .returning(['id', 'appid', 'created_at', 'updated_at']);

          logger.debug(`Bulk upsert completed for batch ${batchNumber}`, {
            inserted: results.length,
            batchSize: deduplicatedData.length,
          });

          // Determine which were created vs updated by checking timestamps
          // This is an approximation since we can't easily distinguish without additional queries
          // In a production system, you might want to track this differently
          const now = new Date();
          const timeThreshold = new Date(now.getTime() - 1000); // 1 second ago

          for (const result of results) {
            // If created_at and updated_at are very close, it was likely created
            // If updated_at is newer than created_at, it was likely updated
            const createdAt = new Date(result.created_at);
            const updatedAt = new Date(result.updated_at);

            if (Math.abs(updatedAt.getTime() - createdAt.getTime()) < 1000) {
              created.push(result);
            } else {
              updated.push(result);
            }
          }
        });
      } catch (batchError) {
        logger.error('Bulk upsert batch failed', {
          correlationId: this.correlationId,
          batchNumber,
          batchStart: i,
          batchEnd: Math.min(i + batchSize, licensesData.length),
          error: batchError.message,
        });

        // Add all items in this batch as errors
        batch.forEach((licenseData) => {
          errors.push({
            data: licenseData,
            error: batchError.message,
          });
        });
      }
    }

    const summary = {
      created: created.length,
      updated: updated.length,
      errors: errors, // Return the full errors array, not just the count
      totalProcessed: created.length + updated.length + errors.length,
      successRate:
        licensesData.length > 0
          ? Math.round(((created.length + updated.length) / licensesData.length) * 100)
          : 0,
    };

    logger.debug('Bulk upsert operation completed', {
      ...summary,
      errorCount: errors.length,
    });

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
    // Start with base query that applies the same filters as findLicenses
    let baseQuery = this.db(this.licensesTable);

    // Apply the same filters as findLicenses method
    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      baseQuery = baseQuery.where((qb) => {
        qb.whereRaw('appid ILIKE ?', [searchTerm])
          .orWhereRaw('email_license ILIKE ?', [searchTerm])
          .orWhereRaw('dba ILIKE ?', [searchTerm]);
      });
    }

    if (filters.appid) {
      baseQuery = baseQuery.whereRaw('appid ILIKE ?', [`%${filters.appid}%`]);
    }
    if (filters.email) {
      baseQuery = baseQuery.whereRaw('email_license ILIKE ?', [`%${filters.email}%`]);
    }
    if (filters.dba) {
      baseQuery = baseQuery.whereRaw('dba ILIKE ?', [`%${filters.dba}%`]);
    }
    if (filters.status !== undefined) {
      baseQuery = baseQuery.where('status', filters.status);
    }
    if (filters.license_type) {
      baseQuery = baseQuery.where('license_type', filters.license_type);
    }
    if (filters.syncStatus) {
      baseQuery = baseQuery.where('sync_status', filters.syncStatus);
    }

    // Calculate stats based on filtered query
    const [totalCount, activeCount, expiredCount, pendingCount, syncedCount] = await Promise.all([
      baseQuery.clone().count('id as count').first(),
      baseQuery.clone().where('status', 1).count('id as count').first(),
      baseQuery.clone().whereRaw('coming_expired < ?', [new Date()]).count('id as count').first(),
      baseQuery.clone().where('sync_status', 'pending').count('id as count').first(),
      baseQuery.clone().where('sync_status', 'synced').count('id as count').first(),
    ]);

    return {
      total: parseInt(totalCount?.count || 0),
      active: parseInt(activeCount?.count || 0),
      expired: parseInt(expiredCount?.count || 0),
      pending: parseInt(pendingCount?.count || 0),
      synced: parseInt(syncedCount?.count || 0),
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
   * Convert entity/updates to database format
   */
  _toExternalLicenseDbFormat(data) {
    const dbData = {};

    if (data.countid !== undefined) {
      dbData.countid = data.countid;
    }
    if (data.id !== undefined) {
      dbData.id = data.id;
    }
    if (data.appid !== undefined) {
      // Truncate appid to 255 characters max (database constraint)
      dbData.appid = data.appid ? String(data.appid).substring(0, 255) : data.appid;
    }
    if (data.license_type !== undefined) {
      // Truncate license_type to 50 characters max (database constraint)
      dbData.license_type = String(data.license_type).substring(0, 50);
    }
    if (data.dba !== undefined) {
      // Truncate dba to 255 characters max (database constraint)
      dbData.dba = data.dba ? String(data.dba).substring(0, 255) : data.dba;
    }
    if (data.zip !== undefined) {
      // Truncate zip to 10 characters max (database constraint)
      dbData.zip = String(data.zip).substring(0, 10);
    }
    if (data.mid !== undefined) {
      // Truncate mid to 255 characters max (database constraint)
      dbData.mid = data.mid ? String(data.mid).substring(0, 255) : data.mid;
    }
    if (data.status !== undefined) {
      dbData.status = data.status;
    }
    if (data.ActivateDate !== undefined) {
      dbData.activate_date = data.ActivateDate;
    }
    if (data.Coming_expired !== undefined) {
      dbData.coming_expired = data.Coming_expired;
    }
    if (data.monthlyFee !== undefined) {
      dbData.monthly_fee = data.monthlyFee;
    }
    if (data.smsBalance !== undefined) {
      dbData.sms_balance = data.smsBalance;
    }
    if (data.Email_license !== undefined) {
      // Truncate email_license to 255 characters max (database constraint)
      dbData.email_license = data.Email_license
        ? String(data.Email_license).substring(0, 255)
        : data.Email_license;
    }
    if (data.pass !== undefined) {
      // Truncate pass to 255 characters max (database constraint)
      dbData.pass = data.pass ? String(data.pass).substring(0, 255) : data.pass;
    }
    if (data.Package !== undefined) {
      dbData.package = JSON.stringify(data.Package);
    }
    if (data.Note !== undefined) {
      dbData.note = data.Note;
    }
    if (data.Sendbat_workspace !== undefined) {
      // Truncate sendbat_workspace to 255 characters max (database constraint)
      dbData.sendbat_workspace = data.Sendbat_workspace
        ? String(data.Sendbat_workspace).substring(0, 255)
        : data.Sendbat_workspace;
    }
    if (data.lastActive !== undefined) {
      dbData.last_active = data.lastActive;
    }

    // Internal fields
    if (data.lastSyncedAt !== undefined) {
      dbData.last_synced_at = data.lastSyncedAt;
    }
    if (data.syncStatus !== undefined) {
      dbData.sync_status = data.syncStatus;
    }
    if (data.syncError !== undefined) {
      dbData.sync_error = data.syncError;
    }
    if (data.createdAt !== undefined) {
      dbData.created_at = data.createdAt;
    }
    if (data.updatedAt !== undefined) {
      dbData.updated_at = data.updatedAt;
    }

    return dbData;
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
        total_external: externalLicenses.licenses.length,
        total_internal: allInternalLicenses.licenses.length,
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

  /**
   * Sync internal license changes back to external API
   * This pushes updates from internal licenses to external system
   */
  async syncFromInternalLicenses(internalLicenseRepo, externalApiService) {
    try {
      logger.info('Starting sync from internal licenses to external API');

      // Get internal licenses that have external identifiers and need syncing
      const internalLicenses = await internalLicenseRepo.findLicenses({
        page: 1,
        limit: 10000, // Get all for comprehensive sync
        filters: {
          // Only sync licenses that have external data
          hasExternalData: true,
        },
      });

      let syncedCount = 0;
      let updatedCount = 0;
      let failedCount = 0;
      const errors = [];

      logger.info(
        `Processing ${internalLicenses.licenses.length} internal licenses for external sync`
      );

      for (const internalLicense of internalLicenses.licenses) {
        try {
          // Skip if no external identifiers
          if (
            !internalLicense.external_appid &&
            !internalLicense.external_email &&
            !internalLicense.external_countid
          ) {
            continue;
          }

          // Prepare external license data from internal license
          const externalLicenseData = this._internalToExternalFormat(internalLicense);

          // Try to update external license
          let updateResult = null;

          // Priority: appid > email > countid for external updates
          if (internalLicense.external_appid) {
            try {
              updateResult = await externalApiService.updateLicense(
                internalLicense.external_appid,
                externalLicenseData
              );
              logger.debug(`Updated external license by appid`, {
                internal_id: internalLicense.id,
                external_appid: internalLicense.external_appid,
              });
            } catch (error) {
              logger.warn(`Failed to update external license by appid, trying email`, {
                internal_id: internalLicense.id,
                external_appid: internalLicense.external_appid,
                error: error.message,
              });
            }
          }

          if (!updateResult && internalLicense.external_email) {
            try {
              updateResult = await externalApiService.updateLicenseByEmail(
                internalLicense.external_email,
                externalLicenseData
              );
              logger.debug(`Updated external license by email`, {
                internal_id: internalLicense.id,
                external_email: internalLicense.external_email,
              });
            } catch (error) {
              logger.warn(`Failed to update external license by email`, {
                internal_id: internalLicense.id,
                external_email: internalLicense.external_email,
                error: error.message,
              });
            }
          }

          if (updateResult) {
            updatedCount++;
          } else {
            logger.warn(`Could not update external license - no valid identifiers`, {
              internal_id: internalLicense.id,
              external_appid: internalLicense.external_appid,
              external_email: internalLicense.external_email,
            });
            failedCount++;
            errors.push({
              internal_id: internalLicense.id,
              error: 'No valid external identifiers for update',
            });
          }

          syncedCount++;
        } catch (error) {
          logger.error(`Failed to sync internal license to external`, {
            internal_id: internalLicense.id,
            error: error.message,
          });
          failedCount++;
          errors.push({
            internal_id: internalLicense.id,
            error: error.message,
          });
        }
      }

      logger.info('Internal to external licenses sync completed', {
        processed: syncedCount,
        updated: updatedCount,
        failed: failedCount,
      });

      return {
        syncedCount,
        updatedCount,
        failedCount,
        errors,
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

  /**
   * Create selective update data from external license - only includes fields that external actually provides
   * This prevents overwriting internal data with defaults when external data is missing
   */
  _createExternalUpdateData(externalLicense) {
    const updateData = {};

    // Only update fields that are actually provided by external API
    if (externalLicense.dba !== undefined && externalLicense.dba !== null) {
      updateData.dba = externalLicense.dba;
    }

    if (externalLicense.zip !== undefined && externalLicense.zip !== null) {
      updateData.zip = externalLicense.zip;
    }

    if (externalLicense.activateDate !== undefined && externalLicense.activateDate !== null) {
      updateData.startsAt = externalLicense.activateDate;
    }

    if (externalLicense.status !== undefined && externalLicense.status !== null) {
      // Handle both numeric (1/0) and string ('active'/'inactive') status formats
      let newStatus;
      if (typeof externalLicense.status === 'number') {
        newStatus = externalLicense.status === 1 ? 'active' : 'cancel';
      } else if (typeof externalLicense.status === 'string') {
        newStatus = externalLicense.status === 'active' ? 'active' : 'cancel';
      }

      updateData.status = newStatus;

      // Set cancel date if status is being changed to 'cancel'
      if (newStatus === 'cancel') {
        updateData.cancelDate = externalLicense.lastActive || new Date().toISOString();
        logger.debug('Setting cancel date for license status update', {
          cancelDate: updateData.cancelDate,
          lastActive: externalLicense.lastActive,
        });
      }
    }

    if (externalLicense.monthlyFee !== undefined && externalLicense.monthlyFee !== null) {
      updateData.lastPayment = externalLicense.monthlyFee;
    }

    if (externalLicense.lastActive !== undefined && externalLicense.lastActive !== null) {
      updateData.lastActive = externalLicense.lastActive;
    }

    if (externalLicense.smsBalance !== undefined && externalLicense.smsBalance !== null) {
      updateData.smsBalance = Math.round(externalLicense.smsBalance);
    }

    if (externalLicense.note !== undefined && externalLicense.note !== null) {
      updateData.notes = externalLicense.note;
    }

    // Always update external identifiers and status
    if (externalLicense.appid !== undefined) {
      updateData.appid = externalLicense.appid;
    }

    if (externalLicense.countid !== undefined) {
      updateData.countid = externalLicense.countid;
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

    return {
      product: 'ABC Business Suite', // Default product for external licenses
      dba: defaultDba,
      zip: externalLicense.zip || '',
      startsAt: externalLicense.activateDate || new Date().toISOString().split('T')[0],
      status,
      cancelDate,
      plan: 'Basic', // Default plan for new licenses
      term: 'monthly',
      lastPayment: externalLicense.monthlyFee || 0,
      lastActive: externalLicense.lastActive || new Date().toISOString(),
      smsPurchased: 0, // External API doesn't provide this
      smsSent: 0,
      smsBalance: Math.round(externalLicense.smsBalance || 0),
      seatsTotal: 1, // Default to 1 seat for external licenses
      seatsUsed: 0,
      agents: 0,
      agentsName: [],
      agentsCost: 0,
      notes: externalLicense.note || '',

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
