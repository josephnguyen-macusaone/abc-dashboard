#!/usr/bin/env node

/**
 * Sync Connectivity Check Script
 * Checks connectivity to the external license API.
 */

import { ExternalLicenseApiService } from '../../shared/services/external-license-api-service.js';
import logger from '../../shared/utils/logger.js';

async function checkSyncConnectivity() {
  try {
    const service = new ExternalLicenseApiService();
    const result = await service.testConnectivity();

    if (result.success) {
      logger.info('Connectivity check passed', {
        success: result.success,
        message: result.message,
        details: result,
      });
      process.exit(0);
    } else {
      logger.warn('Connectivity check failed', {
        success: result.success,
        message: result.message,
        details: result,
      });
      process.exit(1);
    }
  } catch (error) {
    logger.error('Connectivity check error', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  checkSyncConnectivity();
}

export { checkSyncConnectivity };
