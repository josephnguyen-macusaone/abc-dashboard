import { ApiExceptionDto, ApiErrorDto } from '@/application/dto/api-dto';

/**
 * Handles API errors and converts them to ApiException
 */
export function handleApiError(error: any): ApiExceptionDto {
  // Axios error
  if (error.response) {
    const { status, data } = error.response;

    // Server responded with error
    // Handle both direct message and nested error.message formats
    let message: string;
    let code: string;

    if (data?.error?.message) {
      // API format: {"success":false,"error":{"code":401,"message":"Invalid email or password","category":"authentication"}}
      message = data.error.message;
      code = data.error.code || `HTTP_${status}`;
    } else if (data?.message) {
      // Standard format: {"message":"Error message","code":"ERROR_CODE"}
      message = data.message;
      code = data.code || `HTTP_${status}`;
    } else if (typeof data?.error === 'string') {
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

  // Network error
  if (error.request) {
    return new ApiExceptionDto(
      'Network error - please check your connection',
      'NETWORK_ERROR',
      0,
      error.request
    );
  }

  // Other error
  return new ApiExceptionDto(
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
