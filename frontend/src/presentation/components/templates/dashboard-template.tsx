'use client';

import { ScrollArea } from '@/presentation/components/atoms';
import { DashboardHeader, MobileOverlay, NavigationItem} from '@/presentation/components/molecules';
import { Sidebar } from '@/presentation/components/organisms';
import { useRouter, usePathname } from 'next/navigation';
import { ReactNode, useMemo, useCallback, useState } from 'react';
import { Home, Loader2 } from 'lucide-react';
import { useAuth } from '@/presentation/contexts/auth-context';

interface DashboardTemplateProps {
  children: ReactNode;
}

const navigationItems: NavigationItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
];

export function DashboardTemplate({ children }: DashboardTemplateProps) {
  const { user, logout, isAuthenticated, isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

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

    const handleLogout = useCallback(() => {
    logout();
    router.push('/login');
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
    // Extract initials from display name (username or email)
    if (!user?.name) {
      // Fallback to email initials or generic avatar
      return user?.email?.slice(0, 2).toUpperCase() || 'U';
    }

    const parts = user.name.split(' ');
    if (parts && parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    }
    // If single word, use first two characters
    return user.name.slice(0, 2).toUpperCase();
  }, [user]);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        navigationItems={navigationItems}
        currentPath={pathname}
        isAdmin={user?.role === 'admin'}
        userInitials={userInitials}
        userDisplayName={user?.name || ''}
        userRole={user?.role || 'user'}
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
            {children}
          </main>
        </ScrollArea>
      </div>
    </div>
  );
}
