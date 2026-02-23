import { useToast } from '@/presentation/contexts/toast-context';
import { ApiExceptionDto } from '@/application/dto/api-dto';
import { getErrorMessage } from '@/infrastructure/api/core/errors';
import { getErrorStatus } from './error-normalizer';

type ToastCategory = 'auth' | 'network' | 'validation' | 'generic';

function categorize(status?: number, code?: string): ToastCategory {
  if (status === 401 || status === 403 || code?.toString().toLowerCase().includes('auth')) return 'auth';
  if (status === 0) return 'network';
  if (status === 400 || code?.toString().toLowerCase().includes('validation')) return 'validation';
  return 'generic';
}

/**
 * useErrorToastMapper
 * Centralized mapping from domain/API errors to toasts.
 */
export function useErrorToastMapper() {
  const { error, warning, info } = useToast();

  function showErrorToast(err: unknown, context?: string) {
    const status = getErrorStatus(err);
    const code = err instanceof ApiExceptionDto ? err.code : undefined;
    const category = categorize(status, code);

    const description = getErrorMessage(err);
    const message =
      category === 'auth'
        ? 'Authentication required or not permitted'
        : category === 'network'
          ? 'Network error'
          : category === 'validation'
            ? 'Validation error'
            : 'Something went wrong';

    error(message, {
      description: context ? `${context}: ${description}` : description,
    });
  }

  function showInfoToast(message: string, description?: string) {
    info(message, { description });
  }

  function showWarningToast(message: string, description?: string) {
    warning(message, { description });
  }

  return { showErrorToast, showInfoToast, showWarningToast };
}

