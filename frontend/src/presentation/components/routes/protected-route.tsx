'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthStore } from '@/infrastructure/stores/auth-store';
import { LoadingOverlay } from '@/presentation/components/atoms';

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
  requireAuth?: boolean;
  requireAdmin?: boolean;
}

export function ProtectedRoute({
  children,
  redirectTo = '/login',
  requireAuth = true,
  requireAdmin = false
}: ProtectedRouteProps) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, canAccessProtectedRoutes } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (requireAuth && !isAuthenticated) {
      router.push(redirectTo);
      return;
    }

    // Check if user is authenticated but not email-verified
    if (requireAuth && isAuthenticated && !canAccessProtectedRoutes()) {
      // User is logged in but email not verified - redirect to verification page
      router.push(`/verify-email?email=${encodeURIComponent(user?.email || '')}`);
      return;
    }

    if (!requireAuth && isAuthenticated && canAccessProtectedRoutes()) {
      // Redirect authenticated users away from auth pages
      router.push(`/dashboard/${user?.role}`);
    }
  }, [isAuthenticated, isAdmin, isLoading, requireAuth, requireAdmin, redirectTo, router, user, canAccessProtectedRoutes]);

  // Show loading while checking authentication
  if (isLoading) {
    return <LoadingOverlay text="Loading..." />;
  }

  // Show loading while checking authentication and admin status
  if (requireAuth && !isAuthenticated) {
    return <LoadingOverlay text="Loading..." />;
  }

  // Show loading if user is authenticated but not verified
  if (requireAuth && isAuthenticated && !canAccessProtectedRoutes()) {
    return <LoadingOverlay text="Loading..." />;
  }

  if (requireAuth && requireAdmin && !isAdmin) {
    return <LoadingOverlay text="Loading..." />;
  }

  return <>{children}</>;
}

