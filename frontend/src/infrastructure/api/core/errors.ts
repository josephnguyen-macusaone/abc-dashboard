import { ApiExceptionDto, ApiErrorDto } from '@/application/dto/api-dto';
import logger from '@/shared/helpers/logger';

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
    // Canonical shape: { success: false, error: { code, message, category, statusCode, details } }
    let message: string;
    let code: string;

    if (isObject(data) && isObject(data.error) && typeof data.error.message === 'string') {
      message = data.error.message;
      code =
        typeof data.error.code === 'string'
          ? data.error.code
          : typeof data.error.code === 'number'
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
export function isRetryableError(error: unknown): boolean {
  const err = error as { response?: { status?: number } };
  if (!err?.response) return true;

  const { status } = err.response;
  return (typeof status === 'number' && status >= 500) || status === 429;
}

/**
 * Message shown when login fails due to wrong host (404) or network (can't reach API).
 * Helps users fix NEXT_PUBLIC_API_URL and rebuild.
 */
export const LOGIN_SERVER_UNREACHABLE_MESSAGE =
  "Can't reach the server. Check that the API is running and NEXT_PUBLIC_API_URL is set correctly.";

/**
 * Gets a user-friendly message for login errors.
 * Maps 404 and network errors to a clear config message; other errors use getErrorMessage.
 */
export function getLoginErrorMessage(error: unknown): string {
  const apiException = handleApiError(error);
  if (apiException.status === 404 || apiException.code === 'NETWORK_ERROR' || apiException.status === 0) {
    return LOGIN_SERVER_UNREACHABLE_MESSAGE;
  }
  return apiException.message;
}

/**
 * Gets user-friendly error message
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiExceptionDto) {
    return error.message;
  }

  const err = error as { response?: { data?: { message?: string } }; message?: string };
  if (err?.response?.data?.message && typeof err.response.data.message === 'string') {
    return err.response.data.message;
  }
  if (typeof err?.message === 'string') {
    return err.message;
  }

  return 'An unexpected error occurred';
}

/**
 * Creates a standardized error response
 */
export function createErrorResponse(error: unknown): ApiErrorDto {
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
export function logApiError(error: unknown, context?: string): void {
  const errorInfo = createErrorResponse(error);
  const logMessage = context ? `[${context}] API Error:` : 'API Error:';
  const err = error as { response?: { config?: { url?: string; method?: string } } };
  const details = errorInfo.details as { error?: { category?: string }; category?: string } | undefined;

  logger.error(logMessage, {
    message: errorInfo.message,
    code: errorInfo.code,
    status: errorInfo.status,
    category: details?.error?.category ?? details?.category,
    endpoint: err?.response?.config?.url,
    method: err?.response?.config?.method?.toUpperCase(),
    details: errorInfo.details,
  });
}
