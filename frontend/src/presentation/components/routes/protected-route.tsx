'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/presentation/contexts/auth-context';
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
  const { user, isAuthenticated, isLoading } = useAuth();
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (requireAuth && !isAuthenticated) {
      router.push(redirectTo);
      return;
    }

    if (!requireAuth && isAuthenticated) {
      // Redirect based on user role
      router.push(`/dashboard/${user?.role}`);
    }
  }, [isAuthenticated, isAdmin, isLoading, requireAuth, requireAdmin, redirectTo, router, user]);

  // Show loading while checking authentication
  if (isLoading) {
    return <LoadingOverlay text="Loading..." />;
  }

  // Show loading while checking authentication and admin status
  if (requireAuth && !isAuthenticated) {
    return <LoadingOverlay text="Loading..." />;
  }

  if (requireAuth && requireAdmin && !isAdmin) {
    return <LoadingOverlay text="Loading..." />;
  }

  return <>{children}</>;
}

