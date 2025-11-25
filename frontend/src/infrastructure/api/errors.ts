import { ApiException, ApiError } from '@/infrastructure/api/types';

/**
 * Handles API errors and converts them to ApiException
 */
export function handleApiError(error: any): ApiException {
  // Axios error
  if (error.response) {
    const { status, data } = error.response;

    // Server responded with error
    const message = data?.message || data?.error || `Request failed with status ${status}`;
    const code = data?.code || `HTTP_${status}`;

    return new ApiException(message, code, status, data);
  }

  // Network error
  if (error.request) {
    return new ApiException(
      'Network error - please check your connection',
      'NETWORK_ERROR',
      0,
      error.request
    );
  }

  // Other error
  return new ApiException(
    error.message || 'An unexpected error occurred',
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
  if (error instanceof ApiException) {
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
export function createErrorResponse(error: any): ApiError {
  const apiException = error instanceof ApiException ? error : handleApiError(error);

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
    details: errorInfo.details,
  });
}
