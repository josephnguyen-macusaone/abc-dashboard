'use client';

import { Typography } from '@/presentation/components/atoms';
import {
  Crown,
  Shield,
  Users,
  BriefcaseBusiness,
  Wrench,
  User,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { USER_ROLES } from '@/shared/constants';
import { cn } from '@/shared/helpers';

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
    /** Shown on the left of the footer row (Figma: “vs. … vs yesterday”). */
    label?: string;
    /** `inverted`: up = bad (destructive), down = good — e.g. high-risk counts. */
    polarity?: 'default' | 'inverted';
  };
}

export interface StatsCardsProps {
  stats: StatsCardConfig[];
  isLoading?: boolean;
  className?: string;
  columns?: 2 | 3 | 4 | 5 | 6;
}

export interface UserStatsCardsProps {
  userStats?: {
    total: number;
    admin: number;
    accountant: number;
    manager: number;
    tech: number;
    agent: number;
  };
  isLoading?: boolean;
  className?: string;
}

export function StatsCards({
  stats,
  isLoading = false,
  className,
  columns = 4,
}: StatsCardsProps) {
  const gridCols = {
    2: 'grid-cols-2 md:grid-cols-2',
    3: 'grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
    6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
  };

  const formatTrendValue = (value: number): string => {
    const rounded = parseFloat(value.toFixed(2));
    return rounded.toString();
  };

  const trendSign = (direction: 'up' | 'down' | 'neutral'): string => {
    if (direction === 'down') return '-';
    if (direction === 'up') return '+';
    return '';
  };

  const trendAccentClass = (
    direction: 'up' | 'down' | 'neutral',
    polarity: 'default' | 'inverted' | undefined,
  ): string => {
    if (direction === 'neutral') return 'text-muted-foreground';
    const inverted = polarity === 'inverted';
    if (direction === 'up')
      return inverted ? 'text-destructive' : 'text-green-600 dark:text-green-400';
    return inverted ? 'text-green-600 dark:text-green-400' : 'text-destructive';
  };

  return (
    <div className={cn('grid items-stretch gap-4', gridCols[columns], className)}>
      {stats.map((stat) => {
        const IconComponent = stat.icon;
        const valueText = isLoading ? '...' : String(stat.value);
        const trendPct = stat.trend
          ? `${trendSign(stat.trend.direction)}${formatTrendValue(Math.abs(stat.trend.value))}%`
          : '';
        const trendClass = stat.trend
          ? trendAccentClass(stat.trend.direction, stat.trend.polarity)
          : '';
        return (
          <div
            key={stat.id}
            className={cn(
              /* ABC Order — Card Simple (Figma 4568:47787): surface, subtle border, 20px pad, 12px radius */
              'group flex h-full min-h-0 min-w-0 flex-col gap-4 overflow-hidden rounded-xl border border-border bg-card p-5',
              'transition-[border-color,box-shadow] duration-200 ease-out',
              stat.onClick &&
                'cursor-pointer hover:border-primary/35 hover:shadow-sm hover:ring-1 hover:ring-primary/15',
              !stat.onClick && 'hover:border-muted-foreground/20',
            )}
            onClick={stat.onClick}
          >
            <div className="flex w-full min-w-0 items-center gap-2">
              <IconComponent
                className={cn(
                  'h-6 w-6 shrink-0 transition-colors duration-200',
                  stat.color || 'text-muted-foreground',
                  stat.onClick &&
                    (stat.hoverColor ? `group-hover:${stat.hoverColor}` : 'group-hover:text-primary/80'),
                )}
                aria-hidden
              />
              <Typography
                variant="body-s"
                color="muted"
                weight="bold"
                lineClamp={2}
                title={stat.label}
                className="min-w-0 flex-1"
              >
                {stat.label}
              </Typography>
            </div>
            <Typography
              variant="title-l"
              weight="bold"
              lineHeight="tight"
              truncate
              title={isLoading ? undefined : valueText}
              className={cn(
                'min-w-0 max-w-full font-bold tabular-nums text-foreground',
                stat.onClick && 'transition-colors duration-200 group-hover:text-primary',
              )}
            >
              {valueText}
            </Typography>
            {stat.trend ? (
              <div
                className="flex w-full min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-1"
                title={
                  stat.trend.label
                    ? `${trendPct} ${stat.trend.label}`.trim()
                    : trendPct
                }
              >
                {stat.trend.label ? (
                  <Typography
                    variant="caption"
                    weight="semibold"
                    color="muted"
                    className="min-w-0 max-w-[65%] truncate text-muted-foreground/90"
                  >
                    {stat.trend.label}
                  </Typography>
                ) : (
                  <span className="min-w-0 flex-1" />
                )}
                <div className="ml-auto flex shrink-0 items-center gap-1">
                  {stat.trend.direction === 'up' ? (
                    <TrendingUp className={cn('h-6 w-6 shrink-0', trendClass)} aria-hidden />
                  ) : null}
                  {stat.trend.direction === 'down' ? (
                    <TrendingDown className={cn('h-6 w-6 shrink-0', trendClass)} aria-hidden />
                  ) : null}
                  {stat.trend.direction === 'neutral' ? (
                    <Minus className="h-6 w-6 shrink-0 text-muted-foreground" aria-hidden />
                  ) : null}
                  <Typography variant="body-s" weight="bold" className={cn('shrink-0 tabular-nums', trendClass)}>
                    {trendPct}
                  </Typography>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function UserStatsCards({
  userStats,
  isLoading = false,
  className,
  onRoleFilter,
  activeRoleFilter,
}: UserStatsCardsProps & {
  onRoleFilter?: (role: string | null) => void;
  activeRoleFilter?: string | null;
}) {
  const stats = userStats ?? {
    total: 0,
    admin: 0,
    accountant: 0,
    manager: 0,
    tech: 0,
    agent: 0,
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
      id: 'accountants',
      label: 'Accountants',
      value: stats.accountant,
      icon: BriefcaseBusiness,
      color: activeRoleFilter === USER_ROLES.ACCOUNTANT ? 'text-primary' : 'text-amber-600',
      hoverColor: 'text-amber-700',
      onClick: onRoleFilter ? () => onRoleFilter(USER_ROLES.ACCOUNTANT) : undefined,
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
      id: 'tech',
      label: 'Tech',
      value: stats.tech,
      icon: Wrench,
      color: activeRoleFilter === USER_ROLES.TECH ? 'text-primary' : 'text-cyan-600',
      hoverColor: 'text-cyan-700',
      onClick: onRoleFilter ? () => onRoleFilter(USER_ROLES.TECH) : undefined,
    },
    {
      id: 'agents',
      label: 'Agents',
      value: stats.agent,
      icon: User,
      color: activeRoleFilter === USER_ROLES.AGENT ? 'text-primary' : 'text-indigo-600',
      hoverColor: 'text-indigo-700',
      onClick: onRoleFilter ? () => onRoleFilter(USER_ROLES.AGENT) : undefined,
    },
  ];

  return <StatsCards stats={statsCards} isLoading={isLoading} className={className} columns={6} />;
}
