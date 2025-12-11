'use client';

import { ScrollArea } from '@/presentation/components/atoms';
import { NavigationButton } from '@/presentation/components/molecules/ui/navigation-button';
import { LucideIcon } from 'lucide-react';

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
  className?: string;
}

export function SidebarNavigation({
  items,
  currentPath,
  isAdmin,
  onNavigate,
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
    <ScrollArea className={`flex-1 overflow-hidden ${className || ''}`}>
      <nav className="space-y-0.5 py-4" role="navigation" aria-label="Main navigation">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive = isItemActive(currentPath, item.href);
          return (
            <NavigationButton
              key={item.name}
              name={item.name}
              href={item.href}
              icon={Icon}
              isActive={isActive}
              onClick={() => onNavigate(item.href)}
            />
          );
        })}
      </nav>
    </ScrollArea>
  );
}

