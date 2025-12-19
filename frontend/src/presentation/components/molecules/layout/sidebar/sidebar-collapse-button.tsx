'use client';

import { Button } from '@/presentation/components/atoms';
import { cn } from '@/shared/utils';
import { ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import React from 'react';

export interface CollapseButtonProps extends Omit<React.ComponentProps<typeof Button>, 'variant'> {
  /** Whether the sidebar is currently collapsed */
  isCollapsed?: boolean;

  /** Direction the button should face */
  direction?: 'left' | 'right';

  /** Whether to show icon only or with text */
  displayVariant?: 'icon' | 'full';

  /** Custom className */
  className?: string;
}

export const CollapseButton = React.forwardRef<HTMLButtonElement, CollapseButtonProps>(
  ({ isCollapsed = false, direction = 'right', displayVariant = 'icon', className, children, ...props }, ref) => {
    const Icon = isCollapsed
      ? (direction === 'right' ? PanelLeftOpen : PanelLeftClose)
      : (direction === 'right' ? PanelLeftClose : PanelLeftOpen);

    const ChevronIcon = direction === 'right' ? ChevronRight : ChevronLeft;

    if (displayVariant === 'icon') {
      return (
        <Button
          ref={ref}
          variant="ghost"
          size="icon"
          className={cn('h-8 w-8 shrink-0', className)}
          {...props}
        >
          <Icon className="h-4 w-4" />
          <span className="sr-only">
            {isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          </span>
        </Button>
      );
    }

    return (
      <Button
        ref={ref}
        variant="ghost"
        size="sm"
        className={cn('shrink-0', className)}
        {...props}
      >
        <ChevronIcon className="h-4 w-4 mr-2" />
        {isCollapsed ? 'Expand' : 'Collapse'}
        {children}
      </Button>
    );
  }
);

CollapseButton.displayName = 'CollapseButton';