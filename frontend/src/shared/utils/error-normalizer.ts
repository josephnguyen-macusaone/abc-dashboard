import { ApiExceptionDto } from '@/application/dto/api-dto';

/**
 * Attempts to extract an HTTP-like status code from various error shapes (ApiExceptionDto, AxiosError, fetch errors).
 */
export function getErrorStatus(error: unknown): number | undefined {
  if (!error) return undefined;

  const anyError = error as any;

  if (typeof anyError.statusCode === 'number') return anyError.statusCode;
  if (typeof anyError.status === 'number') return anyError.status;
  if (typeof anyError?.response?.status === 'number') return anyError.response.status;
  if (error instanceof ApiExceptionDto && typeof error.status === 'number') return error.status;

  return undefined;
}

