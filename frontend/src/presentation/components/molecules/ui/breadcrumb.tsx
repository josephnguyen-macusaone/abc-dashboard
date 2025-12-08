'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/shared/utils';
import { Typography } from '@/presentation/components/atoms';

interface BreadcrumbItem {
  name: string;
  href: string;
}

export function Breadcrumb() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Generate breadcrumb items from pathname and query params
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const paths = pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [{ name: 'Dashboard', href: '/dashboard' }];

    // Map path names to display names
    const pathNameMap: Record<string, string> = {
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

  return (
    <nav aria-label="Breadcrumb" className="flex items-center space-x-1">
      {breadcrumbs.map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 1;

        return (
          <div key={crumb.href} className="flex items-center space-x-1">
            {index > 0 && (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            {isLast ? (
              <Typography
                variant="body-s"
                className="font-medium text-foreground flex items-center space-x-1"
              >
                <span>{crumb.name}</span>
              </Typography>
            ) : (
              <Link
                href={crumb.href}
                className={cn(
                  "flex items-center space-x-1 text-muted-foreground hover:text-foreground transition-colors",
                )}
              >
                <Typography variant="body-s" as="span">
                  {crumb.name}
                </Typography>
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
