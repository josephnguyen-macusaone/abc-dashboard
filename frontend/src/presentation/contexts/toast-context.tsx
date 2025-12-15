'use client';

import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import { toast as sonnerToast } from 'sonner';
import { XCircle, CheckCircle, AlertCircle, Info, Loader2 } from 'lucide-react';

/**
 * Toast Context - Toast Management
 * Defines the contract for the toast context
 */
interface ToastOptions {
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  cancel?: {
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

  // Enhanced toast methods with descriptions
  successWithDescription: (message: string, description: string, options?: Omit<ToastOptions, 'description'>) => string | number;
  errorWithDescription: (message: string, description: string, options?: Omit<ToastOptions, 'description'>) => string | number;
  warningWithDescription: (message: string, description: string, options?: Omit<ToastOptions, 'description'>) => string | number;
  infoWithDescription: (message: string, description: string, options?: Omit<ToastOptions, 'description'>) => string | number;

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
  clearAll: () => void;
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


  // Basic toast methods with icons and enhanced options
  const success = useCallback((message: string, options?: ToastOptions): string | number => {
    return sonnerToast.success(message, {
      ...createToastOptions(options),
      icon: <CheckCircle className="h-5 w-5 text-white drop-shadow-sm" />,
      ...options,
    });
  }, [createToastOptions]);

  const error = useCallback((message: string, options?: ToastOptions): string | number => {
    return sonnerToast.error(message, {
      ...createToastOptions(options),
      icon: <XCircle className="h-5 w-5 text-white drop-shadow-sm" />,
      ...options,
    });
  }, [createToastOptions]);

  const warning = useCallback((message: string, options?: ToastOptions): string | number => {
    return sonnerToast.warning(message, {
      ...createToastOptions(options),
      icon: <AlertCircle className="h-5 w-5 text-white drop-shadow-sm" />,
      ...options,
    });
  }, [createToastOptions]);

  const info = useCallback((message: string, options?: ToastOptions): string | number => {
    return sonnerToast.info(message, {
      ...createToastOptions(options),
      icon: <Info className="h-5 w-5 text-white drop-shadow-sm" />,
      ...options,
    });
  }, [createToastOptions]);

  // Enhanced toast methods with descriptions
  const successWithDescription = useCallback((message: string, description: string, options?: Omit<ToastOptions, 'description'>): string | number => {
    return success(message, { ...options, description });
  }, [success]);

  const errorWithDescription = useCallback((message: string, description: string, options?: Omit<ToastOptions, 'description'>): string | number => {
    return error(message, { ...options, description });
  }, [error]);

  const warningWithDescription = useCallback((message: string, description: string, options?: Omit<ToastOptions, 'description'>): string | number => {
    return warning(message, { ...options, description });
  }, [warning]);

  const infoWithDescription = useCallback((message: string, description: string, options?: Omit<ToastOptions, 'description'>): string | number => {
    return info(message, { ...options, description });
  }, [info]);

  // Loading toast with spinner
  const loading = useCallback((message: string, options?: ToastOptions): string | number => {
    return sonnerToast.loading(message, {
      ...createToastOptions({ ...options, duration: Infinity }), // Loading toasts don't auto-dismiss
      icon: <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />,
      ...options,
    });
  }, [createToastOptions]);

  // Promise toast for async operations
  const promise = useCallback(<T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: unknown) => string);
    },
    options?: ToastOptions
  ): Promise<T> => {
    return sonnerToast.promise(promise, {
      loading: messages.loading,
      success: messages.success,
      error: messages.error,
      ...createToastOptions(options),
    }).unwrap();
  }, [createToastOptions]);

  // Management methods
  const dismiss = useCallback((toastId?: string | number) => {
    sonnerToast.dismiss(toastId);
  }, []);

  const clearAll = useCallback(() => {
    sonnerToast.dismiss();
  }, []);

  const value: ToastContextType = {
    success,
    error,
    warning,
    info,
    successWithDescription,
    errorWithDescription,
    warningWithDescription,
    infoWithDescription,
    loading,
    promise,
    dismiss,
    clearAll,
  };

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
};