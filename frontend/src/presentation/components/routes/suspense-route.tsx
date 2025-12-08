'use client';

import { Suspense } from 'react';
import { LoadingOverlay } from '@/presentation/components/atoms';

interface RouteSuspenseProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  message?: string;
}

/**
 * Suspense boundary for route loading states
 * Provides better UX with skeleton loading and error boundaries
 */
export function RouteSuspense({
  children,
  fallback,
  message = "Loading..."
}: RouteSuspenseProps) {
  const defaultFallback = <LoadingOverlay text={message} />;

  return (
    <Suspense fallback={fallback || defaultFallback}>
      {children}
    </Suspense>
  );
}

/**
 * Auth-aware route suspense
 * Handles loading states specifically for authenticated routes
 */
export function AuthRouteSuspense({ children }: { children: React.ReactNode }) {
  return (
    <RouteSuspense message="Authenticating...">
      {children}
    </RouteSuspense>
  );
}
