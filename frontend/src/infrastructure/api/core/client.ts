import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
  InternalAxiosRequestConfig
} from 'axios';
import { RequestConfig, RetryConfig } from '@/infrastructure/api/core/types';
import { handleApiError } from '@/infrastructure/api/core/errors';
import logger, { generateCorrelationId } from '@/shared/helpers/logger';
import { startTrace, injectIntoHeaders, TraceContext } from '@/shared/helpers/tracing';
import { API_CONFIG } from '@/shared/constants';
import { createApiCircuitBreaker, CircuitBreaker } from '@/shared/helpers/circuit-breaker';
import { useApiConnectivityStore } from '@/infrastructure/stores/api-connectivity-store';

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
  private authFailureHandled = false; // Flag to indicate auth failure has been processed
  private failedQueue: Array<{
    resolve: (token: string) => void;
    reject: (error: unknown) => void;
  }> = [];
  private pendingRequests = new Map<string, Promise<unknown>>(); // Request deduplication cache
  private circuitBreaker: CircuitBreaker;

  // Create child logger for HttpClient with component context
  private httpLogger = logger.createChild({
    component: 'HttpClient',
    category: 'api',
  });

  constructor(baseURL: string = DEFAULT_BASE_URL, config?: RequestConfig) {
    this.instance = axios.create({
      baseURL,
      timeout: config?.timeout || DEFAULT_TIMEOUT,
      withCredentials: true, // Send HttpOnly cookies with cross-origin requests
      headers: {
        'Content-Type': 'application/json',
        ...config?.headers,
      },
    });

    this.retryConfig = {
      maxRetries: config?.retries || DEFAULT_MAX_RETRIES,
      retryDelay: DEFAULT_RETRY_DELAY,
    };

    // Initialize circuit breaker for API protection
    this.circuitBreaker = createApiCircuitBreaker((state) => {
      this.httpLogger.info(`Circuit breaker state changed to: ${state}`, {
        category: 'circuit-breaker'
      });
    });

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
        (config as InternalAxiosRequestConfig & { correlationId: string; trace: TraceContext }).correlationId = correlationId;

        // Start trace for this request
        const trace = startTrace(`api_${config.method?.toUpperCase()}_${config.url}`);
        (config as InternalAxiosRequestConfig & { correlationId: string; trace: TraceContext }).trace = trace;

        // Inject trace headers
        const traceHeaders = injectIntoHeaders(trace);
        Object.assign(config.headers, traceHeaders);

        // Token is in HttpOnly cookie - sent automatically with withCredentials: true
        // Do not add Authorization header; backend reads token from cookie

        // Add timestamp for cache busting
        if (config.method?.toUpperCase() === 'GET') {
          config.params = {
            ...config.params,
            _t: Date.now(),
          };
        }

        // Store start time for duration calculation
        (config as InternalAxiosRequestConfig & { startTime?: number }).startTime = Date.now();

        // Log outgoing request with trace information
        this.httpLogger.http(`🌐 Request: ${config.method?.toUpperCase()} ${config.url}`, {
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
        const correlationId = (error.config as InternalAxiosRequestConfig & { correlationId?: string })?.correlationId || generateCorrelationId();
        this.httpLogger.error('Request failed', {
          correlationId,
          error: error.message,
          url: error.config?.url,
          method: error.config?.method,
          category: 'api-error',
        });
        return Promise.reject(handleApiError(error));
      }
    );

    // Response interceptor
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => {
        const config = response.config as InternalAxiosRequestConfig & { correlationId?: string; trace?: TraceContext };
        const correlationId = config?.correlationId;
        const trace = config?.trace;

        // Log successful response with trace information
        const startTime = (response.config as InternalAxiosRequestConfig & { startTime?: number })?.startTime;
        const duration = startTime ? Date.now() - startTime : undefined;

        this.httpLogger.http(`🌐 Response: ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`, {
          correlationId,
          status: response.status,
          duration,
          url: response.config.url,
          traceId: trace?.traceId,
          spanId: trace?.spanId,
          category: 'api-details',
        });

        useApiConnectivityStore.getState().reportReachable();

        return response;
      },
      async (error: AxiosError) => {
        const correlationId = (error.config as InternalAxiosRequestConfig & { correlationId?: string })?.correlationId || generateCorrelationId();
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean; _retryCount?: number; correlationId?: string };

        // Log failed response with detailed error info (less verbose if auth failure handled)
        const errorResponse = handleApiError(error);
        const httpStatus = error.response?.status;
        const hdrs = error.response?.headers;
        const contentType =
          hdrs && typeof hdrs.get === 'function'
            ? String(hdrs.get('content-type') ?? '')
            : '';
        const baseUrl = this.instance.defaults.baseURL ?? '';
        const isRelativeApi = baseUrl.startsWith('/');
        const isDevProxyHtml500 =
          typeof process !== 'undefined' &&
          process.env.NODE_ENV === 'development' &&
          isRelativeApi &&
          httpStatus === 500 &&
          contentType.toLowerCase().includes('text/html');

        const isUnreachable =
          errorResponse.code === 'NETWORK_ERROR' ||
          (typeof httpStatus === 'number' &&
            (httpStatus === 502 || httpStatus === 503 || httpStatus === 504)) ||
          isDevProxyHtml500;
        if (isUnreachable) {
          useApiConnectivityStore.getState().reportUnreachable(errorResponse.message);
        }

        const logLevel = this.authFailureHandled && error.response?.status === 401 ? 'debug' : 'error';
        this.httpLogger[logLevel](`API Error: ${errorResponse.message}`, {
          correlationId,
          status: error.response?.status,
          code: errorResponse.code,
          url: error.config?.url,
          method: error.config?.method?.toUpperCase(),
          category: this.authFailureHandled && error.response?.status === 401 ? 'api-auth' : 'api-error',
          details: errorResponse.details,
        });

        // 403 Forbidden = authenticated but not allowed (RBAC, ownership, etc.). Do not logout.
        // Only 401 / failed refresh indicates invalid session.

        // Handle 401 errors with automatic token refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          // If auth failure has already been handled, skip all token refresh logic
          if (this.authFailureHandled) {
            // Mark the error as auth-handled so components don't show error messages
            errorResponse.authHandled = true;
            return Promise.reject(errorResponse);
          }

          if (this.isRefreshing) {
            // If refresh is already in progress, queue this request
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            });
          }

          originalRequest._retry = true;

          // Refresh token is in HttpOnly cookie - always attempt refresh
          this.isRefreshing = true;

          try {
            // Attempt to refresh token
            const refreshResult = await this.attemptTokenRefresh();

            if (refreshResult) {
              // Token refresh successful - new token in HttpOnly cookie, retry original request
              this.processQueue(null, 'refreshed');

              // Retry the original request (cookie sent automatically)
              return this.instance(originalRequest);
            } else {
              // Token refresh failed - reject all queued requests and handle auth failure once
              const refreshError = new Error('Token refresh failed');
              this.processQueue(refreshError, null);
              await this.handleAuthFailure();
              // Mark the error as auth-handled so components don't show error messages
              errorResponse.authHandled = true;
              return Promise.reject(errorResponse);
            }
          } catch (refreshError) {
            // Token refresh failed - reject all queued requests and handle auth failure once
            this.processQueue(refreshError, null);
            await this.handleAuthFailure();
            // Mark the error as auth-handled so components don't show error messages
            errorResponse.authHandled = true;
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
   * Attempt to refresh the authentication token
   */
  private async attemptTokenRefresh(): Promise<boolean> {
    try {
      this.httpLogger.info('Attempting token refresh', {
        category: 'api-auth',
      });

      // Import auth store dynamically to avoid circular dependencies
      const { useAuthStore } = await import('@/infrastructure/stores/auth');

      // Attempt token refresh
      const success = await useAuthStore.getState().refreshToken();

      if (success) {
        this.httpLogger.info('Token refresh successful', {
          category: 'api-auth',
        });
      } else {
        this.httpLogger.warn('Token refresh failed - refresh method returned false', {
          category: 'api-auth',
        });
      }

      return success;
    } catch (error) {
      this.httpLogger.error('Token refresh failed with exception', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        category: 'api-auth',
      });
      return false;
    }
  }

  /**
   * Handle authentication failure - clear state and redirect to login
   */
  private async handleAuthFailure(): Promise<void> {
    // Prevent multiple simultaneous auth failure handling
    if (this.isHandlingAuthFailure) {
      this.httpLogger.debug('Auth failure handling already in progress, skipping duplicate call', {
        category: 'api-auth',
      });
      return;
    }

    this.isHandlingAuthFailure = true;

    try {
      this.httpLogger.warn('Handling authentication failure - clearing state and redirecting', {
        category: 'api-auth',
      });

      // Import auth store dynamically to avoid circular dependencies
      const { useAuthStore } = await import('@/infrastructure/stores/auth');

      // Clear authentication state (don't throw on logout failure)
      try {
        await useAuthStore.getState().logout();
        // Mark auth failure as handled only after successful logout
        this.authFailureHandled = true;
      } catch (logoutError) {
        this.httpLogger.warn('Logout failed during auth failure cleanup, continuing with local cleanup only', {
          category: 'api-auth',
          error: logoutError instanceof Error ? logoutError.message : String(logoutError),
        });
        // Don't mark as handled if logout failed - allow retry
      }

      // Redirect to login page if in browser
      if (typeof window !== 'undefined') {
        const isOnLoginPage = window.location.pathname === '/login';
        if (isOnLoginPage) return;

        // Prevent multiple rapid redirects by checking if already redirecting
        const redirectingKey = 'auth_redirecting';
        if (!sessionStorage.getItem(redirectingKey)) {
          sessionStorage.setItem(redirectingKey, 'true');
          sessionStorage.setItem('auth_logout_reason', 'session_expired');
          this.httpLogger.info('Redirecting to login page', {
            category: 'api-auth',
          });

          // Use window.location.replace for more reliable redirect
          // This replaces the current history entry instead of adding a new one
          this.httpLogger.info('Executing redirect to login page', {
            category: 'api-auth',
          });
          window.location.replace('/login');
        }
      }
    } catch (error) {
      this.httpLogger.error('Failed to handle auth failure', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        category: 'api-auth',
      });
    } finally {
      this.isHandlingAuthFailure = false;
      // Reset the auth failure flag and redirect flag after a delay to allow for any queued requests to complete
      setTimeout(() => {
        this.authFailureHandled = false;
        // Clear the redirect flag as well
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('auth_redirecting');
        }
      }, 2000); // Increased delay to ensure redirect completes
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
   * Generic GET request with deduplication and circuit breaker protection.
   * Dedup key omits _t (cache-busting) so identical logical requests share one in-flight request.
   */
  async get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.circuitBreaker.execute(async () => {
      const params = config?.params && typeof config.params === 'object' ? { ...config.params } : {};
      delete (params as Record<string, unknown>)._t;
      const cacheKey = `GET:${url}:${JSON.stringify(params)}`;

      const pendingRequest = this.pendingRequests.get(cacheKey);
      if (pendingRequest) {
        return pendingRequest;
      }

      const request = this.instance.get(url, config).then(response => response.data).finally(() => {
        this.pendingRequests.delete(cacheKey);
      });

      this.pendingRequests.set(cacheKey, request);
      return request;
    });
  }

  /**
   * Generic POST request with circuit breaker protection
   */
  async post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return this.circuitBreaker.execute(async () => {
      const response = await this.instance.post(url, data, config);
      return response.data;
    });
  }

  /**
   * Generic PUT request with circuit breaker protection
   */
  async put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return this.circuitBreaker.execute(async () => {
      const response = await this.instance.put(url, data, config);
      return response.data;
    });
  }

  /**
   * Generic PATCH request with circuit breaker protection
   */
  async patch<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return this.circuitBreaker.execute(async () => {
      const response = await this.instance.patch(url, data, config);
      return response.data;
    });
  }

  /**
   * Generic DELETE request with circuit breaker protection
   */
  async delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.circuitBreaker.execute(async () => {
      const response = await this.instance.delete(url, config);
      return response.data;
    });
  }

  /**
   * Get the underlying axios instance (for advanced usage)
   */
  getInstance(): AxiosInstance {
    return this.instance;
  }

  /**
   * Get circuit breaker statistics
   */
  getCircuitBreakerStats() {
    return this.circuitBreaker.getStats();
  }

  /**
   * Reset circuit breaker (for recovery or testing)
   */
  resetCircuitBreaker(): void {
    this.circuitBreaker.reset();
  }

  /**
   * Force circuit breaker open (for testing)
   */
  forceCircuitBreakerOpen(): void {
    this.circuitBreaker.forceOpen();
  }
}

// Export singleton instance
export const httpClient = new HttpClient();

// Export class for creating multiple instances if needed
export { HttpClient };
