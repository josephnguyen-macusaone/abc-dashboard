#!/usr/bin/env node

/**
 * Sync Test Connectivity Script
 * Tests connection to the external license API
 */

import { ExternalLicenseApiService } from '../../shared/services/external-license-api-service.js';
import logger from '../config/logger.js';

async function testConnectivity() {
  try {
    const service = new ExternalLicenseApiService();
    const result = await service.testConnectivity();

    if (result.success) {
      logger.info('Connectivity test passed', {
        success: result.success,
        message: result.message,
        details: result,
      });
      process.exit(0);
    } else {
      logger.warn('Connectivity test failed', {
        success: result.success,
        message: result.message,
        details: result,
      });
      process.exit(1);
    }
  } catch (error) {
    logger.error('Connectivity test error', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testConnectivity();
}

export { testConnectivity };
