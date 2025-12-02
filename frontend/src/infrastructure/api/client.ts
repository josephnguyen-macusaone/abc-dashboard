import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
  InternalAxiosRequestConfig
} from 'axios';
import { RequestConfig, RetryConfig } from '@/infrastructure/api/types';
import { handleApiError, isRetryableError } from '@/infrastructure/api/errors';
import logger, { generateCorrelationId } from '@/shared/utils/logger';
import { RetryUtils } from '@/shared/utils/retry';
import { startTrace, injectIntoHeaders, logWithTrace } from '@/shared/utils/tracing';
import { API_CONFIG } from '@/shared/constants';
import { useAuthStore } from '@/infrastructure/stores/auth-store';

/**
 * Validates and normalizes the API base URL
 * Ensures the URL has a valid http:// or https:// scheme for CORS requests
 */
const validateAndNormalizeBaseURL = (url: string | undefined): string => {
  const DEFAULT_URL = API_CONFIG.BASE_URL || 'http://localhost:5000/api/v1';

  // If URL is empty, undefined, or null, use default
  if (!url || url.trim() === '') {
    return DEFAULT_URL;
  }

  const trimmedUrl = url.trim();

  // Check if URL already has http:// or https:// protocol
  if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
    try {
      // Validate it's a proper URL
      new URL(trimmedUrl);
      return trimmedUrl;
    } catch {
      // Invalid URL format, use default
      console.warn(`Invalid API URL format: "${trimmedUrl}". Using default: ${DEFAULT_URL}`);
      return DEFAULT_URL;
    }
  }

  // If no protocol, assume http:// for localhost, https:// for others
  if (trimmedUrl.startsWith('localhost') || trimmedUrl.startsWith('127.0.0.1')) {
    return `http://${trimmedUrl}`;
  }

  // For other URLs without protocol, default to https://
  console.warn(`API URL missing protocol: "${trimmedUrl}". Assuming https://`);
  return `https://${trimmedUrl}`;
};

// Default configuration
const DEFAULT_BASE_URL = validateAndNormalizeBaseURL(process.env.NEXT_PUBLIC_API_URL);
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000; // 1 second

class HttpClient {
  private instance: AxiosInstance;
  private retryConfig: RetryConfig;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (token: string) => void;
    reject: (error: any) => void;
  }> = [];

  constructor(baseURL: string = DEFAULT_BASE_URL, config?: RequestConfig) {
    this.instance = axios.create({
      baseURL,
      timeout: config?.timeout || DEFAULT_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        ...config?.headers,
      },
    });

    this.retryConfig = {
      maxRetries: config?.retries || DEFAULT_MAX_RETRIES,
      retryDelay: DEFAULT_RETRY_DELAY,
    };

    this.setupInterceptors();
  }

  /**
   * Set up request and response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.instance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        // Generate correlation ID for this request
        const correlationId = generateCorrelationId();
        (config as any).correlationId = correlationId;

        // Start trace for this request
        const trace = startTrace(`api_${config.method?.toUpperCase()}_${config.url}`);
        (config as any).trace = trace;

        // Inject trace headers
        const traceHeaders = injectIntoHeaders(trace);
        Object.assign(config.headers, traceHeaders);

        // Add authorization header if token exists
        if (typeof window !== 'undefined') {
          const token = this.getAuthToken();
          if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }

        // Add timestamp for cache busting
        if (config.method?.toUpperCase() === 'GET') {
          config.params = {
            ...config.params,
            _t: Date.now(),
          };
        }

        // Log outgoing request with trace information
        logger.api(`Request: ${config.method?.toUpperCase()} ${config.url}`, {
          correlationId,
          url: config.url,
          method: config.method,
          traceId: trace.traceId,
          spanId: trace.spanId,
          category: 'api-details',
        });

        return config;
      },
      (error: AxiosError) => {
        const correlationId = (error.config as any)?.correlationId || generateCorrelationId();
        logger.api('Request failed', {
          correlationId,
          error: error.message,
          url: error.config?.url,
          category: 'api-error',
        });
        return Promise.reject(handleApiError(error));
      }
    );

    // Response interceptor
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => {
        const correlationId = (response.config as any)?.correlationId;
        const trace = (response.config as any)?.trace;

        // Log successful response with trace information
        logger.api(`Response: ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`, {
          correlationId,
          status: response.status,
          duration: Date.now() - (response.config as any)?.startTime,
          url: response.config.url,
          traceId: trace?.traceId,
          spanId: trace?.spanId,
          category: 'api-details',
        });

        return response;
      },
      async (error: AxiosError) => {
        const correlationId = (error.config as any)?.correlationId || generateCorrelationId();
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean; _retryCount?: number };

        // Log failed response
        logger.api(`Response failed: ${error.response?.status || 'NETWORK'} ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
          correlationId,
          status: error.response?.status,
          error: error.message,
          url: error.config?.url,
          category: 'api-error',
        });

        // Handle 401 Unauthorized - attempt token refresh
        if (
          error.response?.status === 401 &&
          originalRequest &&
          !originalRequest._retry &&
          !originalRequest.url?.includes('/auth/login') &&
          !originalRequest.url?.includes('/auth/register') &&
          !originalRequest.url?.includes('/auth/refresh')
        ) {
          if (this.isRefreshing) {
            // If refresh is already in progress, queue this request
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            }).then((token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return this.instance(originalRequest);
            }).catch(err => {
              return Promise.reject(handleApiError(err));
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          logger.security('Token expired, attempting refresh', {
            correlationId,
            url: originalRequest.url,
            category: 'auth',
          });

          return new Promise((resolve, reject) => {
            const authStore = useAuthStore.getState();

            authStore.refreshToken()
              .then((success) => {
                this.isRefreshing = false;

                if (success) {
                  const newToken = authStore.token;
                  this.processQueue(null, newToken);

                  // Retry original request with new token
                  if (newToken && originalRequest.headers) {
                    originalRequest.headers.Authorization = `Bearer ${newToken}`;
                  }

                  logger.info('Retrying request with refreshed token', {
                    correlationId,
                    url: originalRequest.url,
                  });

                  resolve(this.instance(originalRequest));
                } else {
                  // Refresh failed, reject all queued requests
                  this.processQueue(error, null);
                  reject(handleApiError(error));
                }
              })
              .catch((refreshError) => {
                this.isRefreshing = false;
                this.processQueue(refreshError, null);

                logger.error('Token refresh failed', {
                  correlationId,
                  error: refreshError instanceof Error ? refreshError.message : String(refreshError),
                });

                reject(handleApiError(refreshError));
              });
          });
        }

        // Retry logic for other retryable errors (not 401) using standardized retry utility
        if (
          originalRequest &&
          !originalRequest._retry &&
          isRetryableError(error) &&
          (originalRequest._retryCount || 0) < this.retryConfig.maxRetries
        ) {
          originalRequest._retry = true;
          originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;

          const retryConfig = {
            maxRetries: this.retryConfig.maxRetries,
            baseDelay: this.retryConfig.retryDelay,
            maxDelay: 30000, // 30 seconds max
            backoffFactor: 2,
            retryCondition: () => isRetryableError(error),
            onRetry: (retryError: any, attempt: number, delay: number) => {
              logger.warn(`Retrying API request (${attempt}/${this.retryConfig.maxRetries})`, {
            correlationId,
            url: originalRequest.url,
            delay,
                error: retryError?.message,
              });
            },
          };

          try {
            // Use RetryUtils to handle the retry with proper backoff
            return await RetryUtils.apiCallWithRetry(
              () => this.instance(originalRequest),
              retryConfig,
              `api_retry_${originalRequest.url}`
            );
          } catch (retryError) {
            // If retry also fails, continue with original error handling
            logger.error('API retry failed', {
              correlationId,
              url: originalRequest.url,
              retryCount: originalRequest._retryCount,
              error: retryError instanceof Error ? retryError.message : String(retryError),
            });
            // Continue to reject with original error
          }
        }

        return Promise.reject(handleApiError(error));
      }
    );
  }

  /**
   * Process queued requests after token refresh
   */
  private processQueue(error: any, token: string | null = null): void {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token!);
      }
    });

    this.failedQueue = [];
  }

  /**
   * Get authentication token from cookies or localStorage
   */
  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;

    // Try cookies first
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift();
      return null;
    };

    return getCookie('token') || localStorage.getItem('token');
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string | null): void {
    if (token) {
      this.instance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.instance.defaults.headers.common['Authorization'];
    }
  }

  /**
   * Generic GET request
   */
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.get(url, config);
    return response.data;
  }

  /**
   * Generic POST request
   */
  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.post(url, data, config);
    return response.data;
  }

  /**
   * Generic PUT request
   */
  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.put(url, data, config);
    return response.data;
  }

  /**
   * Generic PATCH request
   */
  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.patch(url, data, config);
    return response.data;
  }

  /**
   * Generic DELETE request
   */
  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.delete(url, config);
    return response.data;
  }

  /**
   * Get the underlying axios instance (for advanced usage)
   */
  getInstance(): AxiosInstance {
    return this.instance;
  }
}

// Export singleton instance
export const httpClient = new HttpClient();

// Export class for creating multiple instances if needed
export { HttpClient };
