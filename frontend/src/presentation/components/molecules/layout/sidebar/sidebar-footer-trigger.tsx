'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/presentation/components/atoms/primitives';
import { cn } from '@/shared/helpers';
import { ChevronDown } from 'lucide-react';
import React from 'react';

export interface SidebarFooterTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  initials: string;
  displayName: string;
  role?: string;
  avatarUrl?: string;
  isCollapsed?: boolean;
}

export const SidebarFooterTrigger = React.forwardRef<HTMLButtonElement, SidebarFooterTriggerProps>(
  ({ initials, displayName, role, avatarUrl, isCollapsed = false, className, ...props }, ref) => {
    // Capitalize the role for display
    const displayRole = role ? role.charAt(0).toUpperCase() + role.slice(1) : 'User';

    if (isCollapsed) {
      return (
        <button
          ref={ref}
          type="button"
          className={cn(
            'w-full flex items-center justify-center p-2 transition-all duration-300 ease-out',
            'group rounded-none focus:outline-none focus-visible:ring-0',
            'transform-gpu relative',
            className
          )}
          aria-label="User menu"
          {...props}
        >
          <div className="relative flex items-center justify-center">
            {/* Circular hover background */}
            <div className="absolute inset-0 rounded-full bg-accent opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100" />
            {/* Avatar */}
            <Avatar className="h-8 w-8 transition-transform duration-300 ease-out relative z-10 group-hover:scale-110">
              <AvatarImage src={avatarUrl} alt={`${initials} avatar`} />
              <AvatarFallback className="bg-primary text-primary-foreground text-label-s font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
        </button>
      );
    }

    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          'w-full flex items-center justify-between p-3 transition-all duration-300 ease-out',
          'hover:bg-accent hover:text-accent-foreground',
          'group rounded-none focus:outline-none focus-visible:ring-0',
          'transform-gpu',
          className
        )}
        aria-label="User menu"
        {...props}
      >
        <div className="flex items-center space-x-3">
          {/* Avatar */}
          <div className="relative">
            <Avatar className="h-8 w-8">
              <AvatarImage src={avatarUrl} alt={`${initials} avatar`} />
              <AvatarFallback className="bg-primary text-primary-foreground text-label-s font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
          {/* User info */}
          <div className="text-left min-w-0 flex-1">
            {/* MAC USA ONE Typography: Body S for user name */}
            <p className="text-body-s font-medium text-foreground truncate">{displayName}</p>
            {/* MAC USA ONE Typography: Body XS for role */}
            <p className="text-body-xs text-muted-foreground">{displayRole}</p>
          </div>
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground ml-2 shrink-0 transition-transform duration-300 ease-out" />
      </button>
    );
  }
);

SidebarFooterTrigger.displayName = 'SidebarFooterTrigger';
