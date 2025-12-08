'use client';

import {
  SidebarBrand,
  SidebarNavigation,
  SidebarFooter,
  type NavigationItem,
} from '@/presentation/components/molecules';
import { cn } from '@/shared/utils';

export interface SidebarProps {
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

export function Sidebar({
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
}: SidebarProps) {
  const handleBrandClick = () => {
    onNavigate('/dashboard');
  };

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 w-64 transform bg-card border-r border-border transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0 h-screen',
        isOpen ? 'translate-x-0' : '-translate-x-full',
        className
      )}
    >
      <div className="flex h-screen flex-col overflow-hidden">
        {/* Logo/Brand */}
        <SidebarBrand
          onClick={handleBrandClick}
        />

        {/* Navigation */}
        <SidebarNavigation
          items={navigationItems}
          currentPath={currentPath}
          isAdmin={isAdmin}
          onNavigate={onNavigate}
        />

        {/* User Menu */}
        <SidebarFooter
          initials={userInitials}
          displayName={userDisplayName}
          role={userRole}
          avatarUrl={userAvatarUrl}
          onProfileClick={onProfileClick}
          onLogout={onLogout}
        />
      </div>
    </aside>
  );
}

