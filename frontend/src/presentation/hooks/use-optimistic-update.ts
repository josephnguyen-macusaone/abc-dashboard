import { useState, useCallback } from 'react';
import { optimisticUpdate, apiRequest } from '@/infrastructure/api/enhanced-client';
import logger from '@/shared/utils/logger';

interface OptimisticUpdateOptions<T> {
  onSuccess?: (result: T) => void;
  onError?: (error: Error) => void;
  onRevert?: () => void;
  retry?: boolean;
  cache?: boolean;
  deduplicate?: boolean;
}

/**
 * Hook for optimistic updates with automatic error handling and rollback
 */
export function useOptimisticUpdate<T = any, P extends any[] = []>(
  operation: (...args: P) => Promise<T>,
  options: OptimisticUpdateOptions<T> = {}
) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const hookLogger = logger.createChild({
    component: 'useOptimisticUpdate',
  });

  const execute = useCallback(async (...args: P): Promise<T | null> => {
    setIsUpdating(true);
    setError(null);

    let revertFn: (() => void) | undefined;

    try {
      const result = await optimisticUpdate(
        () => operation(...args),
        () => {
          if (revertFn) {
            revertFn();
            options.onRevert?.();
            hookLogger.debug('Optimistic update reverted');
          }
        },
        {
          retry: options.retry,
          cache: options.cache,
          deduplicate: options.deduplicate,
        }
      );

      options.onSuccess?.(result);
      hookLogger.debug('Optimistic update succeeded');
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      options.onError?.(error);
      hookLogger.error('Optimistic update failed', {
        error: error.message,
      });
      return null;
    } finally {
      setIsUpdating(false);
    }
  }, [operation, options]);

  const reset = useCallback(() => {
    setError(null);
    setIsUpdating(false);
  }, []);

  return {
    execute,
    isUpdating,
    error,
    reset,
    hasError: error !== null,
  };
}

/**
 * Hook for optimistic state updates with automatic rollback
 */
export function useOptimisticState<T>(
  initialState: T,
  options: OptimisticUpdateOptions<T> = {}
) {
  const [state, setState] = useState<T>(initialState);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const stateLogger = logger.createChild({
    component: 'useOptimisticState',
  });

  const updateOptimistically = useCallback(async (
    optimisticUpdate: T,
    operation: () => Promise<T>
  ): Promise<T | null> => {
    // Store the previous state for rollback
    const previousState = state;

    // Apply optimistic update immediately
    setState(optimisticUpdate);
    setIsUpdating(true);
    setError(null);

    stateLogger.debug('Applied optimistic update');

    try {
      const result = await operation();

      // Update with actual result from server
      setState(result);
      options.onSuccess?.(result);
      stateLogger.debug('Optimistic update confirmed by server');

      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));

      // Rollback to previous state
      setState(previousState);
      setError(error);

      options.onError?.(error);
      options.onRevert?.();

      stateLogger.error('Optimistic update failed, rolled back', {
        error: error.message,
      });

      return null;
    } finally {
      setIsUpdating(false);
    }
  }, [state, options]);

  const reset = useCallback(() => {
    setState(initialState);
    setError(null);
    setIsUpdating(false);
  }, [initialState]);

  return {
    state,
    setState,
    updateOptimistically,
    isUpdating,
    error,
    reset,
    hasError: error !== null,
  };
}

/**
 * Hook for API requests with caching and deduplication
 */
export function useApiRequest<T = any>(
  config: {
    deduplicate?: boolean;
    cache?: boolean;
    cacheTtl?: number;
    retry?: boolean;
  } = {}
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<T | null>(null);

  const apiLogger = logger.createChild({
    component: 'useApiRequest',
  });

  const request = useCallback(async (requestConfig: any): Promise<T | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiRequest({
        ...requestConfig,
        ...config,
      });

      const result = response.data;
      setData(result);

      apiLogger.debug('API request succeeded');
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);

      apiLogger.error('API request failed', {
        error: error.message,
      });

      return null;
    } finally {
      setIsLoading(false);
    }
  }, [config]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    request,
    data,
    isLoading,
    error,
    reset,
    hasError: error !== null,
    hasData: data !== null,
  };
}