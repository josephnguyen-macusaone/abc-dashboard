'use client';

import { Typography } from '@/presentation/components/atoms';
import { Users, Crown, Shield } from 'lucide-react';
import type { User } from '@/domain/entities/user-entity';

export interface UserStatsCardsProps {
  users: User[];
  isLoading?: boolean;
  className?: string;
}

export function UserStatsCards({ users, isLoading = false, className }: UserStatsCardsProps) {
  const totalUsers = users.length;
  const admins = users.filter(u => u.role === 'admin').length;
  const managers = users.filter(u => u.role === 'manager').length;
  const staff = users.filter(u => u.role === 'staff').length;

  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${className || ''}`}>
      <div className="bg-gradient-to-br from-muted/50 to-muted/30 rounded-lg p-4 border border-border/50">
        <div className="flex items-center justify-between mb-2">
          <Typography variant="body-s" color="muted" className="text-muted-foreground">
            Total Users
          </Typography>
          <Users className="h-4 w-4 text-muted-foreground" />
        </div>
        <Typography variant="display-m" weight="bold" className="text-foreground">
          {isLoading ? '...' : totalUsers}
        </Typography>
      </div>
      <div className="bg-gradient-to-br from-muted/50 to-muted/30 rounded-lg p-4 border border-border/50">
        <div className="flex items-center justify-between mb-2">
          <Typography variant="body-s" color="muted" className="text-muted-foreground">
            Admins
          </Typography>
          <Crown className="h-4 w-4 text-muted-foreground" />
        </div>
        <Typography variant="display-m" weight="bold" className="text-foreground">
          {isLoading ? '...' : admins}
        </Typography>
      </div>
      <div className="bg-gradient-to-br from-muted/50 to-muted/30 rounded-lg p-4 border border-border/50">
        <div className="flex items-center justify-between mb-2">
          <Typography variant="body-s" color="muted" className="text-muted-foreground">
            Managers
          </Typography>
          <Shield className="h-4 w-4 text-muted-foreground" />
        </div>
        <Typography variant="display-m" weight="bold" className="text-foreground">
          {isLoading ? '...' : managers}
        </Typography>
      </div>
      <div className="bg-gradient-to-br from-muted/50 to-muted/30 rounded-lg p-4 border border-border/50">
        <div className="flex items-center justify-between mb-2">
          <Typography variant="body-s" color="muted" className="text-muted-foreground">
            Staff
          </Typography>
          <Shield className="h-4 w-4 text-muted-foreground" />
        </div>
        <Typography variant="display-m" weight="bold" className="text-foreground">
          {isLoading ? '...' : staff}
        </Typography>
      </div>
    </div>
  );
}