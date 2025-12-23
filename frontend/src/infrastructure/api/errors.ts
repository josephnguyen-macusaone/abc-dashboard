import { ApiExceptionDto, ApiErrorDto } from '@/application/dto/api-dto';

/**
 * Handles API errors and converts them to ApiException
 */
export function handleApiError(error: unknown): ApiExceptionDto {
  // Type guard for Axios error
  const isAxiosError = (err: unknown): err is { response?: { status: number; data: unknown } } => {
    return typeof err === 'object' && err !== null && 'response' in err;
  };

  // Axios error
  if (isAxiosError(error) && error.response) {
    const { status, data } = error.response;

    // Type guards for safe property access
    const isObject = (value: unknown): value is Record<string, unknown> => {
      return typeof value === 'object' && value !== null;
    };

    // Server responded with error
    // Handle both direct message and nested error.message formats
    let message: string;
    let code: string;

    if (isObject(data) && isObject(data.error) && typeof data.error.message === 'string') {
      // API format: {"success":false,"error":{"code":401,"message":"Invalid email or password","category":"authentication"}}
      message = data.error.message;
      code = (typeof data.error.code === 'string' || typeof data.error.code === 'number')
        ? String(data.error.code)
        : `HTTP_${status}`;
    } else if (isObject(data) && typeof data.message === 'string') {
      // Standard format: {"message":"Error message","code":"ERROR_CODE"}
      message = data.message;
      code = (typeof data.code === 'string' || typeof data.code === 'number')
        ? String(data.code)
        : `HTTP_${status}`;
    } else if (isObject(data) && typeof data.error === 'string') {
      // Simple error string: {"error":"Error message"}
      message = data.error;
      code = `HTTP_${status}`;
    } else {
      // Fallback
      message = `Request failed with status ${status}`;
      code = `HTTP_${status}`;
    }

    return new ApiExceptionDto(message, code, status, data);
  }

  // Network error - check if error has request property
  if (typeof error === 'object' && error !== null && 'request' in error) {
    return new ApiExceptionDto(
      'Network error - please check your connection',
      'NETWORK_ERROR',
      0,
      (error as { request: unknown }).request
    );
  }

  // Other error - safely access message property
  const errorMessage = (typeof error === 'object' && error !== null && typeof (error as { message?: unknown }).message === 'string')
    ? (error as { message: string }).message
    : 'An unexpected error occurred';

  return new ApiExceptionDto(
    errorMessage,
    'UNKNOWN_ERROR',
    0,
    error
  );
}

/**
 * Checks if an error is retryable
 */
export function isRetryableError(error: any): boolean {
  if (!error.response) return true; // Network errors are retryable

  const { status } = error.response;

  // Retry on server errors (5xx) and rate limiting (429)
  return status >= 500 || status === 429;
}

/**
 * Gets user-friendly error message
 */
export function getErrorMessage(error: any): string {
  if (error instanceof ApiExceptionDto) {
    return error.message;
  }

  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  if (error.message) {
    return error.message;
  }

  return 'An unexpected error occurred';
}

/**
 * Creates a standardized error response
 */
export function createErrorResponse(error: any): ApiErrorDto {
  const apiException = error instanceof ApiExceptionDto ? error : handleApiError(error);

  return {
    message: apiException.message,
    code: apiException.code,
    status: apiException.status,
    details: apiException.details,
  };
}

/**
 * Logs API errors for debugging
 */
export function logApiError(error: any, context?: string): void {
  const errorInfo = createErrorResponse(error);
  const logMessage = context ? `[${context}] API Error:` : 'API Error:';

  console.error(logMessage, {
    message: errorInfo.message,
    code: errorInfo.code,
    status: errorInfo.status,
    category: errorInfo.details?.error?.category || errorInfo.details?.category,
    endpoint: error.response?.config?.url,
    method: error.response?.config?.method?.toUpperCase(),
    details: errorInfo.details,
  });
}
