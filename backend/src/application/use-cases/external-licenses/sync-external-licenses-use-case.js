/**
 * Sync External Licenses Use Case
 * Handles synchronization of licenses between external API and internal database
 * Supports bulk operations, error handling, and performance optimization for large datasets
 */
import { withTimeout, TimeoutPresets } from '../../../shared/utils/reliability/retry.js';
import { licenseSyncConfig } from '../../../infrastructure/config/license-sync-config.js';
import { licenseSyncMonitor } from '../../../infrastructure/monitoring/license-sync-monitor.js';
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
      batchSize = licenseSyncConfig.sync.batchSize,
      dryRun = false,
      syncToInternalOnly = false,
      bidirectional = licenseSyncConfig.features.enableBidirectionalSync,
      comprehensive = licenseSyncConfig.features.enableComprehensiveSync,
    } = options;

    // Start monitoring this sync operation
    const operationContext = licenseSyncMonitor.recordSyncStart('external_licenses_sync', {
      forceFullSync,
      batchSize,
      dryRun,
      syncToInternalOnly,
      comprehensive,
    });

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
        operationId: operationContext.operationId,
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

      // Process licenses in batches with adaptive concurrency for better performance
      const batches = this._createBatches(externalData.data, batchSize);
      const syncTimestamp = new Date();

      // Adaptive concurrency based on batch size and system capacity
      const adaptiveConcurrency = this._calculateAdaptiveConcurrency(batches.length, batchSize);
      const concurrencyLimit = Math.min(batches.length, adaptiveConcurrency);

      logger.debug('Adaptive concurrency calculated', {
        totalBatches: batches.length,
        batchSize,
        requestedConcurrency: licenseSyncConfig.sync.concurrencyLimit,
        adaptiveConcurrency,
        finalConcurrencyLimit: concurrencyLimit,
      });

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

            // Safely add batch errors
            if (result.batchResults.errors && Array.isArray(result.batchResults.errors)) {
              syncResults.errors.push(...result.batchResults.errors);
            }

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
      if (this.internalLicenseRepository && (!dryRun || syncToInternalOnly)) {
        try {
          logger.debug('Preparing internal license sync', {
            comprehensive,
            dryRun,
            syncToInternalOnly,
            hasInternalRepo: !!this.internalLicenseRepository,
          });

          let internalSyncResults;
          if (comprehensive) {
            logger.info('Starting paginated sync to internal licenses table (batch processing approach)...');
            logger.info('Using comprehensive mode with batch processing for robust data handling', { batchSize });
            internalSyncResults = await this.syncToInternalLicensesPaginated({
              batchSize: batchSize || 100,
            });
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
      syncResults.success = true;

      // Record data processing metrics
      licenseSyncMonitor.recordDataProcessed(syncResults.totalFetched, 'external_sync');

      // Record sync completion
      licenseSyncMonitor.recordSyncEnd(operationContext, {
        success: true,
        totalFetched: syncResults.totalFetched,
        created: syncResults.created,
        updated: syncResults.updated,
        failed: syncResults.failed,
        internalSynced: syncResults.internalSynced,
        duration: syncResults.duration,
      });

      logger.info('External licenses sync completed', {
        operationId: operationContext.operationId,
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

      // Record sync failure
      licenseSyncMonitor.recordSyncEnd(operationContext, {
        success: false,
        error: error.message,
        errorType: 'sync_failure',
        totalFetched: syncResults.totalFetched,
        duration: syncResults.duration,
      });

      logger.error('External licenses sync failed', {
        operationId: operationContext.operationId,
        error: error.message,
        totalFetched: syncResults.totalFetched,
        duration: syncResults.duration,
      });

      // Attempt recovery for known error types
      const recoveryResult = await this._attemptSyncRecovery(error, options);
      syncResults.recoveryAttempted = recoveryResult.attempted;
      syncResults.recoverySuccessful = recoveryResult.successful;

      if (recoveryResult.successful) {
        logger.info('Sync recovery successful', {
          operationId: operationContext.operationId,
          recoveryType: recoveryResult.type,
        });
      }
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
   * Calculate adaptive concurrency based on workload and system capacity
   * @private
   */
  _calculateAdaptiveConcurrency(totalBatches, batchSize) {
    const baseConcurrency = licenseSyncConfig.sync.concurrencyLimit;

    // For small datasets, use lower concurrency to avoid overhead
    if (totalBatches <= 3) {
      return Math.min(baseConcurrency, 2);
    }

    // For large datasets, gradually increase concurrency but cap it
    if (totalBatches > 50) {
      return Math.min(baseConcurrency, 8); // Allow higher concurrency for large datasets
    }

    // For medium datasets, use base concurrency
    return baseConcurrency;
  }

  /**
   * Get last sync timestamp
   * @private
   */
  /**
   * Attempt to recover from sync failures
   * @private
   */
  async _attemptSyncRecovery(error, options) {
    const result = {
      attempted: false,
      successful: false,
      type: null,
    };

    try {
      // Check for network timeout errors
      if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
        result.attempted = true;
        result.type = 'retry_with_smaller_batch';

        // Retry with smaller batch size
        const retryOptions = {
          ...options,
          batchSize: Math.max(10, Math.floor(options.batchSize / 2)),
          forceFullSync: false, // Don't force full sync on retry
        };

        logger.info('Attempting sync recovery with smaller batch size', {
          originalBatchSize: options.batchSize,
          retryBatchSize: retryOptions.batchSize,
        });

        const retryResult = await this.execute(retryOptions);
        if (retryResult.success) {
          result.successful = true;
        }
      }

      // Check for database connection errors
      else if (error.message.includes('connection') || error.message.includes('ECONNREFUSED')) {
        result.attempted = true;
        result.type = 'database_connection_issue';

        logger.warn('Sync failed due to database connection issue - manual intervention required', {
          error: error.message,
        });

        // Could implement database reconnection logic here
        // For now, just log the issue
      }

      // Check for external API errors
      else if (error.message.includes('HTTP') || error.message.includes('API')) {
        result.attempted = true;
        result.type = 'external_api_issue';

        logger.warn('Sync failed due to external API issue', {
          error: error.message,
        });

        // Could implement API health checks and retries here
      }

    } catch (recoveryError) {
      logger.error('Sync recovery attempt failed', {
        originalError: error.message,
        recoveryError: recoveryError.message,
        recoveryType: result.type,
      });
    }

    return result;
  }

  /**
   * Sync external licenses to internal licenses using paginated approach
   * Processes licenses in manageable batches to avoid memory issues
   * @param {Object} options - Sync options
   * @param {number} options.batchSize - Size of each batch (default: 100)
   * @returns {Promise<Object>} Sync results
   */
  async syncToInternalLicensesPaginated(options = {}) {
    const { batchSize = 100 } = options;

    try {
      logger.info('Starting paginated sync from external to internal licenses', { batchSize });

      // Get total count of external licenses
      const externalStats = await this.externalLicenseRepository.getLicenseStatsWithFilters({});
      const totalExternalLicenses = externalStats.total || 0;

      if (totalExternalLicenses === 0) {
        logger.info('No external licenses found, skipping paginated sync');
        return { syncedCount: 0, updatedCount: 0, createdCount: 0 };
      }

      logger.info(`Found ${totalExternalLicenses} external licenses to process in batches of ${batchSize}`);

      let totalSynced = 0;
      let totalUpdated = 0;
      let totalCreated = 0;
      let totalProcessed = 0;
      let page = 1;

      // Process external licenses in batches
      while (totalProcessed < totalExternalLicenses) {
        const offset = (page - 1) * batchSize;
        const remaining = totalExternalLicenses - totalProcessed;
        const currentBatchSize = Math.min(batchSize, remaining);

        logger.info(`Processing batch ${page}: licenses ${offset + 1}-${offset + currentBatchSize} of ${totalExternalLicenses}`);

        try {
          // Get current batch of external licenses
          const externalBatch = await this.externalLicenseRepository.findLicenses({
            page,
            limit: currentBatchSize,
            filters: {},
          });

          if (externalBatch.licenses.length === 0) {
            logger.info('No more external licenses to process');
            break;
          }

          // Build lookup maps for this batch only
          const externalByAppId = new Map();
          const externalByCountId = new Map();

          for (const extLicense of externalBatch.licenses) {
            if (extLicense.appid) {
              externalByAppId.set(extLicense.appid, extLicense);
            }
            if (extLicense.countid !== undefined && extLicense.countid !== null) {
              externalByCountId.set(extLicense.countid, extLicense);
            }
          }

          logger.debug(`Batch ${page} lookup maps built`, {
            appIdCount: externalByAppId.size,
            countIdCount: externalByCountId.size,
          });

          // Process each license in this batch
          let batchSynced = 0;
          let batchUpdated = 0;
          let batchCreated = 0;
          let batchSkipped = 0;

          for (const externalLicense of externalBatch.licenses) {
            try {
              // Try to find existing internal license with flexible matching
              let internalLicense = null;
              let matchReason = null;

              // Priority: appid > countid > email (most specific first)
              if (externalLicense.appid) {
                try {
                  internalLicense = await this.internalLicenseRepository.findByAppId(externalLicense.appid);
                  matchReason = 'appid';
                } catch (findError) {
                  logger.debug(`AppId lookup failed for ${externalLicense.appid}, continuing with other identifiers`, {
                    error: findError.message
                  });
                }
              }

              if (!internalLicense && externalLicense.countid !== undefined && externalLicense.countid !== null) {
                try {
                  internalLicense = await this.internalLicenseRepository.findByCountId(externalLicense.countid);
                  matchReason = 'countid';
                } catch (findError) {
                  logger.debug(`CountId lookup failed for ${externalLicense.countid}, continuing with other identifiers`, {
                    error: findError.message
                  });
                }
              }

              // For duplicates with different identifiers, create separate records
              // This allows importing all data even with conflicting identifiers
              const shouldCreateDuplicate = !internalLicense && (
                externalLicense.appid || externalLicense.countid !== undefined
              );

              if (internalLicense) {
                // Update existing license with enhanced error handling
                try {
                  const updateData = this.externalLicenseRepository._createExternalUpdateData(externalLicense);
                  updateData.external_sync_status = 'synced';
                  updateData.last_external_sync = new Date();

                  await this.internalLicenseRepository.update(internalLicense.id, updateData);
                  batchUpdated++;
                  totalUpdated++;

                  logger.debug(`Updated existing license`, {
                    internalId: internalLicense.id,
                    matchReason,
                    appid: externalLicense.appid,
                    countid: externalLicense.countid,
                  });
                } catch (updateError) {
                  logger.warn(`Failed to update existing license ${internalLicense.id}, will try to create duplicate`, {
                    error: updateError.message,
                    appid: externalLicense.appid,
                    countid: externalLicense.countid,
                  });
                  // Fall through to create logic below
                  internalLicense = null;
                }
              }

              if (!internalLicense) {
                // Create new license with robust data transformation
                try {
                  const internalLicenseData = this._transformExternalLicenseRobustly(externalLicense);

                  // Generate a unique key for this license to prevent conflicts
                  const uniqueKey = this._generateUniqueLicenseKey(externalLicense);
                  internalLicenseData.key = uniqueKey;

                  await this.internalLicenseRepository.save(internalLicenseData);
                  batchCreated++;
                  totalCreated++;

                  logger.debug(`Created new license`, {
                    key: uniqueKey,
                    appid: externalLicense.appid,
                    countid: externalLicense.countid,
                    shouldCreateDuplicate: shouldCreateDuplicate ? 'yes' : 'no',
                  });
                } catch (createError) {
                  logger.warn(`Failed to create license even with robust transformation`, {
                    error: createError.message,
                    appid: externalLicense.appid,
                    countid: externalLicense.countid,
                    externalData: JSON.stringify(externalLicense).substring(0, 200) + '...',
                  });
                  batchSkipped++;
                  continue; // Skip this license but continue with batch
                }
              }

              batchSynced++;
              totalSynced++;

            } catch (licenseError) {
              logger.warn(`Unexpected error processing external license`, {
                error: licenseError.message,
                stack: licenseError.stack,
                appid: externalLicense.appid,
                countid: externalLicense.countid,
                externalData: JSON.stringify(externalLicense).substring(0, 200) + '...',
              });
              batchSkipped++;
              // Continue with next license in batch
            }
          }

          logger.info(`Batch ${page} completed`, {
            processed: externalBatch.licenses.length,
            synced: batchSynced,
            updated: batchUpdated,
            created: batchCreated,
            skipped: batchSkipped,
          });

          logger.info(`Batch ${page} completed`, {
            processed: externalBatch.licenses.length,
            synced: batchSynced,
            updated: batchUpdated,
            created: batchCreated,
          });

          totalProcessed += externalBatch.licenses.length;
          page++;

          // Safety check to prevent infinite loops
          if (page > Math.ceil(totalExternalLicenses / batchSize) + 10) {
            logger.warn('Reached maximum page limit, stopping sync');
            break;
          }

        } catch (batchError) {
          logger.error(`Failed to process batch ${page}`, {
            error: batchError.message,
            offset,
            batchSize: currentBatchSize,
          });
          // Continue with next batch instead of failing completely
          page++;
        }
      }

      logger.info('Paginated sync completed successfully', {
        totalProcessed,
        totalSynced,
        totalUpdated,
        totalCreated,
      });

      return {
        syncedCount: totalSynced,
        updatedCount: totalUpdated,
        createdCount: totalCreated,
      };

    } catch (error) {
      logger.error('Paginated sync failed', {
        error: error.message,
        batchSize,
      });
      throw error;
    }
  }

  /**
   * Transform external license data robustly, handling edge cases and invalid data
   * @private
   */
  _transformExternalLicenseRobustly(externalLicense) {
    try {
      // Start with the standard transformation
      const baseData = this.externalLicenseRepository._externalToInternalFormat(externalLicense);

      // Apply additional sanitization and fallbacks for edge cases
      const sanitizedData = {
        ...baseData,
        // Ensure all required fields have fallbacks
        product: baseData.product || 'ABC Business Suite',
        dba: this._sanitizeString(baseData.dba) || `External License ${Date.now()}`,
        zip: this._sanitizeString(baseData.zip) || '',
        status: this._normalizeStatus(baseData.status),
        plan: baseData.plan || 'Basic',
        term: baseData.term || 'monthly',

        // Handle numeric fields with fallbacks
        lastPayment: this._sanitizeNumber(baseData.lastPayment) || 0,
        smsBalance: this._sanitizeNumber(baseData.smsBalance) || 0,
        seatsTotal: this._sanitizeNumber(baseData.seatsTotal) || 1,
        seatsUsed: this._sanitizeNumber(baseData.seatsUsed) || 0,
        agents: this._sanitizeNumber(baseData.agents) || 0,
        agentsCost: this._sanitizeNumber(baseData.agentsCost) || 0,

        // Handle date fields with fallbacks
        startsAt: this._sanitizeDate(baseData.startsAt) || new Date().toISOString().split('T')[0],
        lastActive: this._sanitizeDate(baseData.lastActive) || new Date().toISOString(),
        cancelDate: baseData.cancelDate ? this._sanitizeDate(baseData.cancelDate) : null,

        // Handle array fields
        agentsName: Array.isArray(baseData.agentsName) ? baseData.agentsName : [],

        // Handle notes
        notes: this._sanitizeString(baseData.notes) || '',

        // Preserve external identifiers even if malformed
        appid: externalLicense.appid,
        countid: externalLicense.countid,
        mid: externalLicense.mid,
        license_type: externalLicense.license_type,
        package_data: externalLicense.package,
        sendbat_workspace: externalLicense.sendbatWorkspace,
        coming_expired: externalLicense.comingExpired,

        // Mark as synced
        external_sync_status: 'synced',
        last_external_sync: new Date(),
      };

      // Additional validation and fixes
      if (sanitizedData.status === 'cancel' && !sanitizedData.cancelDate) {
        sanitizedData.cancelDate = sanitizedData.lastActive;
      }

      return sanitizedData;
    } catch (error) {
      logger.error('Failed to transform external license robustly, using minimal fallback', {
        error: error.message,
        externalData: JSON.stringify(externalLicense).substring(0, 200) + '...',
      });

      // Ultimate fallback - create minimal valid license data
      return {
        product: 'ABC Business Suite',
        dba: `External License ${Date.now()}`,
        zip: '',
        status: 'pending',
        plan: 'Basic',
        term: 'monthly',
        lastPayment: 0,
        smsBalance: 0,
        seatsTotal: 1,
        seatsUsed: 0,
        agents: 0,
        agentsName: [],
        agentsCost: 0,
        startsAt: new Date().toISOString().split('T')[0],
        lastActive: new Date().toISOString(),
        cancelDate: null,
        notes: 'Created from malformed external data',

        // Store whatever identifiers we can
        appid: externalLicense.appid,
        countid: externalLicense.countid,
        mid: externalLicense.mid,

        external_sync_status: 'synced',
        last_external_sync: new Date(),
      };
    }
  }

  /**
   * Generate a unique license key to prevent conflicts
   * @private
   */
  _generateUniqueLicenseKey(externalLicense) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);

    // Create key from available identifiers
    const identifiers = [
      externalLicense.appid,
      externalLicense.countid,
      externalLicense.mid,
      externalLicense.emailLicense,
    ].filter(id => id != null && id !== undefined && id !== '');

    const identifierString = identifiers.length > 0 ? identifiers.join('-') : 'unknown';

    // Create a unique key that's URL-safe and database-friendly
    const key = `EXT-${identifierString}-${timestamp}-${random}`.substring(0, 100);

    return key;
  }

  /**
   * Sanitize string values
   * @private
   */
  _sanitizeString(value) {
    if (value == null) return '';
    const str = String(value).trim();
    // Remove null bytes and other problematic characters
    return str.replace(/\0/g, '').substring(0, 255);
  }

  /**
   * Sanitize numeric values
   * @private
   */
  _sanitizeNumber(value) {
    const num = Number(value);
    return isNaN(num) ? 0 : Math.max(0, num);
  }

  /**
   * Sanitize date values
   * @private
   */
  _sanitizeDate(value) {
    if (!value) return null;

    try {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        return new Date().toISOString();
      }
      return date.toISOString();
    } catch (error) {
      return new Date().toISOString();
    }
  }

  /**
   * Normalize license status values
   * @private
   */
  _normalizeStatus(status) {
    if (!status) return 'pending';

    const statusStr = String(status).toLowerCase().trim();

    // Handle various status representations
    if (['active', '1', 'true', 'yes'].includes(statusStr)) return 'active';
    if (['cancel', 'cancelled', 'inactive', '0', 'false', 'no'].includes(statusStr)) return 'cancel';
    if (['pending', 'suspended', 'trial'].includes(statusStr)) return statusStr;

    // Default to pending for unknown statuses
    return 'pending';
  }

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