'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/infrastructure/stores/auth';
import { LoadingOverlay } from '@/presentation/components/atoms';
import { getRoleDashboardPath, ROUTES } from '@/shared/constants/routes';

/**
 * Middleware normally redirects /dashboard → role path. This page still mounts when
 * edge/client state diverges (e.g. expired JWT fixed client-side, or getProfile failed).
 * Never return null — that produced a blank screen.
 */
export default function DashboardPage() {
  const router = useRouter();
  const isLoading = useAuthStore((s) => s.isLoading);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated && user) {
      const target = getRoleDashboardPath(user.role);
      if (target !== ROUTES.DASHBOARD) {
        router.replace(target);
      } else {
        router.replace(ROUTES.PROFILE);
      }
      return;
    }

    const loginUrl = new URL(ROUTES.LOGIN, window.location.origin);
    loginUrl.searchParams.set('redirect', ROUTES.DASHBOARD);
    router.replace(`${loginUrl.pathname}${loginUrl.search}`);
  }, [isLoading, isAuthenticated, user, router]);

  return <LoadingOverlay text="Redirecting…" />;
}
