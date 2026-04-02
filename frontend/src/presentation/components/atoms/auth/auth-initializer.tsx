'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/infrastructure/stores/auth';
import { LoadingOverlay } from '@/presentation/components/atoms';

/**
 * AuthInitializer Component
 *
 * Blocks rendering until initialize() has verified the HttpOnly cookie via getProfile().
 * Without this gate, pages mount and fire API calls before auth is confirmed, causing
 * a 401 → refresh → retry cycle on every navigation.
 */
export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((s) => s.initialize);
  const isLoading = useAuthStore((s) => s.isLoading);

  useEffect(() => {
    void initialize().catch(() => {
      // initialize() is written to resolve; this only guards third-party / future throws
    });
  }, [initialize]);

  if (isLoading) {
    return <LoadingOverlay text="Authenticating..." />;
  }

  return <>{children}</>;
}
