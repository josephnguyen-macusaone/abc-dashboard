'use client';

import { ScrollArea } from '@/presentation/components/atoms';
import { NavigationButton } from './sidebar-navigation-button';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/shared/helpers';

export interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  userOnly?: boolean;
}

export interface SidebarNavigationProps {
  items: NavigationItem[];
  currentPath: string;
  isAdmin: boolean;
  onNavigate: (href: string) => void;
  isCollapsed?: boolean;
  className?: string;
}

export function SidebarNavigation({
  items,
  currentPath,
  isAdmin,
  onNavigate,
  isCollapsed = false,
  className,
}: SidebarNavigationProps) {
  const isItemActive = (path: string, itemHref: string) => {
    // For clean URLs, simply compare pathnames
    const currentUrl = new URL(path, 'http://localhost');
    const itemUrl = new URL(itemHref, 'http://localhost');

    // Exact pathname match for clean URLs
    return currentUrl.pathname === itemUrl.pathname;
  };

  const filteredItems = items.filter((item) => {
    // Show admin-only items only to admins
    if (item.adminOnly && !isAdmin) return false;
    // Show user-only items only to non-admins
    if (item.userOnly && isAdmin) return false;
    // Show items without restrictions to everyone
    return true;
  });

  return (
    <ScrollArea className={cn('flex-1 overflow-hidden', className)}>
      <nav
        className={cn(
          'space-y-0.5 py-4',
          isCollapsed ? 'px-1' : 'px-2'
        )}
        role="navigation"
        aria-label="Main navigation"
      >
        {filteredItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = isItemActive(currentPath, item.href);
          return (
            <NavigationButton
              key={item.name}
              name={item.name}
              icon={Icon}
              isActive={isActive}
              isCollapsed={isCollapsed}
              onClick={() => onNavigate(item.href)}
              style={{
                animationDelay: `${index * 50}ms`,
                transitionDelay: `${index * 50}ms`,
              }}
            />
          );
        })}
      </nav>
    </ScrollArea>
  );
}

