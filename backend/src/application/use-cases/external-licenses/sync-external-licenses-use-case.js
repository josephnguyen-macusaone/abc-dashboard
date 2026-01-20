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
      batchSize = 20,
      dryRun = false,
      syncToInternalOnly = false,
      bidirectional = false,
      comprehensive = true, // Use comprehensive reconciliation approach (external first, internal second, then compare)
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
        comprehensive,
      });

      let externalData = null;

      if (!syncToInternalOnly) {
        // First, sync external API data to external_licenses table
        logger.info('Fetching licenses from external API...');
        externalData = await this.externalLicenseApiService.getAllLicenses({
          batchSize,
          concurrencyLimit: 3, // Fetch 3 pages concurrently
        });

      if (!externalData.success) {
        // External API failed - check if it's an auth issue or other error
        const isAuthError = externalData.error?.includes('401') || externalData.error?.includes('403') || externalData.error?.includes('Unauthorized');
        const isRateLimitError = externalData.error?.includes('429') || externalData.error?.includes('Too many requests');

        logger.warn('External API call failed', {
          success: externalData.success,
          error: externalData.error,
          isAuthError,
          isRateLimitError,
          dryRun,
        });

        if (dryRun) {
          // In dry run mode, return structured response about API status
          syncResults.success = true; // Dry run is successful even if API fails
          syncResults.dryRun = true;
          syncResults.apiStatus = {
            authenticated: !isAuthError,
            rateLimited: isRateLimitError,
            reachable: true, // We got a response, just not successful
            error: externalData.error,
          };
          syncResults.duration = Date.now() - startTime;
          logger.info('Dry run completed with API status check', syncResults.apiStatus);
          return syncResults;
        } else {
          throw new Error(`Failed to fetch licenses from external API: ${externalData.error}`);
        }
      }

      if (!externalData.data) {
        throw new Error('External API returned success but no data');
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
        syncResults.apiStatus = {
          authenticated: true,
          rateLimited: false,
          dataAvailable: true,
        };
        syncResults.duration = Date.now() - startTime;
        return syncResults;
      }

      // Process licenses in batches concurrently for better performance
      const batches = this._createBatches(externalData.data, batchSize);
      const syncTimestamp = new Date();
      const concurrencyLimit = Math.min(batches.length, 5); // Process up to 5 batches concurrently

      logger.info('Processing licenses in concurrent batches', {
        totalBatches: batches.length,
        batchSize,
        concurrencyLimit,
      });

      // Process batches in concurrent chunks
      for (let batchStart = 0; batchStart < batches.length; batchStart += concurrencyLimit) {
        const batchPromises = [];

        // Create concurrent batch processing promises
        for (let i = 0; i < concurrencyLimit && (batchStart + i) < batches.length; i++) {
          const batchIndex = batchStart + i;
          const batch = batches[batchIndex];

          batchPromises.push(
            this._processBatch(batch, syncTimestamp).then(batchResults => ({
              batchIndex: batchIndex + 1,
              batchResults,
              duration: Date.now() - Date.now(), // Will be set properly
            })).catch(batchError => ({
              batchIndex: batchIndex + 1,
              error: batchError,
              batchSize: batch.length,
            }))
          );
        }

        // Wait for this chunk of batches to complete
        const batchChunkStartTime = Date.now();
        const batchResults = await Promise.all(batchPromises);

        // Process results
        for (const result of batchResults) {
          if (result.error) {
            logger.error(`Batch ${result.batchIndex} failed`, {
              error: result.error.message,
              batchSize: result.batchSize,
            });

            // Add all items in failed batch as errors
            batches[result.batchIndex - 1].forEach((licenseData) => {
              syncResults.errors.push({
                appid: licenseData.appid,
                error: `Batch processing failed: ${result.error.message}`,
              });
              syncResults.failed++;
            });
          } else {
            syncResults.created += result.batchResults.created;
            syncResults.updated += result.batchResults.updated;
            syncResults.failed += result.batchResults.failed;
            syncResults.errors.push(...result.batchResults.errors);

            logger.debug(`Batch ${result.batchIndex} completed`, {
              created: result.batchResults.created,
              updated: result.batchResults.updated,
              failed: result.batchResults.failed,
              duration: Date.now() - batchChunkStartTime,
            });
          }
        }
      }

        // Update sync statistics
        await this._updateSyncStats(syncResults, syncTimestamp);

        syncResults.success = true;
      } else {
        // syncToInternalOnly mode - skip external API fetch
        logger.info('Skipping external API fetch, syncing existing external data to internal...');
        // Get current external license count for reporting
        try {
          const externalLicenses = await this.externalLicenseRepository.findAll({ limit: 100000 });
          syncResults.totalFetched = externalLicenses.length;
        } catch (error) {
          logger.warn('Could not get external license count', { error: error.message });
          syncResults.totalFetched = 0;
        }
        syncResults.success = true;
      }
      // If internal license repository is provided, sync external data to internal licenses
      // Run in both normal sync and syncToInternalOnly modes
      console.log(`DEBUG: Checking internal sync condition: internalLicenseRepository=${!!this.internalLicenseRepository}, dryRun=${dryRun}, syncToInternalOnly=${syncToInternalOnly}`);
      if (this.internalLicenseRepository && (!dryRun || syncToInternalOnly)) {
        console.log('DEBUG: Entering internal sync block');
        try {
          console.log(`DEBUG: About to call internal sync, comprehensive=${comprehensive}, internalLicenseRepository exists=${!!this.internalLicenseRepository}`);
          console.error(`🚨🚨🚨 ABOUT TO CALL INTERNAL SYNC: comprehensive=${comprehensive} 🚨🚨🚨`);
          let internalSyncResults;
          if (comprehensive) {
            console.error('🚨🚨🚨 CALLING COMPREHENSIVE SYNC 🚨🚨🚨');
            console.log('DEBUG: Calling comprehensive sync');
            logger.info('Starting comprehensive sync to internal licenses table (external-first approach)...');
            internalSyncResults = await this.externalLicenseRepository.syncToInternalLicensesComprehensive(this.internalLicenseRepository);
            console.log('DEBUG: Comprehensive sync completed');
          } else {
            logger.info('Starting legacy sync to internal licenses table (external-driven approach)...');
            internalSyncResults = await this.externalLicenseRepository.syncToInternalLicenses(this.internalLicenseRepository);
          }

          syncResults.internalSynced = internalSyncResults.syncedCount;
          syncResults.internalUpdated = internalSyncResults.updatedCount;
          syncResults.internalCreated = internalSyncResults.createdCount;

          // For syncToInternalOnly mode, map these to the main response fields
          if (syncToInternalOnly) {
            syncResults.totalFetched = syncResults.totalFetched || 0;
            syncResults.created = internalSyncResults.createdCount;
            syncResults.updated = internalSyncResults.updatedCount;
          }

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
    const { limit = 100, batchSize = 20 } = options;

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