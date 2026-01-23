#!/usr/bin/env node

/**
 * Sync Status Checker Script
 * Checks the current status of license synchronization
 */

import { awilixContainer } from '../../shared/kernel/container.js';
import logger from '../config/logger.js';

async function checkSyncStatus() {
  try {
    console.log('🔍 Checking license sync status...');

    // Get the sync use case from container
    const syncUseCase = await awilixContainer.getSyncExternalLicensesUseCase();

    if (!syncUseCase) {
      console.log('⚠️  Sync use case not available');
      return;
    }

    // Get sync status
    const status = await syncUseCase.getSyncStatus();

    console.log('📊 Sync Status:');
    console.log('===============');

    if (status.success) {
      console.log('✅ Sync system is operational');

      // Internal sync stats
      if (status.internal) {
        console.log('\n🏠 Internal Database:');
        console.log(`   Total Licenses: ${status.internal.totalLicenses || 'N/A'}`);
        console.log(`   Last Sync: ${status.internal.lastSync || 'Never'}`);
        console.log(`   Sync Status: ${status.internal.syncStatus || 'Unknown'}`);
      }

      // External API health
      if (status.external) {
        console.log('\n🌐 External API:');
        console.log(`   Healthy: ${status.external.healthy ? '✅' : '❌'}`);
        console.log(`   Last Check: ${status.external.lastHealthCheck || 'Never'}`);
        if (status.external.error) {
          console.log(`   Error: ${status.external.error}`);
        }
      }

      // Overall sync info
      if (status.lastSync) {
        console.log('\n⏰ Last Sync:');
        console.log(`   Completed: ${status.lastSync.timestamp || 'N/A'}`);
        console.log(`   Duration: ${status.lastSync.duration || 'N/A'}ms`);
        console.log(`   Records Processed: ${status.lastSync.totalProcessed || 'N/A'}`);
        console.log(`   Success Rate: ${status.lastSync.successRate || 'N/A'}%`);
      }

    } else {
      console.log('❌ Sync system error:', status.error);
    }

    console.log('\n💡 Recommendations:');
    if (!status.external?.healthy) {
      console.log('   - Check external API connectivity');
      console.log('   - Verify EXTERNAL_LICENSE_API_KEY environment variable');
    }
    if (!status.lastSync || Date.now() - new Date(status.lastSync.timestamp) > 24 * 60 * 60 * 1000) {
      console.log('   - Consider running a sync (npm run sync:start)');
    }

  } catch (error) {
    console.error('❌ Failed to check sync status:', error.message);
    logger.error('Sync status check failed', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  checkSyncStatus();
}

export { checkSyncStatus };