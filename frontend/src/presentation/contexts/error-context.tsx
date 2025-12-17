'use client';

import React, { createContext, useContext, ReactNode, useCallback, useEffect, useState } from 'react';
import { useToast } from './toast-context';
import { ApiExceptionDto } from '@/application/dto/api-dto';
import { handleApiError as processApiError } from '@/infrastructure/api/errors';
import logger from '@/shared/utils/logger';
import { RetryUtils } from '@/shared/utils/retry';

/**
 * Error Context Type
 * Defines the contract for the error context
 */
interface ErrorContextType {
  handleError: (error: unknown, context?: string) => void;
  handleApiError: (error: unknown, context?: string) => void;
  handleAuthError: (error: unknown) => void;
  handleNetworkError: (error: unknown) => void;
  clearErrors: () => void;
  attemptRecovery: (error: unknown, recoveryFn: () => Promise<unknown>, context?: string) => Promise<boolean>;
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
  const toast = useToast();
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryAttempts, setRecoveryAttempts] = useState(0);

  // Global error event handlers
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      event.preventDefault();

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

    const handleUncaughtError = (event: ErrorEvent) => {
      event.preventDefault();
      toast.error('Unexpected Error', {
        description: event.message || 'An unexpected error occurred.'
      });
    };

    const handleOffline = () => {
      toast.error('Connection Lost', {
        description: 'Please check your network connection.'
      });
    };

    // Register global error handlers
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleUncaughtError);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleUncaughtError);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  // ============================================================================
  // Error Handling Utilities
  // ============================================================================

  const getUserFriendlyMessage = useCallback((error: any): string => {
    const errorMessage = (
      error?.message ||
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.data?.message ||
      error?.data?.error ||
      String(error)
    ).toLowerCase();

    // Comprehensive error message mapping
    const ERROR_MESSAGE_MAP: Record<string, string> = {
      // Network errors
      'network error': 'Connection lost. Please check your internet connection and try again.',
      'failed to fetch': 'Unable to connect to our servers. Please check your connection.',
      'load failed': 'Failed to load content. Please refresh the page.',
      'timeout': 'Request timed out. Please try again.',

      // Authentication errors
      'invalid credentials': 'The email or password you entered is incorrect. Please check and try again.',
      'invalid email or password': 'The email or password you entered is incorrect. Please check and try again.',
      'account is deactivated': 'Your account has been deactivated. Please contact support for assistance.',
      'account temporarily locked': 'Your account is temporarily locked due to too many failed attempts. Please try again later.',
      'your session has expired': 'Your session has expired for security reasons. Please sign in again.',
      'invalid authentication token': 'Your session is invalid. Please sign in again.',
      'authentication token is required': 'You need to be signed in to access this feature.',
      'please verify your email': 'Please verify your email address before continuing.',
      'email not verified': 'Please verify your email address before continuing.',

      // Authorization errors
      'you do not have permission': 'You don\'t have permission to perform this action.',
      'insufficient permissions': 'You don\'t have the required permissions for this action.',
      'access denied': 'Access denied. You don\'t have permission to view this content.',
      'forbidden': 'You don\'t have permission to access this resource.',

      // Validation errors
      'required field is missing': 'Please fill in all required fields.',
      'invalid input provided': 'Please check your input and try again.',
      'please provide a valid email': 'Please enter a valid email address.',
      'password must be at least': 'Password must be at least 8 characters long with uppercase, lowercase, and numbers.',
      'passwords do not match': 'The passwords you entered don\'t match. Please try again.',
      'invalid email format': 'Please enter a valid email address.',
      'first name and last name': 'Please provide both first and last names.',
      'invalid field value': 'Please check the entered information and try again.',

      // Resource errors
      'user not found': 'The requested user could not be found.',
      'resource not found': 'The requested item could not be found.',
      'page not found': 'The page you\'re looking for doesn\'t exist.',
      'endpoint not found': 'The requested feature is not available.',

      // Business logic errors
      'email already exists': 'An account with this email address already exists.',
      'an account with this email': 'An account with this email address already exists.',
      'business rule violation': 'This action cannot be completed due to business rules.',

      // Server errors
      'internal server error': 'Something went wrong on our end. Please try again later.',
      'an unexpected error occurred': 'An unexpected error occurred. Please try again.',
      'server error': 'Our servers are experiencing issues. Please try again later.',
      'service unavailable': 'Service is temporarily unavailable. Please try again later.',
      'database error': 'We\'re experiencing technical difficulties. Please try again later.',

      // Rate limiting
      'too many requests': 'Too many requests. Please wait a moment before trying again.',
      'rate limit exceeded': 'You\'ve made too many requests. Please wait before trying again.',

      // File operations
      'file size exceeds': 'The file you selected is too large. Please choose a smaller file.',
      'file type not allowed': 'This file type is not supported. Please choose a different file.',
      'upload failed': 'Failed to upload file. Please try again.',

      // Generic fallbacks
      'bad request': 'The request was invalid. Please check your input.',
      'unauthorized': 'You need to be signed in to access this feature.',
      'payment required': 'Payment is required to access this feature.',
      'method not allowed': 'This action is not allowed.',
      'not acceptable': 'The request format is not acceptable.',
      'proxy authentication required': 'Proxy authentication is required.',
      'request timeout': 'The request timed out. Please try again.',
      'conflict': 'There was a conflict with your request. Please try again.',
      'gone': 'This resource is no longer available.',
      'length required': 'Request length is required.',
      'precondition failed': 'Request preconditions failed.',
      'payload too large': 'The request data is too large.',
      'uri too long': 'The request URL is too long.',
      'unsupported media type': 'The request format is not supported.',
      'range not satisfiable': 'The requested range is not available.',
      'expectation failed': 'Request expectations failed.',
      'i\'m a teapot': 'I\'m a teapot.', // Easter egg for 418
      'misdirected request': 'Request was misdirected.',
      'unprocessable entity': 'The request data is invalid.',
      'locked': 'Resource is locked.',
      'failed dependency': 'Request failed due to dependency.',
      'too early': 'Request was sent too early.',
      'upgrade required': 'Protocol upgrade is required.',
      'precondition required': 'Request preconditions are required.',
      'request header fields too large': 'Request headers are too large.',
      'unavailable for legal reasons': 'Resource unavailable for legal reasons.',
    };

    return ERROR_MESSAGE_MAP[errorMessage] || 'An unexpected error occurred. Please try again.';
  }, []);

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


  // ============================================================================
  // Error Recovery
  // ============================================================================

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

  // ============================================================================
  // Public API Methods
  // ============================================================================

  const handleApiError = useCallback((error: any, context: string = 'API Error') => {
    logger.error(`API Error in ${context}:`, { error, context });

    // If it's already an ApiException, use it directly
    if (error instanceof ApiExceptionDto) {
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

    // Skip showing toasts for authentication errors since HTTP client handles logout automatically
    if (category === 'auth') {
      // Log the error but don't show toast - HTTP client will handle logout and redirect
      logger.warn(`Authentication error handled automatically: ${userFriendlyMessage}`, {
        error: error?.message,
        category: 'auth-error-handled',
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
    // Only log auth errors, don't show toast - forms handle their own error UI
    const errorResponse = processApiError(error);
    logger.error(`Authentication Error: ${errorResponse.message}`, {
      statusCode: errorResponse.status,
      errorCode: errorResponse.code,
      category: 'auth-error',
      details: errorResponse.details,
    });
  }, []);

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
      // Determine if error is recoverable
      const isRecoverable = isRecoverableError(error);

      if (!isRecoverable) {
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
