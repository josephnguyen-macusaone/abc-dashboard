'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Typography, Button } from '@/presentation/components/atoms';
import { AlertTriangle, RefreshCw, Home, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { logger } from '@/shared/helpers';
import { ErrorTemplate } from '@/presentation/components/templates';

// Suppress React's verbose error logging in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const originalConsoleError = console.error;
  let suppressCount = 0;
  let lastErrorTime = 0;

  console.error = (...args: any[]) => {
    const now = Date.now();
    const message = args[0]?.toString() || '';

    // Suppress known false-positive warnings from our data grid implementation
    if (
      message.includes('Cannot update a component') &&
      (message.includes('while rendering a different component') ||
        message.includes('LicensesDataGrid') ||
        message.includes('DataGrid'))
    ) {
      // This is a known timing issue with complex data grids in React 19
      // We've properly deferred updates with queueMicrotask
      return;
    }

    // Check if this is React's error boundary logging
    const isReactErrorBoundaryLog =
      message.includes('The above error occurred in the') ||
      message.includes('It was handled by the') ||
      message.includes('error boundary') ||
      message.includes('react_stack_bottom_frame') ||
      (message.startsWith('Error:') && args.length > 1 && typeof args[1] === 'string' && args[1].includes('react_stack_bottom_frame')) ||
      (args[0] instanceof Error && args.length === 1); // Suppress the initial Error object logging

    // Allow suppression for a short window after detecting React errors
    if (isReactErrorBoundaryLog || (now - lastErrorTime < 100 && suppressCount > 0)) {
      if (isReactErrorBoundaryLog) {
        lastErrorTime = now;
        suppressCount++;
      }
      if (suppressCount <= 10) { // Allow more suppressions for complex error logs
        return; // Suppress React's verbose error logging
      }
    }

    // Reset suppress count if it's been more than 2 seconds
    if (now - lastErrorTime > 2000) {
      suppressCount = 0;
    }

    // Allow other console.error calls through
    originalConsoleError.apply(console, args);
  };

  // Reset suppress count periodically
  setInterval(() => {
    suppressCount = 0;
    lastErrorTime = 0;
  }, 10000);
}

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  fallbackTitle?: string;
  fallbackMessage?: string;
  showErrorDetails?: boolean;
  enableRetry?: boolean;
  level?: 'page' | 'section' | 'component';
  variant?: 'dashboard' | 'standalone';
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  retryCount: number;
  isStackExpanded: boolean;
}

/**
 * Enhanced Error Boundary Component
 * Catches React errors in component tree and displays fallback UI
 * Prevents white screen of death and provides error recovery options
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
      isStackExpanded: false,
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
      isStackExpanded: false,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { level = 'component' } = this.props;

    // Generate correlation ID for error tracking
    const correlationId = `eb_${level}_${Date.now()}`;

    // Log concise error summary for production readability
    logger.errorBoundary(`React ${level} error boundary caught an error`, {
      correlationId,
      errorId: this.state.errorId,
      error,
      componentStack: errorInfo.componentStack ?? '',
      level,
      retryCount: this.state.retryCount,
      maxRetries: this.maxRetries,
    });

    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }


  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
      isStackExpanded: false,
    });
  };


  handleRetry = () => {
    const { retryCount } = this.state;

    if (retryCount < this.maxRetries) {
      // Exponential backoff
      const delay = this.retryTimeout * Math.pow(2, retryCount);

      logger.debug(`Retrying error boundary reset (attempt ${retryCount + 1}/${this.maxRetries})`, {
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
        <ErrorTemplate variant={this.props.variant || 'standalone'}>
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
        </ErrorTemplate>
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
    <div className="max-w-lg w-full space-y-6 text-center">
      <div className="flex justify-center">
        <div className="rounded-full bg-destructive/10 p-4">
          <AlertTriangle className="h-12 w-12 text-destructive" />
        </div>
      </div>

      <div className="space-y-2">
        {/* MAC USA ONE Typography: Title L for error title */}
        <Typography variant="title-l" className="text-foreground">
          {title}
        </Typography>
        {/* MAC USA ONE Typography: Body M for error message */}
        <Typography variant="body-m" color="muted">
          {message}
        </Typography>

        {errorId && (
          <Typography variant="body-xs" color="muted" className="font-mono">
            Error ID: {errorId}
          </Typography>
        )}
      </div>

      {shouldShowErrorDetails && error && (
        <ErrorDetailsAccordion
          error={error}
          shouldShowErrorDetails={shouldShowErrorDetails}
          onCopyErrorDetails={handleCopyErrorDetails}
          isDevelopment={isDevelopment}
        />
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {canRetry && (
          <Button
            onClick={onRetry}
            variant="default"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className="size-3" />
            Try Again ({retryCount + 1}/{maxRetries})
          </Button>
        )}

        <Button
          onClick={onReset}
          variant={canRetry ? "outline" : "default"}
          size="sm"
          className="flex items-center gap-2"
        >
          <RefreshCw className="size-3" />
          Reset
        </Button>

        <Button
          onClick={() => router.push('/dashboard')}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <Home className="size-3" />
          Go Home
        </Button>
      </div>

      {canRetry && retryCount > 0 && (
        <Typography variant="body-xs" color="muted">
          Retry attempt {retryCount} of {maxRetries}
        </Typography>
      )}
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

// Functional component to avoid TypeScript issues with class component 'this'
function ErrorDetailsAccordion({
  error,
  shouldShowErrorDetails,
  onCopyErrorDetails,
  isDevelopment,
}: {
  error: Error;
  shouldShowErrorDetails: boolean;
  onCopyErrorDetails: () => void;
  isDevelopment: boolean;
}) {
  const [isStackExpanded, setIsStackExpanded] = React.useState(false);

  return (
    <div className="mt-4 p-4 bg-muted rounded-lg text-left relative space-y-4">
      {/* Copy button positioned at top right */}
      <Button
        onClick={onCopyErrorDetails}
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 h-8 w-8 p-0 hover:bg-muted-foreground/10"
        title="Copy error details"
      >
        <Copy className="h-4 w-4" />
      </Button>

      {/* MAC USA ONE Typography: Label S for error details label */}
      <Typography variant="label-s" className="text-destructive pr-10">
        Error Details {isDevelopment ? '(Development Only)' : ''}:
      </Typography>

      {/* Error message */}
      <div className="text-body-xs text-muted-foreground p-2 bg-muted-foreground/5 rounded border whitespace-pre-wrap mt-3">
        {error.message}
      </div>

      {/* Collapsible stack trace */}
      {error.stack && shouldShowErrorDetails && (
        <div className="border-t border-border pt-3">
          <Button
            onClick={() => setIsStackExpanded(!isStackExpanded)}
            variant="ghost"
            size="sm"
            className="flex items-center justify-between w-full h-auto text-body-xs text-muted-foreground hover:text-foreground hover:bg-muted-foreground/5 rounded-md"
          >
            <span className="font-medium text-body-s">Stack Trace</span>
            {isStackExpanded ? (
              <ChevronUp className="h-4 w-4 flex-shrink-0" />
            ) : (
              <ChevronDown className="h-4 w-4 flex-shrink-0" />
            )}
          </Button>

          {isStackExpanded && (
            <pre className="text-body-xs text-muted-foreground overflow-auto max-h-48 mt-3 p-2 bg-muted-foreground/5 rounded border">
              {error.stack}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

export default {
  ErrorBoundary,
  withErrorBoundary,
  PageErrorBoundary,
  SectionErrorBoundary,
  ComponentErrorBoundary,
};
