'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/presentation/components/atoms/primitives';
import { cn } from '@/shared/utils';
import { ChevronDown } from 'lucide-react';
import React from 'react';

export interface SidebarFooterTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  initials: string;
  displayName: string;
  role?: string;
  avatarUrl?: string;
}

export const SidebarFooterTrigger = React.forwardRef<HTMLButtonElement, SidebarFooterTriggerProps>(
  ({ initials, displayName, role, avatarUrl, className, ...props }, ref) => {
    // Capitalize the role for display
    const displayRole = role ? role.charAt(0).toUpperCase() + role.slice(1) : 'User';

    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          'w-full flex items-center justify-between p-3 transition-all duration-200',
          'hover:bg-accent hover:text-accent-foreground',
          'group rounded-none focus:outline-none focus-visible:ring-0',
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
        <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground ml-2 shrink-0" />
      </button>
    );
  }
);

SidebarFooterTrigger.displayName = 'SidebarFooterTrigger';
