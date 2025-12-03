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

// Default configuration - API_CONFIG.BASE_URL already handles validation and normalization
const DEFAULT_BASE_URL = API_CONFIG.BASE_URL;
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

        // Return the processed error for component handling
        return Promise.reject(errorResponse);

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
