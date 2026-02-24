'use client';

import { usePathname } from 'next/navigation';
import { Button } from '@/presentation/components/atoms';
import { Breadcrumb, ThemeSwitcher } from '@/presentation/components/molecules';
import { LicenseSyncButton } from '@/presentation/components/molecules/domain/dashboard';
import { CollapseButton } from '@/presentation/components/molecules/layout/sidebar';
import { Menu, X } from 'lucide-react';
import { cn } from '@/shared/helpers';
import { useSidebarStore } from '@/infrastructure/stores';

/** Routes where Sync button is shown (dashboard and license management only) */
const SYNC_BUTTON_ROUTES = ['/dashboard', '/licenses'];

export interface AppHeaderProps {
  sidebarOpen: boolean;
  onSidebarToggle: () => void;
  onSidebarCollapse?: () => void;
  className?: string;
}

export function AppHeader({
  sidebarOpen,
  onSidebarToggle,
  onSidebarCollapse,
  className,
}: AppHeaderProps) {
  const { isCollapsed } = useSidebarStore();
  const pathname = usePathname();
  const showSyncButton = SYNC_BUTTON_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(`${r}/`)
  );

  return (
    <header
      className={cn(
        'flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-4 lg:px-6',
        className
      )}
    >
      <div className="flex items-center space-x-4 flex-1 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={onSidebarToggle}
          className="lg:hidden"
          aria-label="Toggle sidebar"
        >
          {sidebarOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>

        <div className="flex-1 min-w-0">
          <Breadcrumb
            collapseButton={
              onSidebarCollapse && !isCollapsed ? (
                <CollapseButton
                  displayVariant="icon"
                  onClick={onSidebarCollapse}
                  className="h-8 w-8"
                />
              ) : undefined
            }
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        {showSyncButton && <LicenseSyncButton />}
        <ThemeSwitcher />
      </div>
    </header>
  );
}

