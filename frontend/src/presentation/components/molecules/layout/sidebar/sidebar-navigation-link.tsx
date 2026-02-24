'use client';

import Link from 'next/link';
import { cn } from '@/shared/helpers';
import { LucideIcon } from 'lucide-react';

export interface NavigationLinkProps {
  name: string;
  href: string;
  icon: LucideIcon;
  isActive: boolean;
  isCollapsed?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Sidebar nav item using Next.js Link for prefetching.
 * Prefetching improves perceived speed when navigating Dashboard ↔ License/User Management.
 */
export function NavigationLink({
  name,
  href,
  icon: Icon,
  isActive,
  isCollapsed = false,
  className,
  style,
}: NavigationLinkProps) {
  return (
    <Link
      href={href}
      prefetch={true}
      className={cn(
        'flex w-full items-center justify-start rounded-md py-2.5 h-auto transition-all duration-300 ease-out',
        'group relative',
        isCollapsed ? 'px-2 justify-center' : 'px-3 gap-3',
        isActive
          ? 'text-primary bg-primary/10'
          : 'text-muted-foreground hover:text-primary hover:bg-muted/50',
        className
      )}
      style={style}
      aria-current={isActive ? 'page' : undefined}
      title={isCollapsed ? name : undefined}
    >
      <Icon
        className={cn(
          'h-4 w-4 shrink-0 transition-transform duration-300 ease-out',
          'group-hover:scale-110',
          isCollapsed ? '' : 'mr-1'
        )}
      />
      {!isCollapsed && (
        <span
          className={cn(
            'text-label-m truncate transition-all duration-300 ease-out',
            'opacity-100 translate-x-0',
            isCollapsed ? 'opacity-0 -translate-x-2' : 'opacity-100 translate-x-0'
          )}
        >
          {name}
        </span>
      )}
    </Link>
  );
}
