'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
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

  // Handle navigation effects in useEffect to avoid calling router during render
  useEffect(() => {
    if (isLoading) return;
    const routeConfig = getRouteConfig(pathname);
    if (!routeConfig || !routeConfig.requireAuth) return;

    const hasAccess = canAccessRoute(pathname, user?.role);

    if (!hasAccess) {
      if (!isAuthenticated) {
        if (pathname !== '/login') router.replace('/login');
        return;
      }
      const redirectPath = getDefaultRedirect(user?.role);
      router.push(redirectPath);
    }
  }, [router, pathname, user?.role, isAuthenticated, isLoading]);

  if (isLoading) {
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

