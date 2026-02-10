'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
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
  const { user, isAuthenticated, isLoading, canAccessProtectedRoutes } = useAuthStore();

  // Track if component has mounted on client to prevent hydration mismatch
  const [hasMounted, setHasMounted] = useState(false);

  // Mark component as mounted on client side
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Handle navigation effects in useEffect to avoid calling router during render
  useEffect(() => {
    // Only run navigation logic on client side after mounting
    if (!hasMounted || isLoading) return;

    // Get route configuration
    const routeConfig = getRouteConfig(pathname);

    // If no route config or route doesn't require auth, no navigation needed
    if (!routeConfig || !routeConfig.requireAuth) return;

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

    // Check if user needs additional verification (removed email verification)
  }, [router, pathname, user, isAuthenticated, isLoading, canAccessProtectedRoutes, hasMounted]);

  // During server-side rendering or initial client load, always show loading
  // This ensures server and client render the same initial state
  if (!hasMounted || isLoading) {
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

