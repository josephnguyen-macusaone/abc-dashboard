'use client';

import { Button } from '@/presentation/components/atoms';
import { Breadcrumb, ThemeSwitcher } from '@/presentation/components/molecules';
import { Menu, X } from 'lucide-react';
import { cn } from '@/shared/utils';

export interface AppHeaderProps {
  sidebarOpen: boolean;
  onSidebarToggle: () => void;
  className?: string;
}

export function AppHeader({
  sidebarOpen,
  onSidebarToggle,
  className,
}: AppHeaderProps) {
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
          <Breadcrumb />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <ThemeSwitcher />
      </div>
    </header>
  );
}

