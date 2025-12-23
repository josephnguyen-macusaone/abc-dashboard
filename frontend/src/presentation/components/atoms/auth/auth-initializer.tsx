'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/infrastructure/stores/auth';

/**
 * AuthInitializer Component
 *
 * Handles authentication state initialization on app startup.
 * Replaces the AuthProvider context wrapper.
 */
export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { initialize } = useAuthStore();

  useEffect(() => {
    // Initialize auth state (load from storage, setup token refresh, etc.)
    initialize();
  }, [initialize]);

  return <>{children}</>;
}
