import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
  InternalAxiosRequestConfig
} from 'axios';
import { RequestConfig, RetryConfig } from '@/infrastructure/api/types';
import { handleApiError } from '@/infrastructure/api/errors';
import logger, { generateCorrelationId } from '@/shared/utils/logger';
import { startTrace, injectIntoHeaders } from '@/shared/utils/tracing';
import { API_CONFIG } from '@/shared/constants';

// Default configuration - API_CONFIG.BASE_URL already handles validation and normalization
const DEFAULT_BASE_URL = API_CONFIG.BASE_URL;
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000; // 1 second

class HttpClient {
  private instance: AxiosInstance;
  private retryConfig: RetryConfig;
  private isRefreshing = false;
  private isHandlingAuthFailure = false;
  private failedQueue: Array<{
    resolve: (token: string) => void;
    reject: (error: unknown) => void;
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
        (config as InternalAxiosRequestConfig & { correlationId: string; trace: any }).correlationId = correlationId;

        // Start trace for this request
        const trace = startTrace(`api_${config.method?.toUpperCase()}_${config.url}`);
        (config as InternalAxiosRequestConfig & { correlationId: string; trace: any }).trace = trace;

        // Inject trace headers
        const traceHeaders = injectIntoHeaders(trace);
        Object.assign(config.headers, traceHeaders);

        // Add authorization header if token exists
        if (typeof window !== 'undefined') {
          const token = this.getAuthToken();
          if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
            if (process.env.NODE_ENV === 'development') {
              console.debug('Adding auth header for request:', config.url, 'Token length:', token.length);
            }
          } else {
            console.log('Frontend: No token found for request:', config.url);
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
        if (process.env.NODE_ENV === 'development') {
          logger.api(`Request: ${config.method?.toUpperCase()} ${config.url}`, {
            correlationId,
            url: config.url,
            method: config.method,
            traceId: trace.traceId,
            spanId: trace.spanId,
            category: 'api-details',
          });
        }

        return config;
      },
      (error: AxiosError) => {
        const correlationId = (error.config as InternalAxiosRequestConfig & { correlationId?: string })?.correlationId || generateCorrelationId();
        logger.api('Request failed', {
          correlationId,
          error: error.message,
          url: error.config?.url,
          category: 'api-error' as const,
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
        if (process.env.NODE_ENV === 'development') {
          logger.api(`Response: ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`, {
            correlationId,
            status: response.status,
            duration: Date.now() - ((response.config as InternalAxiosRequestConfig & { startTime?: number })?.startTime || Date.now()),
            url: response.config.url,
            traceId: trace?.traceId,
            spanId: trace?.spanId,
            category: 'api-details' as const,
          });
        }

        return response;
      },
      async (error: AxiosError) => {
        const correlationId = (error.config as InternalAxiosRequestConfig & { correlationId?: string })?.correlationId || generateCorrelationId();
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean; _retryCount?: number; correlationId?: string };

        // Log failed response with detailed error info
        const errorResponse = handleApiError(error);
        logger.error(`API Error: ${errorResponse.message}`, {
          correlationId,
          status: error.response?.status,
          code: errorResponse.code,
          url: error.config?.url,
          method: error.config?.method?.toUpperCase(),
          category: 'api-error',
          details: errorResponse.details,
        });

        // Handle 401 errors with automatic token refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            // If refresh is already in progress, queue this request
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            });
          }

          originalRequest._retry = true;

          // Check if we have a refresh token
          const refreshToken = this.getRefreshToken();
          if (!refreshToken) {
            // No refresh token, redirect to login
            this.handleAuthFailure();
            return Promise.reject(errorResponse);
          }

          this.isRefreshing = true;

          try {
            // Attempt to refresh token
            const refreshResult = await this.attemptTokenRefresh();

            if (refreshResult) {
              // Token refresh successful, retry original request
              const newToken = this.getAuthToken();
              if (newToken && originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
              }

              // Process queued requests with the new token
              this.processQueue(null, newToken);

              // Retry the original request
              return this.instance(originalRequest);
            } else {
              // Token refresh failed - reject all queued requests and handle auth failure once
              const refreshError = new Error('Token refresh failed');
              this.processQueue(refreshError, null);
              await this.handleAuthFailure();
              return Promise.reject(errorResponse);
            }
          } catch (refreshError) {
            // Token refresh failed - reject all queued requests and handle auth failure once
            this.processQueue(refreshError, null);
            await this.handleAuthFailure();
            return Promise.reject(errorResponse);
          } finally {
            this.isRefreshing = false;
          }
        }

        // Return the processed error for component handling
        return Promise.reject(errorResponse);

      }
    );
  }

  /**
   * Process queued requests after token refresh
   */
  private processQueue(error: unknown, token: string | null = null): void {
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
   * Get refresh token from localStorage
   */
  private getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refreshToken');
  }

  /**
   * Attempt to refresh the authentication token
   */
  private async attemptTokenRefresh(): Promise<boolean> {
    try {
      const refreshToken = this.getRefreshToken();
      if (!refreshToken) {
        logger.warn('No refresh token available for token refresh attempt');
        return false;
      }

      logger.info('Attempting token refresh');

      // Import auth store dynamically to avoid circular dependencies
      const { useAuthStore } = await import('@/infrastructure/stores/auth');

      // Attempt token refresh
      const success = await useAuthStore.getState().refreshToken();

      if (success) {
        logger.info('Token refresh successful');
      } else {
        logger.warn('Token refresh failed - refresh method returned false');
      }

      return success;
    } catch (error) {
      logger.error('Token refresh failed with exception:', { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  /**
   * Handle authentication failure - clear state and redirect to login
   */
  private async handleAuthFailure(): Promise<void> {
    // Prevent multiple simultaneous auth failure handling
    if (this.isHandlingAuthFailure) {
      logger.info('Auth failure handling already in progress, skipping duplicate call');
      return;
    }

    this.isHandlingAuthFailure = true;

    try {
      // Import auth store dynamically to avoid circular dependencies
      const { useAuthStore } = await import('@/infrastructure/stores/auth');

      // Clear authentication state
      await useAuthStore.getState().logout();

      // Redirect to login page if in browser
      if (typeof window !== 'undefined') {
        // Prevent multiple rapid redirects by checking if already redirecting
        const redirectingKey = 'auth_redirecting';
        if (!sessionStorage.getItem(redirectingKey)) {
          sessionStorage.setItem(redirectingKey, 'true');
        // Use window.location for reliable client-side navigation
        window.location.href = '/login';
        }
      }
    } catch (error) {
      logger.error('Failed to handle auth failure:', { error: error instanceof Error ? error.message : String(error) });
    } finally {
      this.isHandlingAuthFailure = false;
    }
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
  async get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.get(url, config);
    return response.data;
  }

  /**
   * Generic POST request
   */
  async post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.post(url, data, config);
    return response.data;
  }

  /**
   * Generic PUT request
   */
  async put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.put(url, data, config);
    return response.data;
  }

  /**
   * Generic PATCH request
   */
  async patch<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.patch(url, data, config);
    return response.data;
  }

  /**
   * Generic DELETE request
   */
  async delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
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
