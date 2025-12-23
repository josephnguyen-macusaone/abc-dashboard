'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/shared/helpers';
import { Typography } from '@/presentation/components/atoms';

interface BreadcrumbItem {
  name: string;
  href: string;
}

interface BreadcrumbProps {
  /** Optional collapse button to show on desktop */
  collapseButton?: React.ReactNode;
}

export function Breadcrumb({ collapseButton }: BreadcrumbProps = {}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Generate breadcrumb items from pathname and query params
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const paths = pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [{ name: 'Dashboard', href: '/dashboard' }];

    // Map path names to display names
    const pathNameMap: Record<string, string> = {
      'licenses': 'License Management',
      'users': 'User Management',
      'user-management': 'User Management',
      'admin': 'Admin',
      'score': 'Score',
      'profile': 'Profile',
    };

    let currentPath = '';
    paths.forEach((path) => {
      currentPath += `/${path}`;
      const displayName = pathNameMap[path] || path
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      // Skip if it's the dashboard (already added as Dashboard)
      if (currentPath !== '/dashboard') {
        breadcrumbs.push({
          name: displayName,
          href: currentPath,
        });
      }
    });

    // Handle dashboard sections (query parameters)
    if (pathname === '/dashboard') {
      const section = searchParams.get('section');
      if (section === 'users') {
        breadcrumbs.push({
          name: 'User Management',
          href: '/dashboard?section=users',
        });
      } else if (section === 'licenses') {
        breadcrumbs.push({
          name: 'License Management',
          href: '/dashboard?section=licenses',
        });
      }
      // Add more sections as needed
    }

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  // Always show breadcrumb
  if (breadcrumbs.length === 0) {
    return null;
  }

  // Determine if we're on a sub-section (more than just Dashboard)
  const isOnSubSection = breadcrumbs.length > 1 || searchParams.get('section') !== null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center space-x-1">
      {collapseButton && (
        <div className="mr-3 hidden lg:block">
          {collapseButton}
        </div>
      )}

      {breadcrumbs.map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 1;
        const isFirstDashboard = index === 0 && crumb.name === 'Dashboard';

        return (
          <div key={crumb.href} className="flex items-center space-x-1">
            {index > 0 && (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            {isLast ? (
              <span className={cn(
                "truncate pb-0.5 text-sm",
                "text-foreground"
              )}>
                {crumb.name}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className={cn(
                  "flex items-center space-x-1 transition-colors",
                  // First Dashboard item: muted when on sub-section, normal when on dashboard
                  isFirstDashboard
                    ? (isOnSubSection
                      ? "text-muted-foreground/60 hover:text-muted-foreground"
                      : "text-foreground hover:text-foreground")
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span className={cn(
                  "truncate pb-0.5 text-sm",
                  // First Dashboard item styling
                  isFirstDashboard
                    ? (isOnSubSection
                      ? "text-muted-foreground/60 hover:text-muted-foreground"
                      : "text-foreground")
                    : "text-foreground"
                )}>
                  {crumb.name}
                </span>
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
