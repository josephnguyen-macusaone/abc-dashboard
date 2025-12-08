// HTTP Client Types (Infrastructure concerns only)
export interface RequestConfig {
  timeout?: number;
  headers?: Record<string, string>;
  retries?: number;
}

export interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  retryCondition?: (error: any) => boolean;
}
