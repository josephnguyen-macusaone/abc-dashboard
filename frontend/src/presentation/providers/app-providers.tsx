'use client';

import { ReactNode } from 'react';
import { ErrorBoundary } from '@/presentation/components/organisms/error-handling/error-boundary';
import { ThemeProvider } from '@/presentation/contexts';
import { ToastProvider, ErrorProvider } from '@/presentation/contexts';
import { AuthInitializer } from '@/presentation/components/atoms/auth/auth-initializer';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { RouteSuspense } from '@/presentation/components/routes/suspense-route';
import { Toaster } from '@/presentation/components/atoms';
import { ApiConnectivityBanner } from '@/presentation/components/molecules/layout/api-connectivity-banner';

/**
 * Single provider tree for the app. Order matters: outer providers wrap inner.
 * Centralizes provider composition for easier testing and maintenance.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <ErrorProvider>
            <AuthInitializer>
              <NuqsAdapter>
                <ApiConnectivityBanner />
                <RouteSuspense message="Initializing application...">
                  {children}
                </RouteSuspense>
                <Toaster />
              </NuqsAdapter>
            </AuthInitializer>
          </ErrorProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
