import React from 'react';
import { cn } from '@/shared/utils';
import { Loading, Typography } from '@/presentation/components/atoms';
import { Card, CardContent, CardHeader } from '@/presentation/components/atoms/primitives';

interface LoadingStateProps {
  /** The loading message to display */
  message?: string;
  /** Additional CSS classes */
  className?: string;
  /** Size variant for the loading indicator */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show in fullscreen mode */
  fullscreen?: boolean;
  /** Custom loading component */
  loadingComponent?: React.ReactNode;
}

/**
 * Consistent loading state component
 */
export function LoadingState({
  message = "Loading...",
  className,
  size = 'md',
  fullscreen = false,
  loadingComponent,
}: LoadingStateProps) {
  const content = (
    <div className={cn(
      "flex flex-col items-center justify-center gap-3 p-6",
      {
        'min-h-screen': fullscreen,
        'min-h-[200px]': !fullscreen,
      },
      className
    )}>
      {loadingComponent || <Loading size={size} />}
      {message && (
        <Typography variant="body-s" color="muted" className="text-center">
          {message}
        </Typography>
      )}
    </div>
  );

  if (fullscreen) {
    return content;
  }

  return (
    <Card className={className}>
      <CardContent className="p-0">
        {content}
      </CardContent>
    </Card>
  );
}

interface LoadingCardProps extends LoadingStateProps {
  /** Card title */
  title?: string;
  /** Card description */
  description?: string;
}

/**
 * Loading state wrapped in a card
 */
export function LoadingCard({
  title,
  description,
  message = "Loading...",
  className,
  ...props
}: LoadingCardProps) {
  return (
    <Card className={className}>
      {(title || description) && (
        <CardHeader>
          {title && <Typography variant="title-s">{title}</Typography>}
          {description && (
            <Typography variant="body-s" color="muted">
              {description}
            </Typography>
          )}
        </CardHeader>
      )}
      <CardContent>
        <LoadingState message={message} {...props} />
      </CardContent>
    </Card>
  );
}

interface LoadingSkeletonProps {
  /** Number of skeleton lines to show */
  lines?: number;
  /** Whether to show avatar skeleton */
  showAvatar?: boolean;
  /** Custom className */
  className?: string;
  /** Skeleton height */
  height?: string;
}

/**
 * Skeleton loading component for content
 */
export function LoadingSkeleton({
  lines = 3,
  showAvatar = false,
  className,
  height = "h-4",
}: LoadingSkeletonProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {showAvatar && (
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
          <div className="space-y-2 flex-1">
            <div className={cn("bg-muted animate-pulse rounded", height)} />
            <div className={cn("bg-muted animate-pulse rounded w-3/4", height)} />
          </div>
        </div>
      )}

      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "bg-muted animate-pulse rounded",
            height,
            index === lines - 1 ? "w-3/4" : "w-full"
          )}
        />
      ))}
    </div>
  );
}

interface AsyncWrapperProps<T> {
  /** Data that might be loading */
  data: T | null | undefined;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error?: string | null;
  /** Loading message */
  loadingMessage?: string;
  /** Error message */
  errorMessage?: string;
  /** Empty state message */
  emptyMessage?: string;
  /** Children to render when data is available */
  children: (data: T) => React.ReactNode;
  /** Custom loading component */
  loadingComponent?: React.ReactNode;
  /** Custom error component */
  errorComponent?: React.ReactNode;
  /** Custom empty component */
  emptyComponent?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Wrapper component that handles loading, error, and empty states
 */
export function AsyncWrapper<T>({
  data,
  isLoading,
  error,
  loadingMessage = "Loading...",
  errorMessage,
  emptyMessage = "No data available",
  children,
  loadingComponent,
  errorComponent,
  emptyComponent,
  className,
}: AsyncWrapperProps<T>) {
  if (isLoading) {
    return loadingComponent || (
      <LoadingState message={loadingMessage} className={className} />
    );
  }

  if (error) {
    return errorComponent || (
      <div className={cn("flex items-center justify-center p-6", className)}>
        <div className="text-center">
          <Typography variant="body-s" color="destructive" className="mb-2">
            {errorMessage || error}
          </Typography>
        </div>
      </div>
    );
  }

  if (!data) {
    return emptyComponent || (
      <div className={cn("flex items-center justify-center p-6", className)}>
        <Typography variant="body-s" color="muted">
          {emptyMessage}
        </Typography>
      </div>
    );
  }

  return <>{children(data)}</>;
}

// Export default loading component for convenience
export { LoadingState as default };