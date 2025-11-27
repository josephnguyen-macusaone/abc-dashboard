'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Typography, Button } from '@/presentation/components/atoms';
import { AlertTriangle, RefreshCw, Home, Bug, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { logger } from '@/shared/utils';
import { useErrorHandler } from '@/presentation/contexts/error-context';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  fallbackTitle?: string;
  fallbackMessage?: string;
  showErrorDetails?: boolean;
  enableRetry?: boolean;
  level?: 'page' | 'section' | 'component';
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  retryCount: number;
}

/**
 * Enhanced Error Boundary Component
 * Catches React errors in component tree and displays fallback UI
 * Prevents white screen of death and provides error recovery options
 *
 * Features:
 * - Error reporting and tracking
 * - Automatic retry mechanisms
 * - Configurable fallback UI
 * - Error boundary levels (page/section/component)
 * - Integration with error context
 *
 * Placement: organisms/common (cross-cutting infrastructure component)
 * MVVM: Pure View layer - no ViewModel or Model dependencies
 * Atomic Design: Organism level - complex, reusable UI section
 */
export class ErrorBoundary extends Component<Props, State> {
  private maxRetries: number = 3;
  private retryTimeout: number = 1000;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
      hasError: true,
      error,
      errorInfo: null,
      errorId,
      retryCount: 0,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { level = 'component' } = this.props;

    // Generate correlation ID for error tracking
    const correlationId = `eb_${level}_${Date.now()}`;

    // Log error with enhanced metadata
    logger.errorBoundary(`React ${level} error boundary caught an error`, {
      correlationId,
      errorId: this.state.errorId,
      error,
      componentStack: errorInfo.componentStack ?? '',
      errorBoundary: {
        level,
        retryCount: this.state.retryCount,
        maxRetries: this.maxRetries,
      },
    });

    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Report error locally for debugging
    this.reportError(error, errorInfo, correlationId);
  }

  private reportError = (error: Error, errorInfo: ErrorInfo, correlationId: string) => {
    // Log error locally with detailed metadata
    logger.errorBoundary('Error boundary caught an error', {
      correlationId,
      errorId: this.state.errorId,
      error: error,
      stack: error.stack,
      componentStack: errorInfo.componentStack ?? '',
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      retryCount: this.state.retryCount,
      errorBoundary: {
        level: this.props.level,
        enableRetry: this.props.enableRetry,
      },
    });
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
    });
  };

  handleRetry = () => {
    const { retryCount } = this.state;

    if (retryCount < this.maxRetries) {
      // Exponential backoff
      const delay = this.retryTimeout * Math.pow(2, retryCount);

      logger.info(`Retrying error boundary reset (attempt ${retryCount + 1}/${this.maxRetries})`, {
        errorId: this.state.errorId,
        delay,
      });

      setTimeout(() => {
        this.setState(prevState => ({
          hasError: false,
          error: null,
          errorInfo: null,
          errorId: null,
          retryCount: prevState.retryCount + 1,
        }));
      }, delay);
    }
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onReset={this.handleReset}
          onRetry={this.props.enableRetry ? this.handleRetry : undefined}
          title={this.props.fallbackTitle}
          message={this.props.fallbackMessage}
          showErrorDetails={this.props.showErrorDetails}
          errorId={this.state.errorId}
          retryCount={this.state.retryCount}
          maxRetries={this.maxRetries}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  onReset: () => void;
  onRetry?: () => void;
  title?: string;
  message?: string;
  showErrorDetails?: boolean;
  errorId?: string | null;
  retryCount?: number;
  maxRetries?: number;
}

function ErrorFallback({
  error,
  errorInfo,
  onReset,
  onRetry,
  title = "Something went wrong",
  message = "We're sorry, but something unexpected happened. Please try again or contact support if the problem persists.",
  showErrorDetails,
  errorId,
  retryCount = 0,
  maxRetries = 3
}: ErrorFallbackProps) {
  const router = useRouter();
  const isDevelopment = process.env.NODE_ENV === 'development';
  const shouldShowErrorDetails = showErrorDetails || isDevelopment;
  const canRetry = onRetry && retryCount < maxRetries;

  const handleCopyErrorDetails = () => {
    const errorDetails = {
      errorId,
      message: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      retryCount,
    };

    navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2))
      .then(() => {
        alert('Error details copied to clipboard for debugging.');
      })
      .catch(() => {
        alert('Could not copy error details. Please check the browser console.');
      });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-lg w-full space-y-6 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-destructive/10 p-4">
            <AlertTriangle className="h-12 w-12 text-destructive" />
          </div>
        </div>

        <div className="space-y-2">
          <Typography variant="h1" size="xl" weight="bold" className="text-foreground">
            {title}
          </Typography>
          <Typography variant="p" size="sm" color="muted" className="text-muted-foreground">
            {message}
          </Typography>

          {errorId && (
            <Typography variant="p" size="xs" color="muted" className="text-muted-foreground font-mono">
              Error ID: {errorId}
            </Typography>
          )}
        </div>

        {shouldShowErrorDetails && error && (
          <div className="mt-4 p-4 bg-muted rounded-lg text-left">
            <Typography variant="p" size="xs" weight="medium" className="text-destructive mb-2">
              Error Details {isDevelopment ? '(Development Only)' : ''}:
            </Typography>
            <pre className="text-xs text-muted-foreground overflow-auto max-h-32">
              {error.message}
              {error.stack && shouldShowErrorDetails && (
                <>
                  {'\n\n'}
                  {error.stack}
                </>
              )}
            </pre>

            <div className="mt-3 pt-3 border-t border-border">
              <Typography variant="p" size="xs" color="muted" className="mb-2">
                Copy error details for debugging or support.
              </Typography>
              <Button
                onClick={handleCopyErrorDetails}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                Copy Error Details
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {canRetry && (
            <Button
              onClick={onRetry}
              variant="default"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again ({retryCount + 1}/{maxRetries})
            </Button>
          )}

          <Button
            onClick={onReset}
            variant={canRetry ? "outline" : "default"}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Reset
          </Button>

          <Button
            onClick={() => router.push('/dashboard')}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Home className="h-4 w-4" />
            Go Home
          </Button>
        </div>

        {canRetry && retryCount > 0 && (
          <Typography variant="p" size="xs" color="muted" className="text-muted-foreground">
            Retry attempt {retryCount} of {maxRetries}
          </Typography>
        )}
      </div>
    </div>
  );
}

/**
 * Hook-based Error Boundary wrapper for functional components
 * Use this when you need error boundaries in functional components
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    fallback?: ReactNode;
    fallbackTitle?: string;
    fallbackMessage?: string;
    showErrorDetails?: boolean;
    enableRetry?: boolean;
    level?: 'page' | 'section' | 'component';
  }
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary
        fallback={options?.fallback}
        fallbackTitle={options?.fallbackTitle}
        fallbackMessage={options?.fallbackMessage}
        showErrorDetails={options?.showErrorDetails}
        enableRetry={options?.enableRetry}
        level={options?.level}
      >
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

/**
 * Specialized error boundary for page-level components
 */
export function PageErrorBoundary({
  children,
  ...props
}: Omit<Props, 'level'> & { children: ReactNode }) {
  return (
    <ErrorBoundary
      level="page"
      enableRetry={true}
      showErrorDetails={true}
      {...props}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Specialized error boundary for section-level components
 */
export function SectionErrorBoundary({
  children,
  ...props
}: Omit<Props, 'level'> & { children: ReactNode }) {
  return (
    <ErrorBoundary
      level="section"
      enableRetry={true}
      {...props}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Specialized error boundary for small component-level components
 */
export function ComponentErrorBoundary({
  children,
  ...props
}: Omit<Props, 'level'> & { children: ReactNode }) {
  return (
    <ErrorBoundary
      level="component"
      enableRetry={false}
      showErrorDetails={false}
      {...props}
    >
      {children}
    </ErrorBoundary>
  );
}

export default {
  ErrorBoundary,
  withErrorBoundary,
  PageErrorBoundary,
  SectionErrorBoundary,
  ComponentErrorBoundary,
};
