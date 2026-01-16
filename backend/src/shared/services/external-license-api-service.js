import { config } from '../../infrastructure/config/config.js';
import logger from '../../infrastructure/config/logger.js';
import { withServiceRetry, withTimeout, TimeoutPresets } from '../utils/reliability/retry.js';
import { withCircuitBreaker } from '../utils/reliability/circuit-breaker.js';
import { executeWithDegradation } from '../utils/reliability/graceful-degradation.js';
import {
  ExternalServiceUnavailableException,
  NetworkTimeoutException,
  ValidationException,
} from '../../domain/exceptions/domain.exception.js';

/**
 * External License API Service
 * Client for interacting with the external license management API
 *
 * API Base URL: http://155.138.247.131:2341
 * Authentication: x-api-key header
 */
export class ExternalLicenseApiService {
  constructor() {
    this.baseUrl = 'http://155.138.247.131:2341';
    this.apiKey = 'Egyy3C2fJ2Fx3006iQ5jfN79139NAwgEIBF6O8ek7CtYr8M49IBIwOXGpig671Z6BIOO2NaRAYgXAkgyc2LknzEkPlBszad0eOgYjOzYGcwL8ucjWu7uN4TwOF2joDd1';
    this.correlationId = null;
    this.operationId = null;
    this.isHealthy = true;
    this.lastHealthCheck = null;
    this.defaultTimeout = TimeoutPresets.SLOW; // 30 seconds for external API calls
  }

  /**
   * Set correlation ID for request tracing
   */
  setCorrelationId(correlationId) {
    this.correlationId = correlationId;
    this.operationId = correlationId ? `${correlationId}_external_license_api` : null;
  }

  /**
   * Create authenticated headers
   */
  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
      'User-Agent': 'ABC-Dashboard-Backend/1.0',
    };
  }

  /**
   * Make authenticated HTTP request with retry logic
   */
  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const requestOptions = {
      method: options.method || 'GET',
      headers: this.getHeaders(),
      ...options,
    };

    // Add body if provided
    if (options.body) {
      requestOptions.body = JSON.stringify(options.body);
    }

    const operationName = `external_license_api_${options.method || 'GET'}_${endpoint.replace(/\//g, '_').replace(/^_/, '')}`;

    return withServiceRetry(
      async () => {
        return withTimeout(
          async () => {
            const startTime = Date.now();

            try {
              logger.debug('Making external API request', {
                correlationId: this.correlationId,
                url,
                method: requestOptions.method,
                headers: requestOptions.headers,
                operationName,
              });

              const response = await fetch(url, requestOptions);
              const duration = Date.now() - startTime;

              // Log response time
              logger.debug('External API response received', {
                correlationId: this.correlationId,
                url,
                status: response.status,
                duration: `${duration}ms`,
                operationName,
              });

              // Handle non-OK responses
              if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
              }

              // Parse JSON response
              const contentType = response.headers.get('content-type');
              if (contentType && contentType.includes('application/json')) {
                return await response.json();
              } else {
                return await response.text();
              }

            } catch (error) {
              logger.error('External API request failed', {
                correlationId: this.correlationId,
                url,
                method: requestOptions.method,
                error: error.message,
                duration: Date.now() - startTime,
                operationName,
              });
              throw error;
            }
          },
          this.defaultTimeout,
          operationName,
          {
            correlationId: this.correlationId,
            onTimeout: () => {
              logger.error('External API request timed out', {
                correlationId: this.correlationId,
                url,
                method: requestOptions.method,
                timeout: this.defaultTimeout,
                operationName,
              });
            },
          }
        );
      },
      {
        maxRetries: 5,
        retryDelay: 2000, // 2 seconds between retries
        retryOn: (error) => {
          // Retry on network errors, 5xx errors, and timeouts
          return error.message.includes('fetch') ||
                 error.message.includes('network') ||
                 error.message.includes('ECONNREFUSED') ||
                 error.message.includes('HTTP 5') ||
                 error.message.includes('timeout');
        },
        correlationId: this.correlationId,
        operationName,
      }
    );
  }

  /**
   * Health check for the external API
   */
  async healthCheck() {
    try {
      // Try a simple GET request to check if the API is responsive
      await this.makeRequest('/api/v1/licenses?page=1&limit=1');
      this.isHealthy = true;
      this.lastHealthCheck = new Date();
      return { healthy: true, timestamp: this.lastHealthCheck };
    } catch (error) {
      this.isHealthy = false;
      this.lastHealthCheck = new Date();
      logger.error('External license API health check failed', {
        correlationId: this.correlationId,
        error: error.message,
      });
      return {
        healthy: false,
        timestamp: this.lastHealthCheck,
        error: error.message
      };
    }
  }

  // ========================================================================
  // License CRUD Operations
  // ========================================================================

  /**
   * Get licenses with pagination, filtering, and sorting
   * @param {Object} options - Query options
   * @param {number} options.page - Page number (default: 1)
   * @param {number} options.limit - Items per page (default: 10, max: 100)
   * @param {number} options.status - Filter by status
   * @param {string} options.dba - Filter by DBA
   * @param {string} options.sortBy - Sort field
   * @param {string} options.sortOrder - Sort order (asc/desc)
   */
  async getLicenses(options = {}) {
    const params = new URLSearchParams();

    if (options.page) params.append('page', options.page.toString());
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.status !== undefined) params.append('status', options.status.toString());
    if (options.dba) params.append('dba', options.dba);
    if (options.sortBy) params.append('sortBy', options.sortBy);
    if (options.sortOrder) params.append('sortOrder', options.sortOrder);

    const endpoint = `/api/v1/licenses?${params.toString()}`;

    return await this.makeRequest(endpoint);
  }

  /**
   * Get all licenses by fetching all pages
   * Handles pagination automatically for large datasets
   */
  async getAllLicenses(options = {}) {
    const allLicenses = [];
    let currentPage = 1;
    let hasNextPage = true;
    const batchSize = options.batchSize || 100; // Fetch in batches of 100

    logger.info('Starting bulk license fetch from external API', {
      correlationId: this.correlationId,
      batchSize,
    });

    while (hasNextPage) {
      try {
        const response = await this.getLicenses({
          ...options,
          page: currentPage,
          limit: batchSize,
        });

        if (response.data && Array.isArray(response.data)) {
          allLicenses.push(...response.data);

          logger.debug(`Fetched page ${currentPage}, got ${response.data.length} licenses`, {
            correlationId: this.correlationId,
            totalFetched: allLicenses.length,
          });

          // Check if there are more pages
          if (response.meta && response.meta.hasNext !== undefined) {
            hasNextPage = response.meta.hasNext;
          } else if (response.data.length < batchSize) {
            // If we got fewer items than requested, we've reached the end
            hasNextPage = false;
          }
        } else {
          hasNextPage = false;
        }

        currentPage++;

        // Safety check to prevent infinite loops
        if (currentPage > 1000) {
          logger.error('Too many pages, stopping bulk fetch to prevent infinite loop', {
            correlationId: this.correlationId,
            currentPage,
            totalFetched: allLicenses.length,
          });
          break;
        }

      } catch (error) {
        logger.error('Error fetching page during bulk operation', {
          correlationId: this.correlationId,
          page: currentPage,
          error: error.message,
        });
        throw error;
      }
    }

    logger.info('Completed bulk license fetch from external API', {
      correlationId: this.correlationId,
      totalFetched: allLicenses.length,
      pagesFetched: currentPage - 1,
    });

    return {
      success: true,
      data: allLicenses,
      total: allLicenses.length,
      meta: {
        fetchedAt: new Date(),
        pagesFetched: currentPage - 1,
      },
    };
  }

  /**
   * Get single license by appid
   */
  async getLicenseByAppId(appid) {
    if (!appid) {
      throw new ValidationException('App ID is required');
    }

    return await this.makeRequest(`/api/v1/licenses/${encodeURIComponent(appid)}`);
  }

  /**
   * Get license by email
   */
  async getLicenseByEmail(email) {
    if (!email) {
      throw new ValidationException('Email is required');
    }

    return await this.makeRequest(`/api/v1/licenses/email/${encodeURIComponent(email)}`);
  }

  /**
   * Get license by countid
   */
  async getLicenseByCountId(countid) {
    if (!countid) {
      throw new ValidationException('Count ID is required');
    }

    return await this.makeRequest(`/api/v1/licenses/countid/${countid}`);
  }

  /**
   * Create new license
   */
  async createLicense(licenseData) {
    if (!licenseData || !licenseData.emailLicense || !licenseData.pass) {
      throw new ValidationException('License data with emailLicense and pass is required');
    }

    return await this.makeRequest('/api/v1/licenses', {
      method: 'POST',
      body: licenseData,
    });
  }

  /**
   * Update license by appid
   */
  async updateLicenseByAppId(appid, updates) {
    if (!appid) {
      throw new ValidationException('App ID is required');
    }
    if (!updates) {
      throw new ValidationException('Update data is required');
    }

    return await this.makeRequest(`/api/v1/licenses/${encodeURIComponent(appid)}`, {
      method: 'PUT',
      body: updates,
    });
  }

  /**
   * Update license by email
   */
  async updateLicenseByEmail(email, updates) {
    if (!email) {
      throw new ValidationException('Email is required');
    }
    if (!updates) {
      throw new ValidationException('Update data is required');
    }

    return await this.makeRequest(`/api/v1/licenses/email/${encodeURIComponent(email)}`, {
      method: 'PUT',
      body: updates,
    });
  }

  /**
   * Delete license by appid
   */
  async deleteLicenseByAppId(appid) {
    if (!appid) {
      throw new ValidationException('App ID is required');
    }

    return await this.makeRequest(`/api/v1/licenses/${encodeURIComponent(appid)}`, {
      method: 'DELETE',
    });
  }

  /**
   * Delete license by email
   */
  async deleteLicenseByEmail(email) {
    if (!email) {
      throw new ValidationException('Email is required');
    }

    return await this.makeRequest(`/api/v1/licenses/email/${encodeURIComponent(email)}`, {
      method: 'DELETE',
    });
  }

  /**
   * Delete license by countid
   */
  async deleteLicenseByCountId(countid) {
    if (!countid) {
      throw new ValidationException('Count ID is required');
    }

    return await this.makeRequest(`/api/v1/licenses/countid/${countid}`, {
      method: 'DELETE',
    });
  }

  // ========================================================================
  // Bulk Operations
  // ========================================================================

  /**
   * Bulk create licenses
   */
  async bulkCreateLicenses(licensesData) {
    if (!Array.isArray(licensesData) || licensesData.length === 0) {
      throw new ValidationException('Licenses data array is required');
    }

    // Validate each license has required fields
    for (let i = 0; i < licensesData.length; i++) {
      const license = licensesData[i];
      if (!license.emailLicense || !license.pass) {
        throw new ValidationException(`License at index ${i} missing required fields: emailLicense and/or pass`);
      }
    }

    // Process in batches to avoid overwhelming the API
    const batchSize = 50;
    const results = [];
    const errors = [];

    for (let i = 0; i < licensesData.length; i += batchSize) {
      const batch = licensesData.slice(i, i + batchSize);

      logger.debug(`Processing bulk create batch ${Math.floor(i / batchSize) + 1}`, {
        correlationId: this.correlationId,
        batchSize: batch.length,
        totalProcessed: i,
        totalRemaining: licensesData.length - i,
      });

      try {
        // Note: This assumes the external API supports bulk operations
        // If not, we'll need to create licenses one by one
        const batchResults = await Promise.allSettled(
          batch.map(licenseData => this.createLicense(licenseData))
        );

        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            errors.push({
              index: i + index,
              data: batch[index],
              error: result.reason.message,
            });
          }
        });

      } catch (error) {
        logger.error('Bulk create batch failed', {
          correlationId: this.correlationId,
          batchStart: i,
          batchEnd: Math.min(i + batchSize, licensesData.length),
          error: error.message,
        });

        // Add all items in this batch as errors
        batch.forEach((licenseData, index) => {
          errors.push({
            index: i + index,
            data: licenseData,
            error: error.message,
          });
        });
      }
    }

    return {
      success: results.length > 0,
      results,
      errors,
      totalProcessed: results.length + errors.length,
      successCount: results.length,
      errorCount: errors.length,
    };
  }

  /**
   * Bulk update licenses
   */
  async bulkUpdateLicenses(updates) {
    if (!Array.isArray(updates) || updates.length === 0) {
      throw new ValidationException('Updates array is required');
    }

    // Process in batches to avoid overwhelming the API
    const batchSize = 25; // Smaller batch for updates
    const results = [];
    const errors = [];

    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);

      logger.debug(`Processing bulk update batch ${Math.floor(i / batchSize) + 1}`, {
        correlationId: this.correlationId,
        batchSize: batch.length,
        totalProcessed: i,
        totalRemaining: updates.length - i,
      });

      try {
        const batchResults = await Promise.allSettled(
          batch.map(({ appid, updates: updateData }) =>
            this.updateLicenseByAppId(appid, updateData)
          )
        );

        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            errors.push({
              index: i + index,
              appid: batch[index].appid,
              updates: batch[index].updates,
              error: result.reason.message,
            });
          }
        });

      } catch (error) {
        logger.error('Bulk update batch failed', {
          correlationId: this.correlationId,
          batchStart: i,
          batchEnd: Math.min(i + batchSize, updates.length),
          error: error.message,
        });

        // Add all items in this batch as errors
        batch.forEach((update, index) => {
          errors.push({
            index: i + index,
            appid: update.appid,
            updates: update.updates,
            error: error.message,
          });
        });
      }
    }

    return {
      success: results.length > 0,
      results,
      errors,
      totalProcessed: results.length + errors.length,
      successCount: results.length,
      errorCount: errors.length,
    };
  }

  /**
   * Bulk delete licenses
   */
  async bulkDeleteLicenses(identifiers) {
    if (!Array.isArray(identifiers) || identifiers.length === 0) {
      throw new ValidationException('Identifiers array is required');
    }

    // Process in batches to avoid overwhelming the API
    const batchSize = 25;
    const results = [];
    const errors = [];

    for (let i = 0; i < identifiers.length; i += batchSize) {
      const batch = identifiers.slice(i, i + batchSize);

      logger.debug(`Processing bulk delete batch ${Math.floor(i / batchSize) + 1}`, {
        correlationId: this.correlationId,
        batchSize: batch.length,
        totalProcessed: i,
        totalRemaining: identifiers.length - i,
      });

      try {
        const batchResults = await Promise.allSettled(
          batch.map(identifier => {
            // Support different identifier types
            if (identifier.appid) {
              return this.deleteLicenseByAppId(identifier.appid);
            } else if (identifier.email) {
              return this.deleteLicenseByEmail(identifier.email);
            } else if (identifier.countid) {
              return this.deleteLicenseByCountId(identifier.countid);
            } else {
              throw new ValidationException('Invalid identifier: must have appid, email, or countid');
            }
          })
        );

        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push({ identifier: batch[index], result: result.value });
          } else {
            errors.push({
              index: i + index,
              identifier: batch[index],
              error: result.reason.message,
            });
          }
        });

      } catch (error) {
        logger.error('Bulk delete batch failed', {
          correlationId: this.correlationId,
          batchStart: i,
          batchEnd: Math.min(i + batchSize, identifiers.length),
          error: error.message,
        });

        // Add all items in this batch as errors
        batch.forEach((identifier, index) => {
          errors.push({
            index: i + index,
            identifier,
            error: error.message,
          });
        });
      }
    }

    return {
      success: results.length > 0,
      results,
      errors,
      totalProcessed: results.length + errors.length,
      successCount: results.length,
      errorCount: errors.length,
    };
  }

  // ========================================================================
  // Utility Methods
  // ========================================================================

  /**
   * Get API information and capabilities
   */
  async getApiInfo() {
    try {
      const health = await this.healthCheck();
      return {
        baseUrl: this.baseUrl,
        healthy: health.healthy,
        lastHealthCheck: health.timestamp,
        supportedEndpoints: [
          'GET /api/v1/licenses',
          'POST /api/v1/licenses',
          'GET /api/v1/licenses/{appid}',
          'PUT /api/v1/licenses/{appid}',
          'DELETE /api/v1/licenses/{appid}',
          'GET /api/v1/licenses/email/{email}',
          'PUT /api/v1/licenses/email/{email}',
          'DELETE /api/v1/licenses/email/{email}',
          'GET /api/v1/licenses/countid/{countid}',
          'DELETE /api/v1/licenses/countid/{countid}',
        ],
        features: [
          'Pagination support',
          'Filtering by status, dba',
          'Sorting capabilities',
          'Bulk operations',
          'Multiple identifier types (appid, email, countid)',
        ],
      };
    } catch (error) {
      return {
        baseUrl: this.baseUrl,
        healthy: false,
        error: error.message,
        supportedEndpoints: [],
        features: [],
      };
    }
  }
}

// Export singleton instance
export const externalLicenseApiService = new ExternalLicenseApiService();