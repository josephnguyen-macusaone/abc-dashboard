'use client';

import { Logo } from '@/presentation/components/atoms';
import { CollapseButton } from './sidebar-collapse-button';
import { useTheme } from '@/presentation/contexts/theme-context';
import { cn } from '@/shared/helpers';

export interface SidebarBrandProps {
  onClick: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
}

export function SidebarBrand({
  onClick,
  isCollapsed = false,
  onToggleCollapse,
  className
}: SidebarBrandProps) {
  const { theme } = useTheme();

  return (
    <div className={cn(
      'flex shrink-0 items-center justify-center transition-all duration-300 ease-out',
      isCollapsed ? 'p-4' : 'px-6 pt-6 pb-4',
      className
    )}>
      {isCollapsed ? (
        <CollapseButton
          isCollapsed={isCollapsed}
          direction="right"
          onClick={(e) => {
            e.stopPropagation();
            onToggleCollapse?.();
          }}
          className="h-8 w-8 transition-transform duration-300 ease-out"
        />
      ) : (
        <div
          className="cursor-pointer hover:opacity-80 transition-all duration-300 ease-out"
          onClick={onClick}
        >
          <Logo
            variant={theme === 'dark' ? 'dark' : 'light'}
            width={120}
            className="mx-auto"
          />
        </div>
      )}
    </div>
  );
}

