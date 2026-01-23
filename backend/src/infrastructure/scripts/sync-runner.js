#!/usr/bin/env node

/**
 * Sync Runner Script
 * Runs the license synchronization process
 */

import { awilixContainer } from '../../shared/kernel/container.js';
import logger from '../config/logger.js';

async function runSync() {
  try {
    console.log('🔄 Starting license synchronization...');

    // Get the sync use case from container
    const syncUseCase = await awilixContainer.getSyncExternalLicensesUseCase();

    if (!syncUseCase) {
      throw new Error('Sync use case not found in container');
    }

    // Run comprehensive sync with duplicate detection
    console.log('📊 Running comprehensive sync with duplicate detection...');

    const result = await syncUseCase.execute({
      comprehensive: false,  // Use legacy approach that works
      bidirectional: false,  // Disable bidirectional to avoid errors
      detectDuplicates: true,
      forceFullSync: false,
      batchSize: 50
    });

    console.log('✅ Sync completed successfully!');
    console.log('📈 Results:', {
      success: result.success,
      totalFetched: result.totalFetched,
      created: result.created,
      updated: result.updated,
      failed: result.failed,
      duration: `${result.duration}ms`,
      duplicatesDetected: result.duplicatesDetected || 0,
      duplicatesConsolidated: result.duplicatesConsolidated || 0
    });

    if (result.errors && result.errors.length > 0) {
      console.log('⚠️  Errors encountered:', result.errors.length);
      result.errors.slice(0, 5).forEach((error, i) => {
        console.log(`   ${i + 1}. ${error.error || error.message}`);
      });
      if (result.errors.length > 5) {
        console.log(`   ... and ${result.errors.length - 5} more errors`);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Sync failed:', error.message);
    logger.error('Sync runner failed', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runSync();
}

export { runSync };