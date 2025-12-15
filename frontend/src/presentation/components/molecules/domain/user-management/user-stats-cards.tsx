'use client';

import { Typography } from '@/presentation/components/atoms';
import { UserStatsCardsProps } from '.';
import { Crown, Shield, Users } from 'lucide-react';
import { USER_ROLES } from '@/shared/constants';

// Generic stats configuration interface
export interface StatsCardConfig {
  id: string;
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
  hoverColor?: string;
  onClick?: () => void;
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
  columns = 4,
}: StatsCardsProps) {
  const gridCols = {
    2: 'grid-cols-2 md:grid-cols-2',
    3: 'grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-4'
  };

  // Format trend values to 2 decimal places, removing trailing zeros
  const formatTrendValue = (value: number): string => {
    const rounded = parseFloat(value.toFixed(2));
    return rounded.toString();
  };

  return (
    <div className={`grid ${gridCols[columns]} gap-4 ${className || ''}`}>
      {stats.map((stat) => {
        const IconComponent = stat.icon;
        return (
          <div
            key={stat.id}
            className={`
              group bg-card border border-border rounded-lg p-4
              hover:border-primary/30 hover:bg-gradient-to-br hover:from-primary/5 hover:via-primary/10 hover:to-primary/5
              hover:shadow-sm
              transition-all duration-300 ease-out
              ${stat.onClick ? 'cursor-pointer ring-0 hover:ring-1 hover:ring-primary/20' : ''}
            `}
            onClick={stat.onClick}
          >
            <div className="flex items-center justify-between mb-2">
              <Typography variant="label-s" color="muted" className="text-muted-foreground font-medium">
                {stat.label}
              </Typography>
              <div className="p-1.5 rounded-full bg-muted/20 group-hover:bg-primary/10 transition-colors duration-300">
                <IconComponent className={`h-4 w-4 transition-colors duration-300 ${stat.color || 'text-primary'} ${stat.hoverColor ? `group-hover:${stat.hoverColor}` : 'group-hover:text-primary/80'}`} />
              </div>
            </div>
            <Typography variant="display-m" weight="bold" className="text-foreground group-hover:text-primary transition-colors duration-300">
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
                  {formatTrendValue(Math.abs(stat.trend.value))}%
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
export function UserStatsCards({
  userStats,
  isLoading = false,
  className,
  onRoleFilter,
  activeRoleFilter
}: UserStatsCardsProps & {
  onRoleFilter?: (role: string | null) => void;
  activeRoleFilter?: string | null;
}) {
  // Use API stats when available, otherwise calculate from displayed users
  const stats = userStats ?? {
    total: 0,
    admin: 0,
    manager: 0,
    staff: 0,
  };

  const statsCards: StatsCardConfig[] = [
    {
      id: 'total-users',
      label: 'Total Users',
      value: stats.total,
      icon: Users,
      color: activeRoleFilter === null ? 'text-primary' : 'text-blue-600',
      hoverColor: 'text-blue-700',
      onClick: onRoleFilter ? () => onRoleFilter(null) : undefined,
    },
    {
      id: 'admins',
      label: 'Admins',
      value: stats.admin,
      icon: Crown,
      color: activeRoleFilter === USER_ROLES.ADMIN ? 'text-primary' : 'text-purple-600',
      hoverColor: 'text-purple-700',
      onClick: onRoleFilter ? () => onRoleFilter(USER_ROLES.ADMIN) : undefined,
    },
    {
      id: 'managers',
      label: 'Managers',
      value: stats.manager,
      icon: Shield,
      color: activeRoleFilter === USER_ROLES.MANAGER ? 'text-primary' : 'text-orange-600',
      hoverColor: 'text-orange-700',
      onClick: onRoleFilter ? () => onRoleFilter(USER_ROLES.MANAGER) : undefined,
    },
    {
      id: 'staff',
      label: 'Staff',
      value: stats.staff,
      icon: Shield,
      color: activeRoleFilter === USER_ROLES.STAFF ? 'text-primary' : 'text-green-600',
      hoverColor: 'text-green-700',
      onClick: onRoleFilter ? () => onRoleFilter(USER_ROLES.STAFF) : undefined,
    },
  ];

  return <StatsCards stats={statsCards} isLoading={isLoading} className={className} />;
}