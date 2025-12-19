'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/presentation/components/atoms';
import { SidebarFooterTrigger } from './sidebar-footer-trigger';
import { User, LogOut } from 'lucide-react';

export interface SidebarFooterProps {
  initials: string;
  displayName: string;
  role?: string;
  avatarUrl?: string;
  onProfileClick: () => void;
  onLogout: () => void;
  isCollapsed?: boolean;
  className?: string;
}

export function SidebarFooter({
  initials,
  displayName,
  role,
  avatarUrl,
  onProfileClick,
  onLogout,
  isCollapsed = false,
  className,
}: SidebarFooterProps) {
  if (isCollapsed) {
    return (
      <div className={`shrink-0 p-2 ${className || ''}`}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarFooterTrigger
              initials={initials}
              displayName={displayName}
              role={role}
              avatarUrl={avatarUrl}
              isCollapsed={isCollapsed}
              className="p-2"
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="right"
            sideOffset={8}
            align="end"
            className="w-56 mb-2 border-border z-60 p-2"
          >
            <DropdownMenuItem onClick={onProfileClick} className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              <span className="text-caption font-normal">Profile</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLogout} className="cursor-pointer text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              <span className="text-caption font-normal">Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <div className={`shrink-0 ${className || ''}`}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarFooterTrigger
            initials={initials}
            displayName={displayName}
            role={role}
            avatarUrl={avatarUrl}
            isCollapsed={isCollapsed}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="right"
          sideOffset={8}
          align="end"
          className="w-56 mb-2 border-border z-60 p-2"
        >
          <DropdownMenuItem onClick={onProfileClick} className="cursor-pointer">
            <User className="mr-2 h-3.5 w-3.5" />
            <span className="text-caption font-normal">Profile</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onLogout} className="cursor-pointer text-destructive focus:text-destructive">
            <LogOut className="mr-2 h-3.5 w-3.5" />
            <span className="text-caption font-normal">Logout</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

