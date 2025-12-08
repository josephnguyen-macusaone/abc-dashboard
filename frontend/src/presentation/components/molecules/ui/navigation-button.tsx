'use client';

import { Button } from '@/presentation/components/atoms';
import { cn } from '@/shared/utils';
import { LucideIcon } from 'lucide-react';

export interface NavigationButtonProps {
  name: string;
  href: string;
  icon: LucideIcon;
  isActive: boolean;
  onClick: () => void;
  className?: string;
}

export function NavigationButton({
  name,
  href,
  icon: Icon,
  isActive,
  onClick,
  className,
}: NavigationButtonProps) {
  return (
    <Button
      variant="ghost"
      className={cn(
        'w-full justify-start transition-all duration-200 ease-in-out',
        'group relative',
        'py-2.5 h-auto',
        isActive
          ? 'text-primary'
          : 'text-muted-foreground group-hover:text-primary',
        className
      )}
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
    >
      <span
        className={cn(
          'flex items-center justify-start gap-3 transition-all duration-200 w-full text-left',
          isActive
            ? 'text-primary'
            : 'text-muted-foreground group-hover:text-primary'
        )}
      >
        <Icon
          className={cn(
            'h-4 w-4 shrink-0',
            'group-hover:scale-110'
          )}
        />
        {/* MAC USA ONE Typography: Label S for navigation items */}
        <span className="text-label-m">{name}</span>
      </span>
    </Button>
  );
}
