/**
 * Sync External Licenses Use Case
 * Handles synchronization of licenses between external API and internal database
 * Supports bulk operations, error handling, and performance optimization for large datasets
 */
import { withTimeout, TimeoutPresets } from '../../../shared/utils/reliability/retry.js';
import logger from '../../../infrastructure/config/logger.js';

export class SyncExternalLicensesUseCase {
  constructor(externalLicenseRepository, externalLicenseApiService, internalLicenseRepository = null) {
    this.externalLicenseRepository = externalLicenseRepository;
    this.externalLicenseApiService = externalLicenseApiService;
    this.internalLicenseRepository = internalLicenseRepository;
  }

  /**
   * Execute full sync of external licenses
   * @param {Object} options - Sync options
   * @param {boolean} options.forceFullSync - Force full sync instead of incremental
   * @param {number} options.batchSize - Batch size for processing
   * @param {boolean} options.dryRun - Only fetch and validate, don't save
   * @returns {Promise<Object>} Sync results
   */
  async execute(options = {}) {
    const {
      forceFullSync = false,
      batchSize = 100,
      dryRun = false,
      syncToInternalOnly = false, // New option to only sync existing external data to internal
    } = options;

    const startTime = Date.now();
    const syncResults = {
      success: false,
      totalFetched: 0,
      created: 0,
      updated: 0,
      failed: 0,
      errors: [],
      duration: 0,
      timestamp: new Date(),
    };

    try {
      logger.info('Starting external licenses sync', {
        forceFullSync,
        batchSize,
        dryRun,
        syncToInternalOnly,
      });

      let externalData = null;

      if (!syncToInternalOnly) {
        // First, sync external API data to external_licenses table
        logger.info('Fetching licenses from external API...');
        externalData = await this.externalLicenseApiService.getAllLicenses({
        batchSize,
      });

      if (!externalData.success || !externalData.data) {
        throw new Error('Failed to fetch licenses from external API');
      }

      syncResults.totalFetched = externalData.data.length;

      logger.info('Fetched licenses from external API', {
        totalFetched: syncResults.totalFetched,
        pagesFetched: externalData.meta?.pagesFetched || 0,
      });

      if (dryRun) {
        // In dry run mode, just validate and return results without saving
        syncResults.success = true;
        syncResults.dryRun = true;
        syncResults.validatedLicenses = externalData.data.length;
        syncResults.duration = Date.now() - startTime;
        return syncResults;
      }

      // Process licenses in batches for performance
      const batches = this._createBatches(externalData.data, batchSize);
      const syncTimestamp = new Date();

      logger.info('Processing licenses in batches', {
        totalBatches: batches.length,
        batchSize,
      });

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const batchStartTime = Date.now();

        logger.debug(`Processing batch ${i + 1}/${batches.length}`, {
          batchSize: batch.length,
          progress: `${i + 1}/${batches.length}`,
        });

        try {
          const batchResults = await this._processBatch(batch, syncTimestamp);

          syncResults.created += batchResults.created;
          syncResults.updated += batchResults.updated;
          syncResults.failed += batchResults.failed;
          syncResults.errors.push(...batchResults.errors);

          logger.debug(`Batch ${i + 1} completed`, {
            created: batchResults.created,
            updated: batchResults.updated,
            failed: batchResults.failed,
            duration: Date.now() - batchStartTime,
          });

        } catch (batchError) {
          logger.error(`Batch ${i + 1} failed`, {
            error: batchError.message,
            batchSize: batch.length,
          });

          // Add all items in failed batch as errors
          batch.forEach((licenseData) => {
            syncResults.errors.push({
              appid: licenseData.appid,
              error: `Batch processing failed: ${batchError.message}`,
            });
            syncResults.failed++;
          });
        }
      }

        // Update sync statistics
        await this._updateSyncStats(syncResults, syncTimestamp);

        syncResults.success = true;
      } else {
        // syncToInternalOnly mode - skip external API fetch
        logger.info('Skipping external API fetch, syncing existing external data to internal...');
        syncResults.success = true;
      }
      // If internal license repository is provided, sync external data to internal licenses
      // Run in both normal sync and syncToInternalOnly modes
      if (this.internalLicenseRepository && (!dryRun || syncToInternalOnly)) {
        try {
          logger.info('Starting sync to internal licenses table...');
          const internalSyncResults = await this.externalLicenseRepository.syncToInternalLicenses(this.internalLicenseRepository);

          syncResults.internalSynced = internalSyncResults.syncedCount;
          syncResults.internalUpdated = internalSyncResults.updatedCount;
          syncResults.internalCreated = internalSyncResults.createdCount;

          logger.info('External to internal licenses sync completed', {
            synced: internalSyncResults.syncedCount,
            updated: internalSyncResults.updatedCount,
            created: internalSyncResults.createdCount,
          });
        } catch (error) {
          logger.error('Failed to sync to internal licenses', { error: error.message });
          syncResults.internalSyncError = error.message;
        }
      }

      // Optionally sync internal changes back to external (bidirectional sync)
      if (options.syncBidirectional && this.internalLicenseRepository && this.externalLicenseApiService && !dryRun) {
        try {
          logger.info('Starting bidirectional sync: internal to external...');
          const bidirectionalResults = await this.externalLicenseRepository.syncFromInternalLicenses(
            this.internalLicenseRepository,
            this.externalLicenseApiService
          );

          syncResults.bidirectionalSynced = bidirectionalResults.syncedCount;
          syncResults.bidirectionalUpdated = bidirectionalResults.updatedCount;
          syncResults.bidirectionalFailed = bidirectionalResults.failedCount;

          logger.info('Internal to external licenses sync completed', {
            synced: bidirectionalResults.syncedCount,
            updated: bidirectionalResults.updatedCount,
            failed: bidirectionalResults.failedCount,
          });
        } catch (error) {
          logger.error('Failed bidirectional sync', { error: error.message });
          syncResults.bidirectionalSyncError = error.message;
        }
      }

      syncResults.duration = Date.now() - startTime;

      logger.info('External licenses sync completed', {
        totalFetched: syncResults.totalFetched,
        created: syncResults.created,
        updated: syncResults.updated,
        failed: syncResults.failed,
        internalSynced: syncResults.internalSynced,
        internalUpdated: syncResults.internalUpdated,
        internalCreated: syncResults.internalCreated,
        duration: syncResults.duration,
        successRate: syncResults.totalFetched > 0 ?
          Math.round(((syncResults.created + syncResults.updated) / syncResults.totalFetched) * 100) : 0,
      });

    } catch (error) {
      syncResults.success = false;
      syncResults.error = error.message;
      syncResults.duration = Date.now() - startTime;

      logger.error('External licenses sync failed', {
        error: error.message,
        totalFetched: syncResults.totalFetched,
        duration: syncResults.duration,
      });
    }

    return syncResults;
  }

  /**
   * Sync a single license by appid
   * @param {string} appid - App ID to sync
   * @returns {Promise<Object>} Sync result for single license
   */
  async syncSingleLicense(appid) {
    try {
      logger.info('Syncing single external license', { appid });

      // Fetch from external API
      const externalLicense = await this.externalLicenseApiService.getLicenseByAppId(appid);

      if (!externalLicense) {
        throw new Error(`License with appid ${appid} not found in external API`);
      }

      // Upsert to internal database
      const internalLicense = await this.externalLicenseRepository.upsert(externalLicense);

      // Mark as synced
      await this.externalLicenseRepository.markSynced(internalLicense.id, new Date());

      return {
        success: true,
        license: internalLicense,
        action: 'synced',
      };

    } catch (error) {
      logger.error('Single license sync failed', {
        appid,
        error: error.message,
      });

      // Try to mark as failed in database if it exists
      try {
        const existingLicense = await this.externalLicenseRepository.findByAppId(appid);
        if (existingLicense) {
          await this.externalLicenseRepository.markSyncFailed(existingLicense.id, error.message);
        }
      } catch (markError) {
        logger.error('Failed to mark license sync as failed', {
          appid,
          markError: markError.message,
        });
      }

      return {
        success: false,
        appid,
        error: error.message,
      };
    }
  }

  /**
   * Sync licenses that need updating (failed or pending)
   * @param {Object} options - Sync options
   * @returns {Promise<Object>} Sync results
   */
  async syncPendingLicenses(options = {}) {
    const { limit = 100, batchSize = 25 } = options;

    try {
      logger.info('Syncing pending external licenses', { limit, batchSize });

      // Get licenses that need sync
      const licensesNeedingSync = await this.externalLicenseRepository.findLicensesNeedingSync({
        limit,
      });

      if (licensesNeedingSync.length === 0) {
        return {
          success: true,
          message: 'No licenses need syncing',
          processed: 0,
        };
      }

      logger.info('Found licenses needing sync', {
        count: licensesNeedingSync.length,
      });

      const results = {
        success: true,
        processed: 0,
        synced: 0,
        failed: 0,
        errors: [],
      };

      // Process in batches
      const batches = this._createBatches(licensesNeedingSync, batchSize);

      for (const batch of batches) {
        const batchResults = await Promise.allSettled(
          batch.map(license => this.syncSingleLicense(license.appid))
        );

        batchResults.forEach((result) => {
          results.processed++;
          if (result.status === 'fulfilled') {
            if (result.value.success) {
              results.synced++;
            } else {
              results.failed++;
              results.errors.push(result.value);
            }
          } else {
            results.failed++;
            results.errors.push({
              error: result.reason.message,
            });
          }
        });
      }

      logger.info('Pending licenses sync completed', {
        processed: results.processed,
        synced: results.synced,
        failed: results.failed,
      });

      return results;

    } catch (error) {
      logger.error('Pending licenses sync failed', {
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get sync status and statistics
   * @returns {Promise<Object>} Sync statistics
   */
  async getSyncStatus() {
    try {
      const [syncStats, externalApiHealth] = await Promise.all([
        this.externalLicenseRepository.getSyncStats(),
        this.externalLicenseApiService.healthCheck(),
      ]);

      return {
        success: true,
        internal: syncStats,
        external: {
          healthy: externalApiHealth.healthy,
          lastHealthCheck: externalApiHealth.timestamp,
          error: externalApiHealth.error,
        },
        lastSync: await this._getLastSyncTimestamp(),
      };

    } catch (error) {
      logger.error('Failed to get sync status', {
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Process a batch of licenses
   * @private
   */
  async _processBatch(batch, syncTimestamp) {
    const results = {
      created: 0,
      updated: 0,
      failed: 0,
      errors: [],
    };

    try {
      // Use bulk upsert for better performance
      const bulkResult = await this.externalLicenseRepository.bulkUpsert(batch);

      results.created = bulkResult.created;
      results.updated = bulkResult.updated;
      results.failed = bulkResult.errors.length;
      results.errors = bulkResult.errors;

      // Mark successfully synced licenses
      if (bulkResult.created > 0 || bulkResult.updated > 0) {
        const successfulAppIds = [];

        // Collect successful appids (this is a simplified approach)
        // In a real implementation, you'd want to track which specific items succeeded
        batch.forEach((licenseData, index) => {
          // If this item wasn't in the errors array, consider it successful
          const hasError = bulkResult.errors.some(error =>
            error.data && error.data.appid === licenseData.appid
          );
          if (!hasError) {
            successfulAppIds.push(licenseData.appid);
          }
        });

        if (successfulAppIds.length > 0) {
          // Get the internal IDs for successful licenses and mark them as synced
          const successfulLicenses = await Promise.all(
            successfulAppIds.map(appid => this.externalLicenseRepository.findByAppId(appid))
          );

          const successfulIds = successfulLicenses
            .filter(license => license)
            .map(license => license.id);

          if (successfulIds.length > 0) {
            await this.externalLicenseRepository.bulkMarkSynced(successfulIds, syncTimestamp);
          }
        }
      }

    } catch (error) {
      logger.error('Batch processing failed', {
        batchSize: batch.length,
        error: error.message,
      });

      // Mark all items in batch as failed
      batch.forEach((licenseData) => {
        results.errors.push({
          appid: licenseData.appid,
          error: error.message,
        });
        results.failed++;
      });
    }

    return results;
  }

  /**
   * Create batches from array
   * @private
   */
  _createBatches(array, batchSize) {
    const batches = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Update sync statistics
   * @private
   */
  async _updateSyncStats(syncResults, syncTimestamp) {
    try {
      // This could be used to store sync history/statistics
      // For now, we'll just log the completion
      logger.info('Sync statistics updated', {
        timestamp: syncTimestamp,
        results: {
          totalFetched: syncResults.totalFetched,
          created: syncResults.created,
          updated: syncResults.updated,
          failed: syncResults.failed,
        },
      });
    } catch (error) {
      logger.warn('Failed to update sync statistics', {
        error: error.message,
      });
    }
  }

  /**
   * Get last sync timestamp
   * @private
   */
  async _getLastSyncTimestamp() {
    try {
      // Get the most recent last_synced_at timestamp
      const result = await this.externalLicenseRepository.db('external_licenses')
        .max('last_synced_at as last_sync')
        .first();

      return result?.last_sync || null;
    } catch (error) {
      logger.warn('Failed to get last sync timestamp', {
        error: error.message,
      });
      return null;
    }
  }
}