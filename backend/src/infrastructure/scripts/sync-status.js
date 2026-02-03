#!/usr/bin/env node

/**
 * Sync Status Checker Script
 * Checks the current status of license synchronization
 */

import { awilixContainer } from '../../shared/kernel/container.js';
import logger from '../config/logger.js';

async function checkSyncStatus() {
  try {
    logger.info('Checking license sync status...');

    // Get the sync use case from container
    const syncUseCase = await awilixContainer.getSyncExternalLicensesUseCase();

    if (!syncUseCase) {
      logger.warn('Sync use case not available');
      return;
    }

    // Get sync status
    const status = await syncUseCase.getSyncStatus();

    logger.info('Sync Status');

    if (status.success) {
      logger.info('Sync system is operational');

      // Internal sync stats
      if (status.internal) {
        logger.info('Internal database', {
          totalLicenses: status.internal.totalLicenses ?? 'N/A',
          lastSync: status.internal.lastSync ?? 'Never',
          syncStatus: status.internal.syncStatus ?? 'Unknown',
        });
      }

      // External API health
      if (status.external) {
        logger.info('External API', {
          healthy: status.external.healthy,
          lastHealthCheck: status.external.lastHealthCheck ?? 'Never',
          error: status.external.error,
        });
      }

      // Overall sync info
      if (status.lastSync) {
        logger.info('Last sync', {
          timestamp: status.lastSync.timestamp ?? 'N/A',
          durationMs: status.lastSync.duration ?? 'N/A',
          totalProcessed: status.lastSync.totalProcessed ?? 'N/A',
          successRate: status.lastSync.successRate ?? 'N/A',
        });
      }
    } else {
      logger.error('Sync system error', { error: status.error });
    }

    if (!status.external?.healthy) {
      logger.info('Recommendations: Check external API connectivity and EXTERNAL_LICENSE_API_KEY');
    }
    if (
      !status.lastSync ||
      Date.now() - new Date(status.lastSync.timestamp) > 24 * 60 * 60 * 1000
    ) {
      logger.info('Recommendations: Consider running a sync (npm run sync:start)');
    }
  } catch (error) {
    logger.error('Sync status check failed', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  checkSyncStatus();
}

export { checkSyncStatus };
