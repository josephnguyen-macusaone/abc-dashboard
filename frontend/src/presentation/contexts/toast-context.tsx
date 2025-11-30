'use client';

import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import { toast as sonnerToast } from 'sonner';
import { XCircle, CheckCircle, AlertCircle, Info, Loader2 } from 'lucide-react';
import logger from '@/shared/utils/logger';

/**
 * Toast Context - Enhanced Toast Management
 *
 * Provides a centralized, feature-rich toast system with:
 * - Consistent styling and icons
 * - Loading states and promise handling
 * - Error logging and tracking
 * - Toast management (dismiss, update, clear)
 *
 * Usage:
 * ```tsx
 * const { success, error, loading, promise } = useToast();
 *
 * // Basic toasts
 * success('Operation completed!');
 * error('Something went wrong!');
 *
 * // Loading toast
 * const loadingId = loading('Saving...');
 * // Later: dismiss(loadingId);
 *
 * // Promise toast (auto-handles loading/success/error)
 * await promise(
 *   apiCall(),
 *   {
 *     loading: 'Processing...',
 *     success: 'Done!',
 *     error: 'Failed!'
 *   }
 * );
 * ```
 */

interface ToastOptions {
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';
  className?: string;
  onAutoClose?: () => void;
  onDismiss?: () => void;
}

interface ToastContextType {
  // Basic toast methods
  success: (message: string, options?: ToastOptions) => string | number;
  error: (message: string, options?: ToastOptions) => string | number;
  warning: (message: string, options?: ToastOptions) => string | number;
  info: (message: string, options?: ToastOptions) => string | number;

  // Advanced toast methods
  loading: (message: string, options?: ToastOptions) => string | number;
  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: unknown) => string);
    },
    options?: ToastOptions
  ) => Promise<T>;

  // Management methods
  dismiss: (toastId?: string | number) => void;
  update: (toastId: string | number, message: string, options?: ToastOptions) => string | number;

  // Utility methods
  clearAll: () => void;

  // Queue management
  getActiveToasts: () => (string | number)[];
  isLoading: (toastId: string | number) => boolean;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
  defaultOptions?: {
    duration?: number;
    position?: ToastOptions['position'];
  };
}

export const ToastProvider: React.FC<ToastProviderProps> = ({
  children,
  defaultOptions = {}
}) => {
  const { duration: defaultDuration = 4000, position: defaultPosition = 'bottom-right' } = defaultOptions;

  // Create enhanced toast options with defaults and logging
  const createToastOptions = useCallback((options?: ToastOptions) => {
    return {
      duration: options?.duration ?? defaultDuration,
      position: options?.position ?? defaultPosition,
      ...options,
    };
  }, [defaultDuration, defaultPosition]);

  // Track active toasts and loading states
  const [activeToasts, setActiveToasts] = React.useState<Set<string | number>>(new Set());
  const [loadingToasts, setLoadingToasts] = React.useState<Set<string | number>>(new Set());

  // Log toast events for debugging
  const logToast = useCallback((type: string, message: string) => {
    logger.info('Toast displayed', {
      component: 'ToastContext',
      type,
      message: message.substring(0, 100), // Truncate long messages
    });
  }, []);

  // Track toast lifecycle
  const addActiveToast = useCallback((id: string | number, isLoading = false) => {
    setActiveToasts(prev => new Set(prev).add(id));
    if (isLoading) {
      setLoadingToasts(prev => new Set(prev).add(id));
    }
  }, []);

  const removeActiveToast = useCallback((id: string | number) => {
    setActiveToasts(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setLoadingToasts(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  // Basic toast methods with icons and enhanced options
  const success = useCallback((message: string, options?: ToastOptions): string | number => {
    logToast('success', message);
    const id = sonnerToast.success(message, {
      ...createToastOptions(options),
      icon: <CheckCircle className="h-5 w-5 text-green-500" />,
      ...options,
    });
    addActiveToast(id);
    return id;
  }, [createToastOptions, logToast, addActiveToast]);

  const error = useCallback((message: string, options?: ToastOptions): string | number => {
    logToast('error', message);
    const id = sonnerToast.error(message, {
      ...createToastOptions(options),
      icon: <XCircle className="h-5 w-5 text-red-500" />,
      ...options,
    });
    addActiveToast(id);
    return id;
  }, [createToastOptions, logToast, addActiveToast]);

  const warning = useCallback((message: string, options?: ToastOptions): string | number => {
    logToast('warning', message);
    const id = sonnerToast.warning(message, {
      ...createToastOptions(options),
      icon: <AlertCircle className="h-5 w-5 text-yellow-500" />,
      ...options,
    });
    addActiveToast(id);
    return id;
  }, [createToastOptions, logToast, addActiveToast]);

  const info = useCallback((message: string, options?: ToastOptions): string | number => {
    logToast('info', message);
    const id = sonnerToast.info(message, {
      ...createToastOptions(options),
      icon: <Info className="h-5 w-5 text-blue-500" />,
      ...options,
    });
    addActiveToast(id);
    return id;
  }, [createToastOptions, logToast, addActiveToast]);

  // Loading toast with spinner
  const loading = useCallback((message: string, options?: ToastOptions): string | number => {
    logToast('loading', message);
    const id = sonnerToast.loading(message, {
      ...createToastOptions({ ...options, duration: Infinity }), // Loading toasts don't auto-dismiss
      icon: <Loader2 className="h-5 w-5 animate-spin" />,
      ...options,
    });
    addActiveToast(id, true); // Mark as loading toast
    return id;
  }, [createToastOptions, logToast, addActiveToast]);

  // Promise toast for async operations
  const promise = useCallback(async <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: unknown) => string);
    },
    options?: ToastOptions
  ): Promise<T> => {
    const loadingId = loading(messages.loading, options);

    try {
      const result = await promise;

      // Dismiss loading toast
      sonnerToast.dismiss(loadingId);
      removeActiveToast(loadingId);

      // Show success toast
      const successMessage = typeof messages.success === 'function'
        ? messages.success(result)
        : messages.success;

      success(successMessage, options);

      return result;
    } catch (err) {
      // Dismiss loading toast
      sonnerToast.dismiss(loadingId);
      removeActiveToast(loadingId);

      // Show error toast
      const errorMessage = typeof messages.error === 'function'
        ? messages.error(err)
        : messages.error;

      error(errorMessage, options);

      throw err;
    }
  }, [loading, success, error, removeActiveToast]);

  // Management methods
  const dismiss = useCallback((toastId?: string | number) => {
    if (toastId) {
      sonnerToast.dismiss(toastId);
      removeActiveToast(toastId);
    } else {
      sonnerToast.dismiss();
      setActiveToasts(new Set());
      setLoadingToasts(new Set());
    }
  }, [removeActiveToast]);

  const update = useCallback((toastId: string | number, message: string, options?: ToastOptions) => {
    // Sonner doesn't support updating existing toasts, so we create a new one
    // Consider using a different toast library if update functionality is critical
    removeActiveToast(toastId);
    sonnerToast.dismiss(toastId);
    return info(message, options);
  }, [info, removeActiveToast]);

  const clearAll = useCallback(() => {
    sonnerToast.dismiss();
    setActiveToasts(new Set());
    setLoadingToasts(new Set());
  }, []);

  // Utility methods for toast management
  const getActiveToasts = useCallback(() => Array.from(activeToasts), [activeToasts]);

  const isLoading = useCallback((toastId: string | number) => loadingToasts.has(toastId), [loadingToasts]);

  const value: ToastContextType = {
    success,
    error,
    warning,
    info,
    loading,
    promise,
    dismiss,
    update,
    clearAll,
    getActiveToasts,
    isLoading,
  };

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
};