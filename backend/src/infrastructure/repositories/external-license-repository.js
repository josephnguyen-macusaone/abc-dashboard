import { ExternalLicense } from '../../domain/entities/external-license-entity.js';
import { IExternalLicenseRepository } from '../../domain/repositories/interfaces/i-external-license-repository.js';
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
    if (!appid) {
      throw new Error('App ID is required for findByAppId');
    }

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
    if (!email) {
      throw new Error('Email is required for findByEmail');
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
    let countQuery = this.db(this.licensesTable);

    // Apply filters
    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      query = query.where((qb) => {
        qb.whereRaw('appid ILIKE ?', [searchTerm])
          .orWhereRaw('email_license ILIKE ?', [searchTerm])
          .orWhereRaw('dba ILIKE ?', [searchTerm]);
      });
      countQuery = countQuery.where((qb) => {
        qb.whereRaw('appid ILIKE ?', [searchTerm])
          .orWhereRaw('email_license ILIKE ?', [searchTerm])
          .orWhereRaw('dba ILIKE ?', [searchTerm]);
      });
    }

    // Individual field filters
    if (filters.appid) {
      query = query.whereRaw('appid ILIKE ?', [`%${filters.appid}%`]);
      countQuery = countQuery.whereRaw('appid ILIKE ?', [`%${filters.appid}%`]);
    }
    if (filters.email) {
      query = query.whereRaw('email_license ILIKE ?', [`%${filters.email}%`]);
      countQuery = countQuery.whereRaw('email_license ILIKE ?', [`%${filters.email}%`]);
    }
    if (filters.dba) {
      query = query.whereRaw('dba ILIKE ?', [`%${filters.dba}%`]);
      countQuery = countQuery.whereRaw('dba ILIKE ?', [`%${filters.dba}%`]);
    }

    // Status filter
    if (filters.status !== undefined) {
      query = query.where('status', filters.status);
      countQuery = countQuery.where('status', filters.status);
    }

    // License type filter
    if (filters.license_type) {
      query = query.where('license_type', filters.license_type);
      countQuery = countQuery.where('license_type', filters.license_type);
    }

    // Sync status filter
    if (filters.syncStatus) {
      query = query.where('sync_status', filters.syncStatus);
      countQuery = countQuery.where('sync_status', filters.syncStatus);
    }

    // Date range filters
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

    if (!appid) {
      throw new Error('App ID is required for upsert operation');
    }

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
    const batchSize = 50;

    for (let i = 0; i < licensesData.length; i += batchSize) {
      const batch = licensesData.slice(i, i + batchSize);

      try {
        await this.db.transaction(async (trx) => {
          for (const licenseData of batch) {
            try {
              const dbData = this._toExternalLicenseDbFormat(licenseData);
              const appid = licenseData.appid;

              // Check if license exists
              const existing = await trx(this.licensesTable)
                .whereRaw('LOWER(appid) = ?', [appid.toLowerCase()])
                .first();

              const [result] = await trx(this.licensesTable)
                .insert(dbData)
                .onConflict('appid')
                .merge()
                .returning('*');

              if (existing) {
                updated.push(this._toExternalLicenseEntity(result));
              } else {
                created.push(this._toExternalLicenseEntity(result));
              }
            } catch (itemError) {
              errors.push({
                data: licenseData,
                error: itemError.message,
              });
            }
          }
        });
      } catch (batchError) {
        logger.error('Bulk upsert batch failed', {
          correlationId: this.correlationId,
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

    return {
      created: created.length,
      updated: updated.length,
      errors,
      totalProcessed: created.length + updated.length + errors.length,
    };
  }

  async bulkUpdate(updates) {
    const updatedLicenses = [];

    await this.db.transaction(async (trx) => {
      for (const { id, updates: data } of updates) {
        try {
          const dbUpdates = this._toExternalLicenseDbFormat(data);
          dbUpdates.updated_at = new Date();

          const [updatedRow] = await trx(this.licensesTable)
            .where('id', id)
            .update(dbUpdates)
            .returning('*');

          if (updatedRow) {
            updatedLicenses.push(this._toExternalLicenseEntity(updatedRow));
          }
        } catch (updateError) {
          logger.error('Bulk update item failed', {
            correlationId: this.correlationId,
            licenseId: id,
            error: updateError.message,
          });
        }
      }
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
      dba: licenseRow.dba,
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

    if (data.countid !== undefined) dbData.countid = data.countid;
    if (data.id !== undefined) dbData.id = data.id;
    if (data.appid !== undefined) dbData.appid = data.appid;
    if (data.license_type !== undefined) dbData.license_type = data.license_type;
    if (data.dba !== undefined) dbData.dba = data.dba;
    if (data.zip !== undefined) dbData.zip = data.zip;
    if (data.mid !== undefined) dbData.mid = data.mid;
    if (data.status !== undefined) dbData.status = data.status;
    if (data.ActivateDate !== undefined) dbData.activate_date = data.ActivateDate;
    if (data.Coming_expired !== undefined) dbData.coming_expired = data.Coming_expired;
    if (data.monthlyFee !== undefined) dbData.monthly_fee = data.monthlyFee;
    if (data.smsBalance !== undefined) dbData.sms_balance = data.smsBalance;
    if (data.Email_license !== undefined) dbData.email_license = data.Email_license;
    if (data.pass !== undefined) dbData.pass = data.pass;
    if (data.Package !== undefined) dbData.package = JSON.stringify(data.Package);
    if (data.Note !== undefined) dbData.note = data.Note;
    if (data.Sendbat_workspace !== undefined) dbData.sendbat_workspace = data.Sendbat_workspace;
    if (data.lastActive !== undefined) dbData.last_active = data.lastActive;

    // Internal fields
    if (data.lastSyncedAt !== undefined) dbData.last_synced_at = data.lastSyncedAt;
    if (data.syncStatus !== undefined) dbData.sync_status = data.syncStatus;
    if (data.syncError !== undefined) dbData.sync_error = data.syncError;
    if (data.createdAt !== undefined) dbData.created_at = data.createdAt;
    if (data.updatedAt !== undefined) dbData.updated_at = data.updatedAt;

    return dbData;
  }

  /**
   * Sync external license data into internal license table
   * This method updates the internal licenses table with external API data
   */
  /**
   * Sync external licenses to internal licenses
   * This pulls data from external API and updates/merges with internal licenses
   */
  async syncToInternalLicenses(internalLicenseRepo) {
    try {
      logger.info('Starting sync from external licenses to internal licenses');
      const externalLicenses = await this.findLicenses({});
      let syncedCount = 0;
      let updatedCount = 0;
      let createdCount = 0;

      logger.info(
        `Processing ${externalLicenses.licenses.length} external licenses for internal sync`
      );

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

            const newLicense = await internalLicenseRepo.create({
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
      updateData.status = externalLicense.status === 1 ? 'active' : 'inactive';
    }

    if (externalLicense.monthlyFee !== undefined && externalLicense.monthlyFee !== null) {
      updateData.lastPayment = externalLicense.monthlyFee;
    }

    if (externalLicense.lastActive !== undefined && externalLicense.lastActive !== null) {
      updateData.lastActive = externalLicense.lastActive;
    }

    if (externalLicense.smsBalance !== undefined && externalLicense.smsBalance !== null) {
      updateData.smsBalance = externalLicense.smsBalance;
    }

    if (externalLicense.note !== undefined && externalLicense.note !== null) {
      updateData.notes = externalLicense.note;
    }

    // Always update external identifiers and status
    if (externalLicense.appid !== undefined) {
      updateData.external_appid = externalLicense.appid;
    }

    if (externalLicense.countid !== undefined) {
      updateData.external_countid = externalLicense.countid;
    }

    if (externalLicense.emailLicense !== undefined) {
      updateData.external_email = externalLicense.emailLicense;
    }

    updateData.external_status = externalLicense.status;
    updateData.external_package = externalLicense.package;
    updateData.external_sendbat_workspace = externalLicense.sendbatWorkspace;
    updateData.external_coming_expired = externalLicense.comingExpired;

    return updateData;
  }

  /**
   * Convert external license format to internal license format (for new licenses)
   * This provides defaults for creating new licenses from external data
   */
  _externalToInternalFormat(externalLicense) {
    return {
      product: 'ABC Business Suite', // Default product for external licenses
      dba: externalLicense.dba || '',
      zip: externalLicense.zip || '',
      startsAt: externalLicense.activateDate || new Date().toISOString().split('T')[0],
      status: externalLicense.status === 1 ? 'active' : 'inactive',
      plan: 'Basic', // Default plan for new licenses
      term: 'monthly',
      lastPayment: externalLicense.monthlyFee || 0,
      lastActive: externalLicense.lastActive || new Date().toISOString(),
      smsPurchased: 0, // External API doesn't provide this
      smsSent: 0,
      smsBalance: externalLicense.smsBalance || 0,
      seatsTotal: 1, // Default to 1 seat for external licenses
      seatsUsed: 0,
      agents: 0,
      agentsName: [],
      agentsCost: 0,
      notes: externalLicense.note || '',

      // Store external API identifiers for future sync
      external_appid: externalLicense.appid,
      external_countid: externalLicense.countid,
      external_email: externalLicense.emailLicense,
      external_status: externalLicense.status,
      external_package: externalLicense.package,
      external_sendbat_workspace: externalLicense.sendbatWorkspace,
      external_coming_expired: externalLicense.comingExpired,
    };
  }
}
