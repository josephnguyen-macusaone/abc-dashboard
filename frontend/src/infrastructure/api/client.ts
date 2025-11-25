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
import { API_CONFIG } from '@/shared/constants';
import { useAuthStore } from '@/infrastructure/stores/auth-store';

/**
 * Validates and normalizes the API base URL
 * Ensures the URL has a valid http:// or https:// scheme for CORS requests
 */
const validateAndNormalizeBaseURL = (url: string | undefined): string => {
  const DEFAULT_URL = API_CONFIG.BASE_URL || 'http://localhost:5000/api';

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

        // Log outgoing request
        logger.api(`→ ${config.method?.toUpperCase()} ${config.url}`, {
          correlationId,
          url: config.url,
          method: config.method,
          headers: config.headers,
        });

        return config;
      },
      (error: AxiosError) => {
        const correlationId = (error.config as any)?.correlationId || generateCorrelationId();
        logger.error('Request failed', {
          correlationId,
          error: error.message,
          url: error.config?.url,
        });
        return Promise.reject(handleApiError(error));
      }
    );

    // Response interceptor
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => {
        const correlationId = (response.config as any)?.correlationId;

        // Log successful response
        logger.api(`← ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`, {
          correlationId,
          status: response.status,
          duration: Date.now() - (response.config as any)?.startTime,
          url: response.config.url,
        });

        return response;
      },
      async (error: AxiosError) => {
        const correlationId = (error.config as any)?.correlationId || generateCorrelationId();
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean; _retryCount?: number };

        // Log failed response
        logger.error(`← ${error.response?.status || 'NETWORK'} ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
          correlationId,
          status: error.response?.status,
          error: error.message,
          url: error.config?.url,
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

          logger.warn('Token expired, attempting refresh', {
            correlationId,
            url: originalRequest.url,
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

        // Retry logic for other retryable errors (not 401)
        if (
          originalRequest &&
          !originalRequest._retry &&
          isRetryableError(error) &&
          (originalRequest._retryCount || 0) < this.retryConfig.maxRetries
        ) {
          originalRequest._retry = true;
          originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;

          // Exponential backoff
          const delay = this.retryConfig.retryDelay * Math.pow(2, originalRequest._retryCount - 1);

          logger.warn(`Retrying request (${originalRequest._retryCount}/${this.retryConfig.maxRetries})`, {
            correlationId,
            url: originalRequest.url,
            delay,
          });

          await new Promise(resolve => setTimeout(resolve, delay));
          return this.instance(originalRequest);
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
