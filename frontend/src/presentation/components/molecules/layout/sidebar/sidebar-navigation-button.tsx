'use client';

import { Button } from '@/presentation/components/atoms';
import { cn } from '@/shared/utils';
import { LucideIcon } from 'lucide-react';

export interface NavigationButtonProps extends React.HTMLAttributes<HTMLButtonElement> {
  name: string;
  icon: LucideIcon;
  isActive: boolean;
  onClick: () => void;
  isCollapsed?: boolean;
  className?: string;
}

export function NavigationButton({
  name,
  icon: Icon,
  isActive,
  onClick,
  isCollapsed = false,
  className,
  style,
  ...props
}: NavigationButtonProps) {
  return (
    <Button
      variant="ghost"
      className={cn(
        'w-full justify-start transition-all duration-300 ease-out',
        'group relative',
        'py-2.5 h-auto',
        'transform-gpu',
        isCollapsed ? 'px-2' : 'px-3',
        isActive
          ? 'text-primary'
          : 'text-muted-foreground group-hover:text-primary',
        className
      )}
      style={style}
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      title={isCollapsed ? name : undefined}
      {...props}
    >
      <span
        className={cn(
          'flex items-center justify-start transition-all duration-300 ease-out w-full text-left',
          isCollapsed ? 'justify-center' : 'gap-3',
          isActive
            ? 'text-primary'
            : 'text-muted-foreground group-hover:text-primary'
        )}
      >
        <Icon
          className={cn(
            'h-4 w-4 shrink-0 transition-transform duration-300 ease-out',
            'group-hover:scale-110',
            isCollapsed ? '' : 'mr-1'
          )}
        />
        {!isCollapsed && (
          /* MAC USA ONE Typography: Label S for navigation items */
          <span className={cn(
            'text-label-m truncate transition-all duration-300 ease-out',
            'opacity-100 translate-x-0',
            // When collapsing, hide text with opacity
            isCollapsed ? 'opacity-0 -translate-x-2' : 'opacity-100 translate-x-0'
          )}>
            {name}
          </span>
        )}
      </span>
    </Button>
  );
}
