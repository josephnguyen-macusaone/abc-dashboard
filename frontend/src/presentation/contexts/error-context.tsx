'use client';

import React, { createContext, useContext, ReactNode, useCallback, useEffect, useState, useMemo } from 'react';
import { toast } from '@/presentation/components/atoms';
import { ApiException } from '@/infrastructure/api/types';
import logger from '@/shared/utils/logger';
import { RetryUtils } from '@/shared/utils/retry';

interface ErrorContextType {
  handleError: (error: any, context?: string) => void;
  handleApiError: (error: any, context?: string) => void;
  handleAuthError: (error: any) => void;
  handleNetworkError: (error: any) => void;
  clearErrors: () => void;
  // Recovery mechanisms
  attemptRecovery: (error: any, recoveryFn: () => Promise<any>, context?: string) => Promise<boolean>;
  isRecovering: boolean;
  recoveryAttempts: number;
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
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryAttempts, setRecoveryAttempts] = useState(0);

  // Global error handlers
  useEffect(() => {
    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      logger.error('Unhandled promise rejection', { error: event.reason });
      event.preventDefault(); // Prevent the default browser behavior

      // Show error toast for unhandled rejections
      const error = event.reason;
      const errorMessage = (error as Error)?.message || '';
      if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        toast.error('Network Error', {
          description: 'Please check your connection and try again.'
        });
      } else {
        toast.error('Unexpected Error', {
          description: 'An unexpected error occurred. Please try again.'
        });
      }
    };

    // Handle uncaught errors (though React should handle most of these)
    const handleUncaughtError = (event: ErrorEvent) => {
      logger.error('Uncaught error', { error: event.error, message: event.message });
      event.preventDefault();

      toast.error('Unexpected Error', {
        description: event.message || 'An unexpected error occurred.'
      });
    };

    // Handle network status changes
    const handleOnline = () => {
      logger.info('Network connection restored');
      // Could show a success toast here if needed
    };

    const handleOffline = () => {
      logger.warn('Network connection lost');
      toast.error('Connection Lost', {
        description: 'Please check your network connection.'
      });
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
  }, []);

  // Comprehensive error message mapping
  const ERROR_MESSAGE_MAP: Record<string, string> = useMemo(() => ({
    // Network errors
    'Network Error': 'Connection lost. Please check your internet connection and try again.',
    'Failed to fetch': 'Unable to connect to our servers. Please check your connection.',
    'Load failed': 'Failed to load content. Please refresh the page.',
    'Timeout': 'Request timed out. Please try again.',

    // Authentication errors
    'Invalid credentials': 'The email or password you entered is incorrect. Please check and try again.',
    'Invalid email or password': 'The email or password you entered is incorrect. Please check and try again.',
    'Account is deactivated': 'Your account has been deactivated. Please contact support for assistance.',
    'Account temporarily locked': 'Your account is temporarily locked due to too many failed attempts. Please try again later.',
    'Your session has expired': 'Your session has expired for security reasons. Please sign in again.',
    'Invalid authentication token': 'Your session is invalid. Please sign in again.',
    'Authentication token is required': 'You need to be signed in to access this feature.',
    'Please verify your email': 'Please verify your email address before continuing.',
    'Email not verified': 'Please verify your email address before continuing.',

    // Authorization errors
    'You do not have permission': 'You don\'t have permission to perform this action.',
    'Insufficient permissions': 'You don\'t have the required permissions for this action.',
    'Access denied': 'Access denied. You don\'t have permission to view this content.',
    'Forbidden': 'You don\'t have permission to access this resource.',

    // Validation errors
    'Required field is missing': 'Please fill in all required fields.',
    'Invalid input provided': 'Please check your input and try again.',
    'Please provide a valid email': 'Please enter a valid email address.',
    'Password must be at least': 'Password must be at least 8 characters long with uppercase, lowercase, and numbers.',
    'Passwords do not match': 'The passwords you entered don\'t match. Please try again.',
    'Invalid email format': 'Please enter a valid email address.',
    'First name and last name': 'Please provide both first and last names.',
    'Invalid field value': 'Please check the entered information and try again.',

    // Resource errors
    'User not found': 'The requested user could not be found.',
    'Resource not found': 'The requested item could not be found.',
    'Page not found': 'The page you\'re looking for doesn\'t exist.',
    'Endpoint not found': 'The requested feature is not available.',

    // Business logic errors
    'Email already exists': 'An account with this email address already exists.',
    'An account with this email': 'An account with this email address already exists.',
    'Business rule violation': 'This action cannot be completed due to business rules.',

    // Server errors
    'Internal server error': 'Something went wrong on our end. Please try again later.',
    'An unexpected error occurred': 'An unexpected error occurred. Please try again.',
    'Server error': 'Our servers are experiencing issues. Please try again later.',
    'Service unavailable': 'Service is temporarily unavailable. Please try again later.',
    'Database error': 'We\'re experiencing technical difficulties. Please try again later.',

    // Rate limiting
    'Too many requests': 'Too many requests. Please wait a moment before trying again.',
    'Rate limit exceeded': 'You\'ve made too many requests. Please wait before trying again.',

    // File operations
    'File size exceeds': 'The file you selected is too large. Please choose a smaller file.',
    'File type not allowed': 'This file type is not supported. Please choose a different file.',
    'Upload failed': 'Failed to upload file. Please try again.',

    // Generic fallbacks
    'Bad Request': 'The request was invalid. Please check your input.',
    'Unauthorized': 'You need to be signed in to access this feature.',
    'Payment Required': 'Payment is required to access this feature.',
    'Method Not Allowed': 'This action is not allowed.',
    'Not Acceptable': 'The request format is not acceptable.',
    'Proxy Authentication Required': 'Proxy authentication is required.',
    'Request Timeout': 'The request timed out. Please try again.',
    'Conflict': 'There was a conflict with your request. Please try again.',
    'Gone': 'This resource is no longer available.',
    'Length Required': 'Request length is required.',
    'Precondition Failed': 'Request preconditions failed.',
    'Payload Too Large': 'The request data is too large.',
    'URI Too Long': 'The request URL is too long.',
    'Unsupported Media Type': 'The request format is not supported.',
    'Range Not Satisfiable': 'The requested range is not available.',
    'Expectation Failed': 'Request expectations failed.',
    'I\'m a teapot': 'I\'m a teapot.', // Easter egg for 418
    'Misdirected Request': 'Request was misdirected.',
    'Unprocessable Entity': 'The request data is invalid.',
    'Locked': 'Resource is locked.',
    'Failed Dependency': 'Request failed due to dependency.',
    'Too Early': 'Request was sent too early.',
    'Upgrade Required': 'Protocol upgrade is required.',
    'Precondition Required': 'Request preconditions are required.',
    'Too Many Requests': 'Too many requests. Please wait.',
    'Request Header Fields Too Large': 'Request headers are too large.',
    'Unavailable For Legal Reasons': 'Resource unavailable for legal reasons.',
  }), []);

  // Error categorization for better handling
  const getErrorCategory = useCallback((error: any): string => {
    if (!error.response) return 'network';

    const status = error.response.status;
    const message = (error.message || error.response?.data?.message || '').toLowerCase();

    if (status >= 400 && status < 500) {
      if (status === 401 || status === 403) return 'auth';
      if (status === 400 && message.includes('validation')) return 'validation';
      if (status === 404) return 'not_found';
      if (status === 409) return 'conflict';
      if (status === 429) return 'rate_limit';
      return 'client_error';
    }

    if (status >= 500) {
      return 'server_error';
    }

    if (message.includes('network') || message.includes('fetch')) return 'network';
    if (message.includes('timeout')) return 'timeout';

    return 'unknown';
  }, []);

  // Get user-friendly error message
  const getUserFriendlyMessage = useCallback((error: any): string => {
    const originalMessage = error.message || error.response?.data?.message || '';

    // Try exact matches first
    if (ERROR_MESSAGE_MAP[originalMessage]) {
      return ERROR_MESSAGE_MAP[originalMessage];
    }

    // Try partial matches
    for (const [pattern, friendlyMessage] of Object.entries(ERROR_MESSAGE_MAP)) {
      if (originalMessage.toLowerCase().includes(pattern.toLowerCase())) {
        return friendlyMessage as string;
      }
    }

    // Category-based fallbacks
    const category = getErrorCategory(error);
    switch (category) {
      case 'network':
        return 'Connection issue. Please check your internet and try again.';
      case 'auth':
        return 'Authentication required. Please sign in and try again.';
      case 'validation':
        return 'Please check your input and try again.';
      case 'not_found':
        return 'The requested item could not be found.';
      case 'rate_limit':
        return 'Too many requests. Please wait a moment and try again.';
      case 'server_error':
        return 'Server error. Our team has been notified. Please try again later.';
      case 'timeout':
        return 'Request timed out. Please try again.';
      default:
        // For unknown errors, provide a generic but helpful message
        if (process.env.NODE_ENV === 'development') {
          return `An error occurred: ${originalMessage}`;
        }
        return 'Something went wrong. Please try again or contact support if the problem persists.';
    }
  }, [ERROR_MESSAGE_MAP, getErrorCategory]);

  // Helper function to determine if an error is recoverable
  const isRecoverableError = useCallback((error: any): boolean => {
    // Network errors are usually recoverable
    if (!error.response) return true;

    const status = error.response.status;
    const category = getErrorCategory(error);

    // Recoverable categories and status codes
    const recoverableStatuses = [408, 429, 500, 502, 503, 504]; // Timeout, rate limit, server errors
    const recoverableCategories = ['network', 'timeout', 'server_error'];

    return recoverableStatuses.includes(status) || recoverableCategories.includes(category);
  }, [getErrorCategory]);

  const handleApiError = useCallback((error: any, context: string = 'API Error') => {
    logger.error(`API Error in ${context}:`, { error, context });

    // If it's already an ApiException, use it directly
    if (error instanceof ApiException) {
      toast.error(context, {
        description: error.message || 'An error occurred.'
      });
      return;
    }

    // Get user-friendly message using our comprehensive mapping
    const userFriendlyMessage = getUserFriendlyMessage(error);
    const category = getErrorCategory(error);

    // Determine toast title based on category
    let toastTitle = context;
    switch (category) {
      case 'network':
        toastTitle = 'Connection Error';
        break;
      case 'auth':
        toastTitle = 'Authentication Error';
        break;
      case 'validation':
        toastTitle = 'Validation Error';
        break;
      case 'rate_limit':
        toastTitle = 'Too Many Requests';
        break;
      case 'server_error':
        toastTitle = 'Server Error';
        break;
      case 'not_found':
        toastTitle = 'Not Found';
        break;
      default:
        // Keep the original context
        break;
    }

    // Handle special cases with additional actions
    if (category === 'auth' && userFriendlyMessage.includes('session')) {
      // For session expiry, suggest re-login
      toast.error(toastTitle, {
        description: userFriendlyMessage,
        action: {
          label: 'Sign In',
          onClick: () => {
            // In a real app, this would trigger a login flow
            window.location.href = '/login';
          },
        },
      });
      return;
    }

    if (category === 'rate_limit') {
      // For rate limiting, show a countdown or retry suggestion
      toast.error(toastTitle, {
        description: userFriendlyMessage + ' This usually resolves automatically.',
      });
      return;
    }

    // Default error toast
    toast.error(toastTitle, {
      description: userFriendlyMessage,
    });
  }, [getUserFriendlyMessage, getErrorCategory]);

  const handleAuthError = useCallback((error: any) => {
    handleApiError(error, 'Authentication Error');
  }, [handleApiError]);

  const handleNetworkError = useCallback((error: any) => {
    logger.error('Network Error:', { error });
    toast.error('Network Error', {
      description: 'Please check your connection and try again.'
    });
  }, []);

  const handleError = useCallback((error: any, context: string = 'Error') => {
    logger.error(`General Error in ${context}:`, { error, context });

    // For general errors, show a generic error toast
    toast.error(context, {
      description: 'An unexpected error occurred. Please try again.'
    });
  }, []);

  const clearErrors = useCallback(() => {
    // This could be used to clear any global error states if needed
    logger.debug('Clearing global errors');
  }, []);

  // Recovery mechanisms
  const attemptRecovery = useCallback(async (
    error: any,
    recoveryFn: () => Promise<any>,
    context: string = 'recovery'
  ): Promise<boolean> => {
    if (isRecovering) {
      logger.warn('Recovery already in progress, skipping new recovery attempt', { context });
      return false;
    }

    setIsRecovering(true);
    setRecoveryAttempts(prev => prev + 1);

    const correlationId = `recovery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      logger.info('Attempting automatic error recovery', {
        correlationId,
        context,
        recoveryAttempt: recoveryAttempts + 1,
      });

      // Determine if error is recoverable
      const isRecoverable = isRecoverableError(error);

      if (!isRecoverable) {
        logger.info('Error is not recoverable, skipping recovery attempt', {
          correlationId,
          context,
          error: error?.message,
        });
        return false;
      }

      // Attempt recovery with retry logic
      await RetryUtils.apiCallWithRetry(
        recoveryFn,
        {
          maxRetries: 2,
          baseDelay: 1000,
          maxDelay: 5000,
          retryCondition: (recoveryError) => {
            // Only retry network-related recovery failures
            return !recoveryError.response || recoveryError.response.status >= 500;
          },
          onRetry: (retryError, attempt, delay) => {
            logger.warn(`Recovery retry attempt ${attempt}`, {
              correlationId,
              context,
              delay,
              error: retryError?.message,
            });
          },
        },
        `${context}_recovery`
      );

      logger.info('Error recovery successful', {
        correlationId,
        context,
        recoveryAttempt: recoveryAttempts + 1,
      });

      // Show success message
      toast.success('Connection restored', {
        description: 'The issue has been automatically resolved.',
      });

      return true;

    } catch (recoveryError) {
      logger.error('Error recovery failed', {
        correlationId,
        context,
        recoveryAttempt: recoveryAttempts + 1,
        originalError: error?.message,
        recoveryError: recoveryError instanceof Error ? recoveryError.message : String(recoveryError),
      });

      // Show recovery failure message
      toast.error('Recovery failed', {
        description: 'Unable to automatically resolve the issue. Please try again.',
      });

      return false;

    } finally {
      setIsRecovering(false);
    }
  }, [isRecovering, recoveryAttempts]);

  const value: ErrorContextType = {
    handleError,
    handleApiError,
    handleAuthError,
    handleNetworkError,
    clearErrors,
    attemptRecovery,
    isRecovering,
    recoveryAttempts,
  };

  return (
    <ErrorContext.Provider value={value}>
      {children}
    </ErrorContext.Provider>
  );
};
