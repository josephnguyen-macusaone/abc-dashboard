'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, startTransition } from 'react';
import { useAuthStore } from '@/infrastructure/stores/auth';
import { LoadingOverlay } from '@/presentation/components/atoms';
import { getRouteConfig, canAccessRoute, getDefaultRedirect } from '@/shared/constants';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Simplified ProtectedRoute component
 * Most authentication logic is now handled by Next.js Middleware
 * This component provides client-side fallbacks and loading states
 */
export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const validateSession = useAuthStore((s) => s.validateSession);

  // Track if component has mounted on client to prevent hydration mismatch
  const [hasMounted, setHasMounted] = useState(false);
  const [isValidatingSession, setIsValidatingSession] = useState(false);

  // Mark component as mounted on client side
  useEffect(() => {
    startTransition(() => {
      setHasMounted(true);
    });
  }, []);

  // Handle navigation effects in useEffect to avoid calling router during render
  useEffect(() => {
    let isCancelled = false;

    async function validateAndNavigate() {
      // Only run navigation logic on client side after mounting
      if (!hasMounted || isLoading) return;

      // Get route configuration
      const routeConfig = getRouteConfig(pathname);

      // If no route config or route doesn't require auth, no navigation needed
      if (!routeConfig || !routeConfig.requireAuth) return;

      // Validate cookie-backed session with backend to avoid stale persisted auth causing
      // protected routes to render and hang in loading when token/cookie already expired.
      if (isAuthenticated) {
        setIsValidatingSession(true);
        const hasValidSession = await validateSession({
          timeoutMs: 3000,
          onNetworkError: 'logout',
        });
        if (!isCancelled) {
          setIsValidatingSession(false);
        }
        if (!hasValidSession) return;
      }

      // Check if user can access this route
      const hasAccess = canAccessRoute(pathname, user?.role);

      if (!hasAccess) {
        // If user is not authenticated, redirect to login
        if (!isAuthenticated) {
          // Only redirect if we're not already on the login page
          if (pathname !== '/login') {
            router.replace('/login');
          }
          return;
        }

        // User is authenticated but doesn't have permission - redirect based on role
        const redirectPath = getDefaultRedirect(user?.role);
        router.push(redirectPath);
        return;
      }
    }

    void validateAndNavigate();

    return () => {
      isCancelled = true;
    };
  }, [router, pathname, user?.role, isAuthenticated, isLoading, hasMounted, validateSession]);

  // During server-side rendering or initial client load, always show loading
  // This ensures server and client render the same initial state
  if (!hasMounted || isLoading || isValidatingSession) {
    return <LoadingOverlay text="Loading..." />;
  }

  // Get route configuration
  const routeConfig = getRouteConfig(pathname);

  // If no route config, allow access (public routes)
  if (!routeConfig) {
    return <>{children}</>;
  }

  // Check if user can access this route
  const hasAccess = canAccessRoute(pathname, user?.role);

  // If user doesn't have access, show fallback or loading (navigation handled in useEffect)
  if (!hasAccess) {
    // If user is not authenticated, show loading (will redirect via useEffect)
    if (!isAuthenticated) {
      return <LoadingOverlay text="Loading..." />;
    }

    // User is authenticated but doesn't have permission - show fallback or loading
    if (fallback) {
      return <>{fallback}</>;
    }

    // Show loading while redirecting (navigation handled in useEffect)
    return <LoadingOverlay text="Loading..." />;
  }

  return <>{children}</>;
}

