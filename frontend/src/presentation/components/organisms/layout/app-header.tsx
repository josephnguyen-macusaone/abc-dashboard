'use client';

import { Button } from '@/presentation/components/atoms';
import { Breadcrumb, ThemeSwitcher } from '@/presentation/components/molecules';
import { SyncStatusIcon } from '@/presentation/components/molecules/domain/dashboard';
import { CollapseButton } from '@/presentation/components/molecules/layout/sidebar';
import { Menu, X } from 'lucide-react';
import { cn } from '@/shared/helpers';
import { useSidebarStore } from '@/infrastructure/stores';

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

      <div className="flex items-center gap-1">
        <SyncStatusIcon refreshIntervalMs={120_000} />
        <ThemeSwitcher />
      </div>
    </header>
  );
}

