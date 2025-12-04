'use client';

import { Typography } from '@/presentation/components/atoms';
import { Users, Crown, Shield } from 'lucide-react';
import type { User } from '@/domain/entities/user-entity';
import { USER_ROLES } from '@/shared/constants';

// Legacy interface - kept for backward compatibility
export interface UserStatsCardsProps {
  users: User[];
  isLoading?: boolean;
  className?: string;
}

// Generic stats configuration interface
export interface StatsCardConfig {
  id: string;
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
    label?: string;
  };
}

// Generic stats cards props
export interface StatsCardsProps {
  stats: StatsCardConfig[];
  isLoading?: boolean;
  className?: string;
  columns?: 2 | 3 | 4;
}

// Generic Stats Cards Component
export function StatsCards({
  stats,
  isLoading = false,
  className,
  columns = 4
}: StatsCardsProps) {
  const gridCols = {
    2: 'grid-cols-2 md:grid-cols-2',
    3: 'grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-4'
  };

  return (
    <div className={`grid ${gridCols[columns]} gap-6 ${className || ''}`}>
      {stats.map((stat) => {
        const IconComponent = stat.icon;
        return (
          <div
            key={stat.id}
            className="bg-card border border-border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <Typography variant="label-s" color="muted" className="text-muted-foreground">
                {stat.label}
              </Typography>
              <IconComponent className={`h-4 w-4 ${stat.color || 'text-primary'}`} />
            </div>
            <Typography variant="display-m" weight="bold" className="text-foreground">
              {isLoading ? '...' : stat.value}
            </Typography>
            {stat.trend && (
              <div className="flex items-center gap-1 mt-1">
                <span className={`text-body-xs ${stat.trend.direction === 'up' ? 'text-green-600' :
                  stat.trend.direction === 'down' ? 'text-red-600' :
                    'text-foreground'
                  }`}>
                  {stat.trend.direction === 'up' && '↗ '}
                  {stat.trend.direction === 'down' && '↘ '}
                  {stat.trend.direction === 'neutral' && '→ '}
                  {Math.abs(stat.trend.value)}%
                </span>
                {stat.trend.label && (
                  <span className="text-body-xs text-foreground/70">
                    {stat.trend.label}
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Legacy UserStatsCards - now uses the generic StatsCards internally
export function UserStatsCards({ users, isLoading = false, className }: UserStatsCardsProps) {
  const totalUsers = users.length;
  const admins = users.filter(u => u.role === USER_ROLES.ADMIN).length;
  const managers = users.filter(u => u.role === USER_ROLES.MANAGER).length;
  const staff = users.filter(u => u.role === USER_ROLES.STAFF).length;

  const stats: StatsCardConfig[] = [
    {
      id: 'total-users',
      label: 'Total Users',
      value: totalUsers,
      icon: Users,
    },
    {
      id: 'admins',
      label: 'Admins',
      value: admins,
      icon: Crown,
    },
    {
      id: 'managers',
      label: 'Managers',
      value: managers,
      icon: Shield,
    },
    {
      id: 'staff',
      label: 'Staff',
      value: staff,
      icon: Shield,
    },
  ];

  return <StatsCards stats={stats} isLoading={isLoading} className={className} />;
}