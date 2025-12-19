'use client';

import { ScrollArea } from '@/presentation/components/atoms';
import { NavigationButton } from './sidebar-navigation-button';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/shared/utils';

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
    const currentUrl = new URL(path, 'http://localhost');
    const itemUrl = new URL(itemHref, 'http://localhost');

    if (currentUrl.pathname !== itemUrl.pathname) return false;

    const currentSection = currentUrl.searchParams.get('section');
    const itemSection = itemUrl.searchParams.get('section');

    // If the item targets a specific section, match that section and ignore other params
    if (itemSection) {
      return currentSection === itemSection;
    }

    // For base links without section, require same path and no section selected
    return !currentSection;
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

