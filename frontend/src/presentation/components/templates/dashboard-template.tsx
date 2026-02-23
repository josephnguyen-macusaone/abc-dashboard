'use client';

import { LoadingOverlay } from '@/presentation/components/atoms';
import { AppSidebar, AppHeader, MobileOverlay } from '@/presentation/components/organisms';
import { SectionErrorBoundary } from '@/presentation/components/organisms/error-handling/error-boundary';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ReactNode, useMemo, useCallback, useTransition, useEffect, useRef, useState } from 'react';
import { useToast } from '@/presentation/contexts';
import { PermissionUtils, getNavigationItems } from '@/shared/constants';
import { useSidebarStore, useAuthStore, useLicenseStore, useDataTableStore } from '@/infrastructure/stores';
import { SyncInProgressBanner } from '@/presentation/components/molecules/domain/dashboard';
import { useRealtimeSync } from '@/presentation/hooks/use-realtime-sync';

/** Routes that display license data; avoid resetting when navigating between these. */
const LICENSE_ROUTES = ['/dashboard', '/licenses'];

/** Table ID used by LicensesDataTable on dashboard; clear its search/filters when leaving license routes. */
const LICENSES_TABLE_ID = 'licenses-data-table';

interface DashboardTemplateProps {
  children: ReactNode;
}

export function DashboardTemplate({ children }: DashboardTemplateProps) {
  const { user, logout, isAuthenticated, isLoading } = useAuthStore();
  const toast = useToast();
  const [isTransitioning, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const resetLicenseDataForRouteChange = useLicenseStore(state => state.resetLicenseDataForRouteChange);
  const clearTableFilters = useDataTableStore(state => state.clearTableFilters);
  const prevPathRef = useRef<string | null>(null);

  // Reset license store and data table search/filters when navigating away from license pages
  // to prevent stale data and searchbar persisting when returning
  useEffect(() => {
    const isLicenseRoute = LICENSE_ROUTES.some(r => pathname === r || pathname.startsWith(`${r}/`));
    const wasLicenseRoute = prevPathRef.current !== null && LICENSE_ROUTES.some(r => prevPathRef.current === r || prevPathRef.current?.startsWith(`${r}/`));

    if (wasLicenseRoute && !isLicenseRoute) {
      resetLicenseDataForRouteChange();
      clearTableFilters(LICENSES_TABLE_ID);
    }
    prevPathRef.current = pathname;
  }, [pathname, resetLicenseDataForRouteChange, clearTableFilters]);

  // Use global sidebar store
  const { isMobile, isCollapsed, toggleCollapsed } = useSidebarStore();
  const sidebarOpen = !isMobile ? true : !isCollapsed;

  // WebSocket real-time sync (Phase 2); no-op when not authenticated
  useRealtimeSync();

  // Get navigation items based on user role
  const navigationItems = useMemo(() => {
    const items = getNavigationItems(user?.role);
    return items;
  }, [user?.role]);

  // Get current path including search params for active navigation highlighting
  const currentPath = useMemo(() => {
    const search = searchParams.toString();
    const fullPath = search ? `${pathname}?${search}` : pathname;
    return fullPath;
  }, [pathname, searchParams]);

  // ALL hooks must be called before any conditional returns
  const handleLogout = useCallback(async () => {
    await toast.promise(
      logout(),
      {
        loading: 'Logging out...',
        success: () => {
          // Navigate after successful logout to prevent state update on unmounted component
          setTimeout(() => router.replace('/login'), 100);
          return 'Logged out successfully!';
        },
        error: (error: unknown) => {
          return (error as { message?: string })?.message || 'Failed to logout';
        }
      }
    );
  }, [logout, router, toast]);

  const handleProfileClick = useCallback(() => {
    router.push('/profile');
  }, [router]);

  const handleNavigate = useCallback((href: string) => {
    startTransition(() => {
      router.push(href);
    });
  }, [router]);

  const handleSidebarClose = useCallback(() => {
    if (isMobile) {
      toggleCollapsed();
    }
  }, [isMobile, toggleCollapsed]);

  const handleSidebarToggle = useCallback(() => {
    toggleCollapsed();
  }, [toggleCollapsed]);

  const userInitials = useMemo(() => {
    // Extract initials from display name first, then username, then email
    const displayText = user?.displayName || user?.name;
    if (!displayText) {
      // Fallback to email initials or generic avatar
      return user?.email?.slice(0, 2).toUpperCase() || 'U';
    }

    const parts = displayText.split(' ');
    if (parts && parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    }
    // If single word, use first two characters
    return displayText.slice(0, 2).toUpperCase();
  }, [user]);

  // Safety: redirect to login if stuck on loading for too long (e.g. auth init hang, socket/proxy issues)
  const LOADING_TIMEOUT_MS = 15_000;
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  useEffect(() => {
    if (!isLoading && isAuthenticated) return;
    const t = setTimeout(() => setLoadingTimedOut(true), LOADING_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [isLoading, isAuthenticated]);

  useEffect(() => {
    if (!loadingTimedOut || (isLoading === false && isAuthenticated)) return;
    router.replace('/login');
  }, [loadingTimedOut, isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) {
    return <LoadingOverlay text="Loading dashboard..." />;
  }

  return (
    <div className="flex h-screen w-full bg-background">
      {/* Sidebar */}
      <AppSidebar
        isOpen={sidebarOpen}
        navigationItems={navigationItems}
        currentPath={currentPath}
        isAdmin={PermissionUtils.canManageSystem(user?.role)}
        userInitials={userInitials}
        userDisplayName={user?.displayName || user?.name || ''}
        userRole={user?.role || 'user'}
        userAvatarUrl={user?.avatar}
        onNavigate={handleNavigate}
        onProfileClick={handleProfileClick}
        onLogout={handleLogout}
      />

      {/* Mobile overlay */}
      <MobileOverlay isOpen={sidebarOpen} onClose={handleSidebarClose} />

      {/* Main content */}
      <div className="flex flex-1 flex-col lg:pl-0 min-w-0">
        {/* Top bar */}
        <AppHeader
          sidebarOpen={sidebarOpen}
          onSidebarToggle={handleSidebarToggle}
          onSidebarCollapse={toggleCollapsed}
        />

        {/* Page content - only vertical scrolling, horizontal scrolling happens inside tables */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-w-0">
          <main className="p-4 lg:p-6 min-w-0">
            <SyncInProgressBanner />
            <SectionErrorBoundary
              variant="dashboard"
              fallbackTitle="Dashboard Error"
              fallbackMessage="Something went wrong! Please try refreshing the page."
              enableRetry={false}
            >
              {children}
            </SectionErrorBoundary>
          </main>
        </div>
      </div>

      {/* Route transition loading overlay */}
      {isTransitioning && (
        <LoadingOverlay text="Loading..." />
      )}
    </div>
  );
}
