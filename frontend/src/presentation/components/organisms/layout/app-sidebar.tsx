'use client';

import {
  SidebarBrand,
  SidebarNavigation,
  SidebarFooter,
  type NavigationItem,
} from '@/presentation/components/molecules/layout/sidebar';
import { cn } from '@/shared/utils';
import { useSidebarStore } from '@/infrastructure/stores';
import { SIDEBAR_CONSTANTS } from '@/infrastructure/stores/ui/sidebar-store';
import { useEffect } from 'react';

export interface AppSidebarProps {
  isOpen: boolean;
  navigationItems: NavigationItem[];
  currentPath: string;
  isAdmin: boolean;
  userInitials: string;
  userDisplayName: string;
  userRole?: string;
  userAvatarUrl?: string;
  onNavigate: (href: string) => void;
  onProfileClick: () => void;
  onLogout: () => void;
  className?: string;
}

export function AppSidebar({
  isOpen,
  navigationItems,
  currentPath,
  isAdmin,
  userInitials,
  userDisplayName,
  userRole,
  userAvatarUrl,
  onNavigate,
  onProfileClick,
  onLogout,
  className,
}: AppSidebarProps) {
  const {
    isCollapsed,
    isMobile,
    toggleCollapsed,
    setMobile,
    getEffectiveWidth,
  } = useSidebarStore();

  const handleBrandClick = () => {
    onNavigate('/dashboard');
  };

  // Update mobile state on mount and resize
  useEffect(() => {
    // Only run on client side to avoid SSR issues
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      const mobile = window.innerWidth < SIDEBAR_CONSTANTS.MOBILE_BREAKPOINT;
      setMobile(mobile);
    };

    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []); // Remove setMobile from deps since it's stable

  const effectiveWidth = getEffectiveWidth();

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 transform bg-card border-r border-border transition-all duration-300 ease-out lg:translate-x-0 lg:static lg:inset-0 h-screen',
        isMobile
          ? (isOpen ? 'translate-x-0' : '-translate-x-full')
          : 'translate-x-0',
        className
      )}
      style={{
        width: `${effectiveWidth}px`,
        minWidth: `${effectiveWidth}px`,
        maxWidth: `${effectiveWidth}px`,
        transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <div className="flex h-screen flex-col overflow-hidden">
        {/* Logo/Brand */}
        <SidebarBrand
          onClick={handleBrandClick}
          isCollapsed={isCollapsed}
          onToggleCollapse={toggleCollapsed}
        />

        {/* Navigation */}
        <SidebarNavigation
          items={navigationItems}
          currentPath={currentPath}
          isAdmin={isAdmin}
          onNavigate={onNavigate}
          isCollapsed={isCollapsed}
        />

        {/* User Menu */}
        <SidebarFooter
          initials={userInitials}
          displayName={userDisplayName}
          role={userRole}
          avatarUrl={userAvatarUrl}
          onProfileClick={onProfileClick}
          onLogout={onLogout}
          isCollapsed={isCollapsed}
        />
      </div>
    </aside>
  );
}

