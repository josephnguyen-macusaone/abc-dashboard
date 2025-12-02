'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthStore } from '@/infrastructure/stores/auth-store';
import { LoadingOverlay } from '@/presentation/components/atoms';
import { getRouteConfig, canAccessRoute, getDefaultRedirect } from '@/shared/constants/routes';

// Check if we're on the client side
const isClient = typeof window !== 'undefined';

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

  // During server-side rendering or initial client load, show loading
  if (!isClient || isLoading) {
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

  // If user doesn't have access, show fallback or redirect
  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }

    // Fallback redirect logic for client-side navigation
    if (!isAuthenticated) {
      router.push('/login');
      return <LoadingOverlay text="Redirecting to login..." />;
  }

    // User is authenticated but doesn't have permission
    const redirectPath = getDefaultRedirect(user?.role);
    router.push(redirectPath);
    return <LoadingOverlay text="Redirecting..." />;
  }

  // Check if user needs email verification
  if (isAuthenticated && user && !canAccessProtectedRoutes()) {
    router.push(`/verify-email?email=${encodeURIComponent(user.email || '')}`);
    return <LoadingOverlay text="Redirecting to email verification..." />;
  }

  return <>{children}</>;
}

