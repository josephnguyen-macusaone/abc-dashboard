import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { httpClient } from './client';
import logger from '@/shared/utils/logger';

interface RequestConfig extends AxiosRequestConfig {
  deduplicate?: boolean;
  cache?: boolean;
  cacheTtl?: number;
  optimistic?: boolean;
  retry?: boolean;
}

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface PendingRequest<T = any> {
  promise: Promise<T>;
  timestamp: number;
}

/**
 * Enhanced API Client with deduplication, caching, and optimistic updates
 */
class EnhancedApiClient {
  private requestCache = new Map<string, CacheEntry>();
  private pendingRequests = new Map<string, PendingRequest>();
  private defaultCacheTtl = 5 * 60 * 1000; // 5 minutes
  private maxCacheSize = 100;

  /**
   * Generate a cache key for a request
   */
  private getCacheKey(config: RequestConfig): string {
    const { method = 'GET', url = '', params, data } = config;
    const paramsStr = params ? JSON.stringify(params) : '';
    const dataStr = data ? JSON.stringify(data) : '';
    return `${method}:${url}:${paramsStr}:${dataStr}`;
  }

  /**
   * Check if cached data is still valid
   */
  private isCacheValid(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.requestCache.entries()) {
      if (now - entry.timestamp >= entry.ttl) {
        this.requestCache.delete(key);
      }
    }

    // If cache is still too large, remove oldest entries
    if (this.requestCache.size > this.maxCacheSize) {
      const entries = Array.from(this.requestCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toRemove = entries.slice(0, this.requestCache.size - this.maxCacheSize);
      toRemove.forEach(([key]) => this.requestCache.delete(key));
    }
  }

  /**
   * Clean up old pending requests
   */
  private cleanupPendingRequests(): void {
    const now = Date.now();
    const timeout = 30000; // 30 seconds

    for (const [key, request] of this.pendingRequests.entries()) {
      if (now - request.timestamp > timeout) {
        this.pendingRequests.delete(key);
      }
    }
  }

  /**
   * Make a request with enhanced features
   */
  async request<T = any>(config: RequestConfig): Promise<AxiosResponse<T>> {
    const cacheKey = this.getCacheKey(config);
    const correlationId = `api_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const apiLogger = logger.createChild({
      correlationId,
      component: 'EnhancedApiClient',
      operation: config.method?.toUpperCase() || 'GET',
      url: config.url,
    });

    try {
      // Clean up periodically
      this.cleanupCache();
      this.cleanupPendingRequests();

      // Check cache first
      if (config.cache && config.method?.toUpperCase() === 'GET') {
        const cached = this.requestCache.get(cacheKey);
        if (cached && this.isCacheValid(cached)) {
          apiLogger.debug('Returning cached response');
          return {
            ...cached.data,
            cached: true,
          } as AxiosResponse<T>;
        }
      }

      // Check for pending duplicate requests
      if (config.deduplicate) {
        const pending = this.pendingRequests.get(cacheKey);
        if (pending) {
          apiLogger.debug('Returning pending request');
          return pending.promise as Promise<AxiosResponse<T>>;
        }
      }

      // Create the request
      const requestPromise = this.makeRequest<T>(config, correlationId, apiLogger);

      // Store as pending if deduplication is enabled
      if (config.deduplicate) {
        this.pendingRequests.set(cacheKey, {
          promise: requestPromise,
          timestamp: Date.now(),
        });

        // Clean up pending request when done
        requestPromise.finally(() => {
          this.pendingRequests.delete(cacheKey);
        });
      }

      const response = await requestPromise;

      // Cache successful GET responses
      if (config.cache && config.method?.toUpperCase() === 'GET' && response.status >= 200 && response.status < 300) {
        this.requestCache.set(cacheKey, {
          data: response,
          timestamp: Date.now(),
          ttl: config.cacheTtl || this.defaultCacheTtl,
        });
        apiLogger.debug('Response cached', { ttl: config.cacheTtl || this.defaultCacheTtl });
      }

      return response;
    } catch (error) {
      apiLogger.error('Request failed', {
        error: error instanceof Error ? error.message : String(error),
        status: (error as any)?.response?.status,
      });
      throw error;
    }
  }

  /**
   * Make the actual HTTP request
   */
  private async makeRequest<T>(
    config: RequestConfig,
    correlationId: string,
    logger: any
  ): Promise<AxiosResponse<T>> {
    const startTime = Date.now();

    try {
      logger.debug('Making request', {
        method: config.method,
        url: config.url,
        hasParams: !!config.params,
        hasData: !!config.data,
      });

      // Use the appropriate HTTP method
      let response: AxiosResponse<T>;
      const method = config.method?.toUpperCase() || 'GET';

      switch (method) {
        case 'GET':
          response = await httpClient.getInstance().get(config.url || '', config);
          break;
        case 'POST':
          response = await httpClient.getInstance().post(config.url || '', config.data, config);
          break;
        case 'PUT':
          response = await httpClient.getInstance().put(config.url || '', config.data, config);
          break;
        case 'PATCH':
          response = await httpClient.getInstance().patch(config.url || '', config.data, config);
          break;
        case 'DELETE':
          response = await httpClient.getInstance().delete(config.url || '', config);
          break;
        default:
          throw new Error(`Unsupported HTTP method: ${method}`);
      }
      const duration = Date.now() - startTime;

      logger.performance(`Request completed in ${duration}ms`, {
        duration,
        status: response.status,
        statusText: response.statusText,
        contentLength: response.headers['content-length'],
      });

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`Request failed after ${duration}ms`, {
        duration,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Optimistic update helper
   */
  async optimisticUpdate<T>(
    updateFn: () => Promise<T>,
    revertFn: () => void,
    config: RequestConfig = {}
  ): Promise<T> {
    const optimisticLogger = logger.createChild({
      component: 'OptimisticUpdate',
      operation: 'optimistic_update',
    });

    try {
      // Apply optimistic update immediately
      if (config.optimistic) {
        optimisticLogger.debug('Applying optimistic update');
        // Note: The actual optimistic update logic would be implemented
        // by the calling code based on the specific use case
      }

      const result = await this.request({ ...config, optimistic: false });
      return result.data;
    } catch (error) {
      // Revert optimistic update on failure
      optimisticLogger.warn('Reverting optimistic update due to error', {
        error: error instanceof Error ? error.message : String(error),
      });

      try {
        revertFn();
      } catch (revertError) {
        optimisticLogger.error('Failed to revert optimistic update', {
          revertError: revertError instanceof Error ? revertError.message : String(revertError),
        });
      }

      throw error;
    }
  }

  /**
   * Clear cache for specific patterns
   */
  clearCache(pattern?: string): void {
    if (!pattern) {
      this.requestCache.clear();
      logger.debug('Cache cleared completely');
      return;
    }

    let cleared = 0;
    for (const [key] of this.requestCache.entries()) {
      if (key.includes(pattern)) {
        this.requestCache.delete(key);
        cleared++;
      }
    }

    logger.debug('Cache cleared for pattern', { pattern, cleared });
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    maxSize: number;
    pendingRequests: number;
  } {
    return {
      size: this.requestCache.size,
      maxSize: this.maxCacheSize,
      pendingRequests: this.pendingRequests.size,
    };
  }
}

// Export singleton instance
export const enhancedApiClient = new EnhancedApiClient();

// Export convenience methods
export const apiRequest = enhancedApiClient.request.bind(enhancedApiClient);
export const optimisticUpdate = enhancedApiClient.optimisticUpdate.bind(enhancedApiClient);
export const clearApiCache = enhancedApiClient.clearCache.bind(enhancedApiClient);
export const getApiCacheStats = enhancedApiClient.getCacheStats.bind(enhancedApiClient);