'use client';

import { ScrollArea } from '@/presentation/components/atoms';
import { DashboardHeader, MobileOverlay, NavigationItem} from '@/presentation/components/molecules';
import { Sidebar } from '@/presentation/components/organisms';
import { SectionErrorBoundary } from '@/presentation/components/organisms/common/error-boundary';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ReactNode, useMemo, useCallback, useState } from 'react';
import { Home, Loader2, Users, UserCheck } from 'lucide-react';
import { useAuth } from '@/presentation/contexts/auth-context';
import { useToast } from '@/presentation/contexts/toast-context';
import { PermissionUtils } from '@/shared/constants';

interface DashboardTemplateProps {
  children: ReactNode;
}

// Permission-based navigation items based on enterprise permission system
const getNavigationItems = (userRole?: string): NavigationItem[] => {
  const baseItems: NavigationItem[] = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
  ];

  // Admin navigation (full system access)
  if (PermissionUtils.canManageSystem(userRole)) {
    return [
      ...baseItems,
      { name: 'User Management', href: '/dashboard?section=users', icon: Users },
    ];
  }

  // Manager navigation (user management with restrictions)
  if (PermissionUtils.canReadUser(userRole)) {
    return [
      ...baseItems,
      { name: 'User Management', href: '/dashboard?section=users', icon: Users },
    ];
  }

  // Staff navigation (limited access)
  if (PermissionUtils.isStaff(userRole)) {
    return [
      ...baseItems,
      { name: 'Profile', href: '/dashboard?section=profile', icon: UserCheck },
    ];
  }

  // Default/unknown role
  return baseItems;
};

export function DashboardTemplate({ children }: DashboardTemplateProps) {
  const { user, logout, isAuthenticated, isLoading } = useAuth();
  const toast = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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
    try {
      await logout();
    } catch (error) {
      toast.error('Failed to logout', {
        description: 'Please try again later',
        action: {
          label: 'Try again',
          onClick: () => {
            handleLogout();
          },
        },
        duration: 5000,
        position: 'top-right',
        className: 'bg-destructive text-destructive-foreground',
      });
    }
  }, [logout, router]);

  const handleProfileClick = useCallback(() => {
    router.push('/profile');
  }, [router]);

  const handleNavigate = useCallback((href: string) => {
    router.push(href);
  }, [router]);

  const handleSidebarClose = useCallback(() => {
    setSidebarOpen(false);
  }, [setSidebarOpen]);

  const handleSidebarToggle = useCallback(() => {
    setSidebarOpen(!sidebarOpen);
  }, [setSidebarOpen, sidebarOpen]);

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

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex h-screen bg-background">
        <div className="flex flex-1 flex-col lg:pl-0">
          <div className="p-4 lg:p-6">
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar
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
      <div className="flex flex-1 flex-col lg:pl-0">
        {/* Top bar */}
        <DashboardHeader
          sidebarOpen={sidebarOpen}
          onSidebarToggle={handleSidebarToggle}
        />

        {/* Page content */}
        <ScrollArea className="flex-1 overflow-auto">
          <main className="p-4 lg:p-6">
            <SectionErrorBoundary
              fallbackTitle="Dashboard Error"
              fallbackMessage="There was a problem loading the dashboard content. Please try refreshing the page."
              enableRetry={true}
            >
              {children}
            </SectionErrorBoundary>
          </main>
        </ScrollArea>
      </div>
    </div>
  );
}
