import { licenseSyncConfig } from '../../infrastructure/config/license-sync-config.js';
import { externalLicenseValidator } from '../utils/validation/external-license-validator.js';
import { licenseSyncMonitor } from '../../infrastructure/monitoring/license-sync-monitor.js';
import logger from '../../infrastructure/config/logger.js';
import { withServiceRetry, withTimeout } from '../utils/reliability/retry.js';
import { ValidationException } from '../../domain/exceptions/domain.exception.js';

/** ANSI: dark grey for error-detail in logs (terminal only; harmless in file/JSON) */
const ANSI_DIM = '\x1b[90m';
const ANSI_RESET = '\x1b[0m';

/**
 * External License API Service
 * Client for interacting with the external license management API
 *
 * API Base URL: Configurable via LICENSE_SYNC_CONFIG
 * Authentication: x-api-key header
 */
export class ExternalLicenseApiService {
  constructor() {
    this.baseUrl = licenseSyncConfig.external.baseUrl;
    this.apiKey = licenseSyncConfig.external.apiKey;
    this.correlationId = null;
    this.operationId = null;
    this.isHealthy = true;
    this.lastHealthCheck = null;
    this.defaultTimeout = licenseSyncConfig.external.timeout;
    this._validated = false; // Lazy validation flag
  }

  /**
   * Validate configuration before making API calls
   * This allows environment variables to be loaded first
   */
  _validateConfig() {
    if (this._validated) {
      return;
    } // Only validate once

    if (!this.apiKey) {
      throw new Error('EXTERNAL_LICENSE_API_KEY environment variable is required');
    }

    if (!this.baseUrl) {
      throw new Error('EXTERNAL_LICENSE_API_URL environment variable is required');
    }

    this._validated = true;
  }

  /**
   * Set correlation ID for request tracing
   */
  setCorrelationId(correlationId) {
    this.correlationId = correlationId;
    this.operationId = correlationId ? `${correlationId}_external_license_api` : null;
  }

  /**
   * Test basic connectivity to external API
   */
  async testConnectivity() {
    this._validateConfig();

    try {
      logger.info('Testing external API connectivity', {
        baseUrl: this.baseUrl,
        correlationId: this.correlationId,
      });

      // Try a simple GET request to the base API endpoint
      const testResponse = await this.makeRequest(
        '/api/v1/licenses?page=1&limit=1',
        'GET',
        null,
        'connectivity_test'
      );

      logger.info('External API connectivity test successful', {
        correlationId: this.correlationId,
        responseType: typeof testResponse,
        hasData: !!(testResponse && testResponse.data),
        dataIsArray: Array.isArray(testResponse?.data),
        hasMeta: !!(testResponse && testResponse.meta),
      });

      return { success: true, response: testResponse };
    } catch (error) {
      logger.error('External API connectivity test failed', {
        correlationId: this.correlationId,
        error: error.message,
        baseUrl: this.baseUrl,
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Create authenticated headers
   */
  getHeaders(includeContentType = false) {
    const headers = {
      'x-api-key': this.apiKey,
      'User-Agent': licenseSyncConfig.external.userAgent,
    };

    if (includeContentType) {
      headers['Content-Type'] = 'application/json';
    }

    return headers;
  }

  /**
   * Build URL, request options, and operation name for makeRequest
   */
  _buildRequestConfig(endpoint, options) {
    const url = `${this.baseUrl}${endpoint}`;
    const hasBody = options.body !== undefined;
    const requestOptions = {
      method: options.method || 'GET',
      headers: this.getHeaders(hasBody),
      ...options,
    };
    if (hasBody) {
      requestOptions.body = JSON.stringify(options.body);
    }
    const operationName = `external_license_api_${options.method || 'GET'}_${endpoint.replace(/\//g, '_').replace(/^_/, '')}`;
    return { url, requestOptions, operationName };
  }

  /**
   * Handle non-OK HTTP response: parse error text, log, record metric, throw
   */
  async _handleNonOkResponse(response, requestOptions, endpoint, url) {
    let errorText;
    try {
      errorText = await response.text();
    } catch (textError) {
      errorText = 'Unable to read error response';
    }

    const isServerParseError =
      response.status === 500 &&
      (errorText.includes('Expecting value') ||
        errorText.includes('Unexpected token') ||
        errorText.includes('Invalid JSON'));
    if (!isServerParseError) {
      logger.error('External API returned error response', {
        correlationId: this.correlationId,
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
        contentLength: response.headers.get('content-length'),
        errorPreview: errorText.substring(0, 1000),
        url,
        looksLikeHtml:
          errorText.toLowerCase().includes('<html') ||
          errorText.toLowerCase().includes('<!doctype'),
        isJsonError: errorText.trim().startsWith('{') && errorText.includes('"success":false'),
        isMalformedJsonError:
          errorText.includes('Expecting value') ||
          errorText.includes('Unexpected token') ||
          errorText.includes('Invalid JSON'),
      });
    }

    const err = new Error(
      isServerParseError
        ? `HTTP 500: External API server error (parse error); skipping page`
        : `HTTP ${response.status}: ${errorText}`
    );
    licenseSyncMonitor.recordApiError(endpoint, requestOptions.method, err);
    throw err;
  }

  /**
   * Parse response body (JSON or text with JSON fallback)
   */
  async _parseApiResponse(response, url) {
    const contentType = response.headers.get('content-type');
    try {
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      const textData = await response.text();
      try {
        const parsed = JSON.parse(textData);
        logger.warn('Parsed JSON from non-JSON content-type response', {
          correlationId: this.correlationId,
          contentType,
          url,
        });
        return parsed;
      } catch (parseError) {
        const isJsonError =
          textData.includes('Expecting value') ||
          textData.includes('Unexpected token') ||
          textData.includes('Invalid JSON') ||
          textData.includes('Unexpected end of JSON input') ||
          textData.includes('Bad control character') ||
          (textData.trim().startsWith('<') && textData.includes('html'));

        if (isJsonError) {
          logger.error('External API returned malformed response, not retrying', {
            correlationId: this.correlationId,
            parseError: parseError.message,
            responseType: contentType,
            textPreview: textData.substring(0, 200),
            url,
          });

          if (response.status === 500 && textData.includes('Expecting value')) {
            logger.warn(
              'External API server error - likely malformed data in their database, skipping this record',
              { correlationId: this.correlationId, url, errorMessage: textData }
            );
            return null;
          }

          throw new ValidationException(`Malformed API response: ${parseError.message}`);
        }

        return textData;
      }
    } catch (parseError) {
      const errorText = await response.text().catch(() => 'Unable to read response text');
      logger.error('Failed to parse external API response', {
        correlationId: this.correlationId,
        error: parseError.message,
        contentType,
        responsePreview: errorText.substring(0, 200),
        url,
      });
      throw new Error(`Failed to parse API response: ${parseError.message}`);
    }
  }

  /**
   * Check for success:false with server/parse error; return null to skip, else return data
   */
  _checkSuccessFalseParseError(responseData, response, endpoint, requestOptions) {
    const msg = responseData?.message;
    const isSuccessFalseParseError =
      response.ok &&
      responseData &&
      responseData.success === false &&
      typeof msg === 'string' &&
      (msg.includes('Expecting value') ||
        msg.includes('Unexpected token') ||
        msg.includes('Invalid JSON') ||
        msg.includes('Internal server error'));

    if (isSuccessFalseParseError) {
      logger.debug('External API returned success:false with server/parse error; skipping page', {
        correlationId: this.correlationId,
        url: `${this.baseUrl}${endpoint}`,
        messagePreview: msg.substring(0, 120),
      });
      licenseSyncMonitor.recordApiError(endpoint, requestOptions.method, new Error(msg));
      return null;
    }
    return responseData;
  }

  /**
   * Execute fetch and process response (used inside withTimeout)
   */
  async _executeFetch(url, requestOptions, operationName, endpoint) {
    const startTime = Date.now();

    try {
      if (licenseSyncConfig.monitoring.enableDetailedLogging) {
        logger.debug('Making external API request', {
          correlationId: this.correlationId,
          url,
          method: requestOptions.method,
          operationName,
        });
      }

      const response = await fetch(url, requestOptions);
      const duration = Date.now() - startTime;

      licenseSyncMonitor.recordApiRequest(endpoint, requestOptions.method, startTime);

      if (licenseSyncConfig.monitoring.enableDetailedLogging) {
        logger.debug('External API response received', {
          correlationId: this.correlationId,
          status: response.status,
          duration: `${duration}ms`,
          operationName,
        });
      }

      if (!response.ok) {
        await this._handleNonOkResponse(response, requestOptions, endpoint, url);
      }

      const responseData = await this._parseApiResponse(response, url);
      if (responseData === null) {
        return null;
      }

      const checked = this._checkSuccessFalseParseError(
        responseData,
        response,
        endpoint,
        requestOptions
      );
      return checked ?? responseData;
    } catch (error) {
      if (!error.message?.includes('skipping page')) {
        logger.error('External API request failed', {
          correlationId: this.correlationId,
          url,
          method: requestOptions.method,
          error: error.message,
          duration: Date.now() - startTime,
          operationName,
        });
      }
      throw error;
    }
  }

  /**
   * Make authenticated HTTP request with retry logic
   */
  async makeRequest(endpoint, options = {}) {
    this._validateConfig();

    const { url, requestOptions, operationName } = this._buildRequestConfig(endpoint, options);

    return withServiceRetry(
      async () =>
        withTimeout(
          async () => this._executeFetch(url, requestOptions, operationName, endpoint),
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
        ),
      {
        maxRetries: licenseSyncConfig.sync.retryAttempts,
        retryDelay: licenseSyncConfig.sync.retryDelay,
        retryOn: (error) => {
          const msg = error?.message || '';
          if (msg.includes('parse error') && msg.includes('skipping page')) {
            return false;
          }
          return (
            msg.includes('fetch') ||
            msg.includes('network') ||
            msg.includes('ECONNREFUSED') ||
            msg.includes('HTTP 5') ||
            msg.includes('timeout')
          );
        },
        correlationId: this.correlationId,
        operationName,
        silentNonRetryable: true,
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
        error: error.message,
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

    if (options.page) {
      params.append('page', options.page.toString());
    }
    if (options.limit) {
      params.append('limit', options.limit.toString());
    }
    if (options.status !== undefined) {
      params.append('status', options.status.toString());
    }
    if (options.dba) {
      params.append('dba', options.dba);
    }
    if (options.sortBy) {
      params.append('sortBy', options.sortBy);
    }
    if (options.sortOrder) {
      params.append('sortOrder', options.sortOrder);
    }

    const endpoint = `/api/v1/licenses?${params.toString()}`;

    return this.makeRequest(endpoint);
  }

  /**
   * Setup and validate options for bulk license fetch
   */
  _getAllLicensesSetup(options) {
    const batchSize = options.batchSize || licenseSyncConfig.sync.batchSize;
    const concurrencyLimit = Math.min(
      options.concurrencyLimit || licenseSyncConfig.sync.concurrencyLimit,
      licenseSyncConfig.sync.maxConcurrentBatches
    );
    const firstPageLimit =
      !options.maxPages && options.maxLicenses
        ? Math.min(batchSize, options.maxLicenses)
        : batchSize;

    if (
      options.maxLicenses &&
      options.maxLicenses > licenseSyncConfig.sync.maxLicensesForComprehensive
    ) {
      logger.warn('Requested license limit exceeds maximum allowed', {
        requested: options.maxLicenses,
        maximum: licenseSyncConfig.sync.maxLicensesForComprehensive,
      });
      options.maxLicenses = licenseSyncConfig.sync.maxLicensesForComprehensive;
    }

    return { batchSize, concurrencyLimit, firstPageLimit };
  }

  /**
   * Fetch first page and derive total pages from response
   */
  async _fetchFirstPageForBulk(options) {
    const firstResponse = await this.getLicenses({
      ...options,
      page: 1,
      limit: options.firstPageLimit,
    });

    if (!firstResponse.data || !Array.isArray(firstResponse.data)) {
      logger.error('Invalid response structure from external API', {
        correlationId: this.correlationId,
        hasData: !!firstResponse.data,
        dataType: typeof firstResponse.data,
        isArray: Array.isArray(firstResponse.data),
        responseKeys: Object.keys(firstResponse),
      });
      return { error: 'Failed to fetch first page - invalid response structure' };
    }

    // Always derive totalPages from meta.total (authoritative) so we use our batchSize.
    // meta.totalPages depends on the request limit; meta.total is the source of truth.
    let totalPages = 1;
    if (firstResponse.meta?.total !== null && firstResponse.meta.total > 0) {
      totalPages = Math.ceil(firstResponse.meta.total / options.batchSize);
    } else if (firstResponse.meta?.totalPages) {
      totalPages = firstResponse.meta.totalPages;
    } else {
      totalPages = 1000; // Safety limit
    }
    if (options.maxPages && options.maxPages > 0) {
      totalPages = Math.min(totalPages, options.maxPages);
    }

    return { firstResponse, totalPages };
  }

  /**
   * Create page fetch promise with error handling for bulk fetch
   */
  _createPageFetchPromise(pageNum, options, batchSize, state) {
    const maxConsecutiveErrors = 10;
    return this.getLicenses({
      ...options,
      page: pageNum,
      limit: batchSize,
    }).catch((error) => {
      state.consecutiveErrors++;
      state.failedPages.push({
        page: pageNum,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
      logger.error(
        `Error fetching page ${pageNum} ${ANSI_DIM}{ ${error.message} }${ANSI_RESET} skipping page`,
        {
          correlationId: this.correlationId,
          page: pageNum,
          error: error.message,
          consecutiveErrors: state.consecutiveErrors,
        }
      );
      if (state.consecutiveErrors >= maxConsecutiveErrors) {
        logger.error('Too many consecutive errors, stopping bulk fetch', {
          correlationId: this.correlationId,
          consecutiveErrors: state.consecutiveErrors,
          lastPageAttempted: pageNum,
          failedPages: state.failedPages.length,
        });
        throw new Error(
          `External API appears unreachable after ${state.consecutiveErrors} consecutive errors`
        );
      }
      return null;
    });
  }

  /**
   * Process a batch of page results and update state
   */
  _processPageBatchResults(pageResults, allLicenses, options, batchSize, pageBatchStart, state) {
    let hasMorePages = false;
    let pagesInThisBatch = 0;

    for (const response of pageResults) {
      pagesInThisBatch++;
      if (response === null) {
        logger.debug('Skipping null response (likely malformed data on external API)', {
          correlationId: this.correlationId,
          batchIndex:
            Math.floor((pageBatchStart + pagesInThisBatch - 1) / options.concurrencyLimit) + 1,
          pageInBatch: pagesInThisBatch,
        });
        continue;
      }

      if (response?.data && Array.isArray(response.data)) {
        state.consecutiveErrors = 0;

        if (response.data.length > 0) {
          try {
            allLicenses.push(...response.data);
            hasMorePages = true;
          } catch (spreadError) {
            logger.error('Failed to add licenses to array (spread syntax error)', {
              correlationId: this.correlationId,
              error: spreadError.message,
              dataType: typeof response.data,
              dataLength: response.data.length,
              pageBatchStart,
            });
            continue;
          }
          logger.debug(`Fetched page batch, total licenses: ${allLicenses.length}`, {
            correlationId: this.correlationId,
            pageBatchStart,
            batchSize: response.data.length,
          });

          if (allLicenses.length > licenseSyncConfig.sync.maxLicensesForComprehensive) {
            logger.warn('Reached maximum license limit, truncating results', {
              correlationId: this.correlationId,
              currentCount: allLicenses.length,
              maxAllowed: licenseSyncConfig.sync.maxLicensesForComprehensive,
            });
            allLicenses.splice(licenseSyncConfig.sync.maxLicensesForComprehensive);
            return { hasMorePages: false, pagesInThisBatch };
          }
          if (options.maxLicenses && allLicenses.length >= options.maxLicenses) {
            logger.info('Reached requested license limit, stopping pagination', {
              correlationId: this.correlationId,
              currentCount: allLicenses.length,
              requestedLimit: options.maxLicenses,
            });
            return { hasMorePages: false, pagesInThisBatch };
          }
        }
        if (response.data.length < batchSize) {
          hasMorePages = false;
          break;
        }
      }
    }

    return { hasMorePages, pagesInThisBatch };
  }

  /**
   * Fetch remaining pages in parallel batches
   */
  async _fetchRemainingPages(options, state) {
    const { batchSize, concurrencyLimit } = options;
    const { allLicenses, pagesFetched, failedPages } = state;
    const onFetchProgress = options.onFetchProgress;

    for (
      let pageBatchStart = 2;
      pageBatchStart <= state.totalPages;
      pageBatchStart += concurrencyLimit
    ) {
      const pageBatchEnd = Math.min(pageBatchStart + concurrencyLimit - 1, state.totalPages);
      const pct = Math.round((pageBatchStart / state.totalPages) * 100);

      if (typeof onFetchProgress === 'function') {
        onFetchProgress({
          phase: 'fetch',
          processed: pageBatchStart,
          total: state.totalPages,
          percent: pct,
        });
      }

      logger.info(
        `Fetching pages ${pageBatchStart}-${pageBatchEnd} of ${state.totalPages} (${pct}% complete)`,
        {
          correlationId: this.correlationId,
          totalLicensesFetched: allLicenses.length,
          pagesCompleted: pagesFetched,
          failedSoFar: failedPages.length,
        }
      );

      const pagePromises = [];
      for (let i = 0; i < concurrencyLimit && pageBatchStart + i <= state.totalPages; i++) {
        pagePromises.push(
          this._createPageFetchPromise(pageBatchStart + i, options, batchSize, state)
        );
      }

      const pageResults = await Promise.all(pagePromises);

      if (pageBatchStart + concurrencyLimit <= state.totalPages) {
        logger.debug(`⏸️  Pausing 2s before next batch...`, {
          correlationId: this.correlationId,
          nextBatch: pageBatchStart + concurrencyLimit,
        });
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      const result = this._processPageBatchResults(
        pageResults,
        allLicenses,
        { ...options, concurrencyLimit },
        batchSize,
        pageBatchStart,
        state
      );

      state.pagesFetched += result.pagesInThisBatch;

      if (!result.hasMorePages) {
        break;
      }
    }
  }

  /**
   * Validate licenses and build final response
   */
  _validateAndBuildBulkResponse(allLicenses, pagesFetched, failedPages) {
    let validatedLicenses = allLicenses;
    let validationSummary = null;

    if (licenseSyncConfig.validation.strictMode || allLicenses.length > 0) {
      logger.debug('Validating external license data', {
        correlationId: this.correlationId,
        licenseCount: allLicenses.length,
      });
      const validation = externalLicenseValidator.validateLicenses(allLicenses, {
        continueOnError: !licenseSyncConfig.validation.strictMode,
      });
      validatedLicenses = validation.validLicenses;
      validationSummary = {
        total: validation.total,
        valid: validation.valid,
        invalid: validation.invalid,
        validationErrors: validation.errors.slice(0, 10),
        totalErrors: validation.errors.length,
      };
      if (validation.invalid > 0) {
        logger.warn('External license data validation found issues', {
          correlationId: this.correlationId,
          validationSummary,
        });
        if (licenseSyncConfig.validation.strictMode) {
          throw new ValidationException(
            `External license data validation failed: ${validation.invalid} of ${validation.total} licenses invalid`
          );
        }
      }
    }

    return {
      success: true,
      data: validatedLicenses,
      total: validatedLicenses.length,
      meta: {
        fetchedAt: new Date(),
        pagesFetched,
        pagesWithErrors: failedPages.length,
        failedPages: failedPages.length > 0 ? failedPages : undefined,
        validation: validationSummary,
      },
    };
  }

  /**
   * Apply first-page limits and optionally fetch remaining pages
   */
  async _applyFirstPageLimitsAndFetchRemaining(options, state, batchSize, concurrencyLimit) {
    const hitLicenseLimit =
      !options.maxPages && options.maxLicenses && state.allLicenses.length >= options.maxLicenses;
    const hitPageLimit = options.maxPages && state.pagesFetched >= options.maxPages;

    if (hitLicenseLimit) {
      state.allLicenses.splice(options.maxLicenses);
      logger.info('Reached requested license limit after first page, stopping', {
        correlationId: this.correlationId,
        totalFetched: state.allLicenses.length,
        requestedLimit: options.maxLicenses,
      });
    } else if (!hitPageLimit) {
      await this._fetchRemainingPages({ ...options, batchSize, concurrencyLimit }, state);
    }

    if (options.maxLicenses && state.allLicenses.length > options.maxLicenses) {
      state.allLicenses.splice(options.maxLicenses);
    }
  }

  /**
   * Get all licenses by fetching all pages
   * Handles pagination automatically for large datasets with memory-efficient processing
   */
  async getAllLicenses(options = {}) {
    this._validateConfig();
    const setup = this._getAllLicensesSetup(options);
    const { batchSize, concurrencyLimit } = setup;

    const state = {
      allLicenses: [],
      pagesFetched: 0,
      consecutiveErrors: 0,
      failedPages: [],
    };

    logger.info('Starting bulk license fetch from external API', {
      correlationId: this.correlationId,
      batchSize,
      concurrencyLimit,
      ...(options.maxLicenses && { maxLicenses: options.maxLicenses }),
      ...(options.maxPages && { maxPages: options.maxPages }),
    });

    try {
      const firstResult = await this._fetchFirstPageForBulk({
        ...options,
        ...setup,
      });
      if (firstResult.error) {
        return {
          success: false,
          error: firstResult.error,
          meta: { pagesAttempted: 1, licensesFetched: 0 },
        };
      }

      const { firstResponse, totalPages } = firstResult;
      state.totalPages = totalPages;

      if (firstResponse.data.length > 0) {
        state.allLicenses.push(...firstResponse.data);
      }
      state.pagesFetched = 1;

      if (typeof options.onFetchProgress === 'function') {
        const pct = totalPages > 0 ? Math.round((1 / totalPages) * 100) : 0;
        options.onFetchProgress({
          phase: 'fetch',
          processed: 1,
          total: totalPages,
          percent: pct,
        });
      }

      logger.info('Bulk fetch info', {
        correlationId: this.correlationId,
        firstPageCount: firstResponse.data.length,
        estimatedTotalPages: totalPages,
        totalFetched: state.allLicenses.length,
        ...(options.maxPages && { maxPages: options.maxPages, cappedTo: totalPages }),
      });

      await this._applyFirstPageLimitsAndFetchRemaining(
        options,
        state,
        batchSize,
        concurrencyLimit
      );

      if (state.failedPages.length > 0) {
        logger.warn('Some pages failed to fetch during bulk sync', {
          correlationId: this.correlationId,
          failedPagesCount: state.failedPages.length,
          failedPages: state.failedPages.slice(0, 10),
          totalFailures: state.failedPages.length,
        });
      }

      logger.info('Completed bulk license fetch from external API', {
        correlationId: this.correlationId,
        totalFetched: state.allLicenses.length,
        pagesFetched: state.pagesFetched,
        pagesWithErrors: state.failedPages.length,
        successRate: `${(((state.pagesFetched - state.failedPages.length) / state.pagesFetched) * 100).toFixed(2)}%`,
      });

      return this._validateAndBuildBulkResponse(
        state.allLicenses,
        state.pagesFetched,
        state.failedPages
      );
    } catch (error) {
      logger.error('Bulk license fetch failed', {
        correlationId: this.correlationId,
        error: error.message,
      });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get single license by appid
   */
  async getLicenseByAppId(appid) {
    // Allow operations without appid for sync purposes
    // if (!appid) {
    //   throw new ValidationException('App ID is required for this operation');
    // }

    const response = await this.makeRequest(`/api/v1/licenses/${encodeURIComponent(appid)}`);

    // Validate single license if validation is enabled
    if (licenseSyncConfig.validation.strictMode && response) {
      const validation = externalLicenseValidator.validateLicense(response);
      if (!validation.isValid) {
        logger.warn('Single license validation failed', {
          correlationId: this.correlationId,
          appid,
          errors: validation.errors,
        });
        throw new ValidationException(`License validation failed: ${validation.errors.join(', ')}`);
      }
      return validation.sanitizedData;
    }

    return response;
  }

  /**
   * Get license by email
   */
  async getLicenseByEmail(email) {
    if (!email) {
      throw new ValidationException('Email is required');
    }

    return this.makeRequest(`/api/v1/licenses/email/${encodeURIComponent(email)}`);
  }

  /**
   * Get license by countid
   */
  async getLicenseByCountId(countid) {
    if (!countid) {
      throw new ValidationException('Count ID is required');
    }

    return this.makeRequest(`/api/v1/licenses/countid/${countid}`);
  }

  /**
   * Create new license
   */
  async createLicense(licenseData) {
    if (!licenseData || !licenseData.emailLicense || !licenseData.pass) {
      throw new ValidationException('License data with emailLicense and pass is required');
    }

    return this.makeRequest('/api/v1/licenses', {
      method: 'POST',
      body: licenseData,
    });
  }

  /**
   * Update license by appid
   */
  async updateLicenseByAppId(appid, updates) {
    // Allow operations without appid for sync purposes
    // if (!appid) {
    //   throw new ValidationException('App ID is required');
    // }
    if (!updates) {
      throw new ValidationException('Update data is required');
    }

    return this.makeRequest(`/api/v1/licenses/${encodeURIComponent(appid)}`, {
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

    return this.makeRequest(`/api/v1/licenses/email/${encodeURIComponent(email)}`, {
      method: 'PUT',
      body: updates,
    });
  }

  /**
   * Delete license by appid
   */
  async deleteLicenseByAppId(appid) {
    // Allow operations without appid for sync purposes
    // if (!appid) {
    //   throw new ValidationException('App ID is required');
    // }

    return this.makeRequest(`/api/v1/licenses/${encodeURIComponent(appid)}`, {
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

    return this.makeRequest(`/api/v1/licenses/email/${encodeURIComponent(email)}`, {
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

    return this.makeRequest(`/api/v1/licenses/countid/${countid}`, {
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
        throw new ValidationException(
          `License at index ${i} missing required fields: emailLicense and/or pass`
        );
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
          batch.map((licenseData) => this.createLicense(licenseData))
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
          batch.map((identifier) => {
            // Support different identifier types
            if (identifier.appid) {
              return this.deleteLicenseByAppId(identifier.appid);
            } else if (identifier.email) {
              return this.deleteLicenseByEmail(identifier.email);
            } else if (identifier.countid) {
              return this.deleteLicenseByCountId(identifier.countid);
            } else {
              throw new ValidationException(
                'Invalid identifier: must have appid, email, or countid'
              );
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
   * Get SMS payments with filtering and pagination
   */
  async getSmsPayments(options = {}) {
    const params = new URLSearchParams();

    if (options.appid) {
      params.append('appid', options.appid);
    }
    if (options.emailLicense) {
      params.append('emailLicense', options.emailLicense);
    }
    if (options.countid !== undefined) {
      params.append('countid', options.countid.toString());
    }
    if (options.startDate) {
      params.append('startDate', options.startDate);
    }
    if (options.endDate) {
      params.append('endDate', options.endDate);
    }
    if (options.page) {
      params.append('page', options.page.toString());
    }
    if (options.limit) {
      params.append('limit', options.limit.toString());
    }
    if (options.sortBy) {
      params.append('sortBy', options.sortBy);
    }
    if (options.sortOrder) {
      params.append('sortOrder', options.sortOrder);
    }

    const endpoint = `/api/v1/sms-payments?${params.toString()}`;

    return this.makeRequest(endpoint);
  }

  /**
   * Add SMS payment and update balance
   */
  async addSmsPayment(paymentData) {
    if (!paymentData || !paymentData.amount) {
      throw new ValidationException('Payment data with amount is required');
    }

    return this.makeRequest('/api/v1/add-sms-payment', {
      method: 'POST',
      body: paymentData,
    });
  }

  /**
   * Get license analytics with date filtering
   */
  async getLicenseAnalytics(options = {}) {
    const params = new URLSearchParams();

    if (options.month !== undefined) {
      params.append('month', options.month.toString());
    }
    if (options.year !== undefined) {
      params.append('year', options.year.toString());
    }
    if (options.startDate) {
      params.append('startDate', options.startDate);
    }
    if (options.endDate) {
      params.append('endDate', options.endDate);
    }
    if (options.status !== undefined) {
      params.append('status', options.status.toString());
    }
    if (options.license_type) {
      params.append('license_type', options.license_type);
    }

    const endpoint = `/api/v1/license-analytic?${params.toString()}`;

    return this.makeRequest(endpoint);
  }

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
          'PUT /api/v1/licenses/countid/{countid}',
          'DELETE /api/v1/licenses/countid/{countid}',
          'POST /api/v1/licenses/reset',
          'POST /api/v1/licenses/bulk',
          'PATCH /api/v1/licenses/bulk',
          'DELETE /api/v1/licenses/bulk',
          'POST /api/v1/licenses/row',
          'GET /api/v1/sms-payments',
          'POST /api/v1/add-sms-payment',
          'GET /api/v1/license-analytic',
        ],
        features: [
          'Pagination support',
          'Filtering by status, dba, date ranges',
          'Sorting capabilities',
          'Bulk operations',
          'Multiple identifier types (appid, email, countid)',
          'SMS payment management',
          'License analytics',
          'Data validation and sanitization',
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
