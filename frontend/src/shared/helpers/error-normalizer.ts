import { ApiExceptionDto } from '@/application/dto/api-dto';

/**
 * Attempts to extract an HTTP-like status code from various error shapes (ApiExceptionDto, AxiosError, fetch errors).
 */
export function getErrorStatus(error: unknown): number | undefined {
  if (!error) return undefined;

  const err = error as { statusCode?: number; status?: number; response?: { status?: number } };

  if (typeof err.statusCode === 'number') return err.statusCode;
  if (typeof err.status === 'number') return err.status;
  if (typeof err?.response?.status === 'number') return err.response.status;
  if (error instanceof ApiExceptionDto && typeof error.status === 'number') return error.status;

  return undefined;
}

