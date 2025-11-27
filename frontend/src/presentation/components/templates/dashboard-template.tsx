'use client';

import { ScrollArea } from '@/presentation/components/atoms';
import { DashboardHeader, MobileOverlay, NavigationItem} from '@/presentation/components/molecules';
import { Sidebar } from '@/presentation/components/organisms';
import { SectionErrorBoundary } from '@/presentation/components/organisms/common/error-boundary';
import { useRouter, usePathname } from 'next/navigation';
import { ReactNode, useMemo, useCallback, useState, Fragment } from 'react';
import { Home, Loader2, Users, Shield, FileText, TrendingUp, Activity, Settings, UserCheck } from 'lucide-react';
import { useAuth } from '@/presentation/contexts/auth-context';
import { PermissionUtils } from '@/shared/constants';

interface DashboardTemplateProps {
  children: ReactNode;
}

// Role-based navigation items based on enterprise permission system
const getNavigationItems = (userRole?: string): NavigationItem[] => {
  const baseItems: NavigationItem[] = [
    { name: 'Dashboard', href: `/dashboard/${userRole || ''}`, icon: Home },
  ];

  // Admin navigation (full system access)
  if (PermissionUtils.isAdmin(userRole)) {
    return [
      ...baseItems,
      { name: 'User Management', href: `/dashboard/admin?section=users`, icon: Users },
      { name: 'System Settings', href: `/dashboard/admin?section=settings`, icon: Settings },
      { name: 'Analytics', href: `/dashboard/admin?section=analytics`, icon: TrendingUp },
      { name: 'Security Logs', href: `/dashboard/admin?section=security`, icon: Shield },
      { name: 'Activity Logs', href: `/dashboard/admin?section=activity`, icon: Activity },
    ];
  }

  // Manager navigation (team management with restrictions)
  if (PermissionUtils.isManager(userRole)) {
    return [
      ...baseItems,
      { name: 'Team Management', href: `/dashboard/manager?section=team`, icon: Users },
      { name: 'Reports', href: `/dashboard/manager?section=reports`, icon: FileText },
      { name: 'User Approvals', href: `/dashboard/manager?section=approvals`, icon: UserCheck },
      { name: 'Analytics', href: `/dashboard/manager?section=analytics`, icon: TrendingUp },
    ];
  }

  // Staff navigation (limited access)
  if (PermissionUtils.isStaff(userRole)) {
    return [
      ...baseItems,
      { name: 'My Tasks', href: `/dashboard/staff?section=tasks`, icon: FileText },
      { name: 'Reports', href: `/dashboard/staff?section=reports`, icon: TrendingUp },
      { name: 'Profile', href: `/dashboard/staff?section=profile`, icon: UserCheck },
    ];
  }

  // Default/unknown role
  return baseItems;
};

export function DashboardTemplate({ children }: DashboardTemplateProps) {
  const { user, logout, isAuthenticated, isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Get navigation items based on user role
  const navigationItems = useMemo(() => getNavigationItems(user?.role), [user?.role]);

  // ALL hooks must be called before any conditional returns
  const handleLogout = useCallback(async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      // Logout should not fail navigation
      router.push('/login');
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
        currentPath={pathname}
        isAdmin={PermissionUtils.isAdmin(user?.role)}
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
