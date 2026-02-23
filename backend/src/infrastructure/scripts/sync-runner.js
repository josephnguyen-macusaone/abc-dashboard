#!/usr/bin/env node

/**
 * Sync Runner Script
 * Runs the license synchronization process
 */

import { awilixContainer } from '../../shared/kernel/container.js';
import logger from '../config/logger.js';

async function runSync() {
  try {
    logger.info('Starting license synchronization...');

    // Get the sync use case from container
    const syncUseCase = await awilixContainer.getSyncExternalLicensesUseCase();

    if (!syncUseCase) {
      throw new Error('Sync use case not found in container');
    }

    // Run comprehensive sync with duplicate detection
    logger.info('Running comprehensive sync with duplicate detection...');

    const limit = process.env.SYNC_LIMIT ? parseInt(process.env.SYNC_LIMIT, 10) : undefined;
    const maxPages = process.env.SYNC_MAX_PAGES
      ? parseInt(process.env.SYNC_MAX_PAGES, 10)
      : undefined;

    const result = await syncUseCase.execute({
      comprehensive: true, // Use new robust paginated approach
      bidirectional: false, // Disable bidirectional to avoid errors
      detectDuplicates: true,
      forceFullSync: false,
      batchSize: 15, // Reduced from 25 to avoid pool exhaustion
      ...(limit != null && limit > 0 && { limit }),
      ...(maxPages != null && maxPages > 0 && { maxPages }),
    });

    logger.info('Sync completed successfully', {
      success: result.success,
      totalFetched: result.totalFetched,
      created: result.created,
      updated: result.updated,
      failed: result.failed,
      duration: result.duration,
      duplicatesDetected: result.duplicatesDetected || 0,
      duplicatesConsolidated: result.duplicatesConsolidated || 0,
    });

    if (result.errors && result.errors.length > 0) {
      logger.warn('Errors encountered during sync', {
        count: result.errors.length,
        sample: result.errors.slice(0, 5).map((e) => e.error || e.message),
      });
      result.errors.slice(0, 5).forEach((error, i) => {
        logger.warn(`Sync error ${i + 1}`, { error: error.error || error.message });
      });
      if (result.errors.length > 5) {
        logger.warn(`... and ${result.errors.length - 5} more errors`);
      }
    }

    process.exit(0);
  } catch (error) {
    logger.error('Sync runner failed', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runSync();
}

export { runSync };
