'use client';

import React, { createContext, useContext, ReactNode, useCallback, useEffect } from 'react';
import { useToast } from '@/presentation/hooks/use-toast';
import { ApiException } from '@/infrastructure/api/types';
import logger from '@/shared/utils/logger';

interface ErrorContextType {
  handleError: (error: any, context?: string) => void;
  handleApiError: (error: any, context?: string) => void;
  handleAuthError: (error: any) => void;
  handleNetworkError: (error: any) => void;
  clearErrors: () => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

export const useErrorHandler = () => {
  const context = useContext(ErrorContext);
  if (context === undefined) {
    throw new Error('useErrorHandler must be used within an ErrorProvider');
  }
  return context;
};

interface ErrorProviderProps {
  children: ReactNode;
}

export const ErrorProvider: React.FC<ErrorProviderProps> = ({ children }) => {
  const { showError, showNetworkError, showServerError } = useToast();

  // Global error handlers
  useEffect(() => {
    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      logger.error('Unhandled promise rejection', { error: event.reason });
      event.preventDefault(); // Prevent the default browser behavior

      // Show error toast for unhandled rejections
      const error = event.reason;
      if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
        showNetworkError();
      } else {
        showError('Unexpected Error', error);
      }
    };

    // Handle uncaught errors (though React should handle most of these)
    const handleUncaughtError = (event: ErrorEvent) => {
      logger.error('Uncaught error', { error: event.error, message: event.message });
      event.preventDefault();

      showError('Unexpected Error', { message: event.message });
    };

    // Handle network status changes
    const handleOnline = () => {
      logger.info('Network connection restored');
      // Could show a success toast here if needed
    };

    const handleOffline = () => {
      logger.warn('Network connection lost');
      showNetworkError();
    };

    // Add event listeners
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleUncaughtError);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleUncaughtError);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showError, showNetworkError]);

  const handleApiError = useCallback((error: any, context: string = 'API Error') => {
    logger.error(`API Error in ${context}:`, { error, context });

    // If it's already an ApiException, use it directly
    if (error instanceof ApiException) {
      showError(context, error);
      return;
    }

    // Handle network errors
    if (!error.response && error.request) {
      showNetworkError();
      return;
    }

    // Handle server errors
    if (error.response?.status >= 500) {
      showServerError();
      return;
    }

    // Handle other API errors with user-friendly messages
    showError(context, error);
  }, [showError, showNetworkError, showServerError]);

  const handleAuthError = useCallback((error: any) => {
    handleApiError(error, 'Authentication Error');
  }, [handleApiError]);

  const handleNetworkError = useCallback((error: any) => {
    logger.error('Network Error:', { error });
    showNetworkError();
  }, [showNetworkError]);

  const handleError = useCallback((error: any, context: string = 'Error') => {
    logger.error(`General Error in ${context}:`, { error, context });

    // For general errors, show a generic error toast
    showError(context, error);
  }, [showError]);

  const clearErrors = useCallback(() => {
    // This could be used to clear any global error states if needed
    logger.debug('Clearing global errors');
  }, []);

  const value: ErrorContextType = {
    handleError,
    handleApiError,
    handleAuthError,
    handleNetworkError,
    clearErrors,
  };

  return (
    <ErrorContext.Provider value={value}>
      {children}
    </ErrorContext.Provider>
  );
};
