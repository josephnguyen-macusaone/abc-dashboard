'use client';

import type { ComponentType } from 'react';
import { Typography } from '@/presentation/components/atoms';
import {
  Target,
  Users,
  BriefcaseBusiness,
  Wrench,
  User,
  UserCog,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { USER_ROLES } from '@/shared/constants';
import { cn } from '@/shared/helpers';
import {
  normalizeUserStats,
  type UserListStats,
} from '@/shared/helpers/normalize-user-stats';

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
  /** Partial stats are merged with defaults (handles older APIs and missing keys). */
  userStats?: Partial<UserListStats> | null;
  viewerRole?: string;
  isLoading?: boolean;
  className?: string;
}

/** Metric card: icon + label + value; optional footer caption and/or trend row. */
export interface UserManagementMetricCardProps {
  icon?: ComponentType<{ className?: string }>;
  label: string;
  value: number;
  /** Optional subtext below the value (omit for a compact card). */
  footerCaption?: string;
  trend?: StatsCardConfig['trend'];
  onClick?: () => void;
  isLoading?: boolean;
  /** Tailwind text color classes for the header icon (e.g. `text-sky-600 dark:text-sky-400`). */
  iconClassName?: string;
}

function formatTrendValue(value: number): string {
  return parseFloat(value.toFixed(2)).toString();
}

function trendSign(direction: 'up' | 'down' | 'neutral'): string {
  if (direction === 'down') return '-';
  if (direction === 'up') return '+';
  return '';
}

function trendAccentClass(
  direction: 'up' | 'down' | 'neutral',
  polarity: 'default' | 'inverted' | undefined,
): string {
  if (direction === 'neutral') return 'text-muted-foreground';
  const inverted = polarity === 'inverted';
  if (direction === 'up')
    return inverted ? 'text-destructive' : 'text-green-600 dark:text-green-400';
  return inverted ? 'text-green-600 dark:text-green-400' : 'text-destructive';
}

export function UserManagementMetricCard({
  icon: Icon = Target,
  label,
  value,
  footerCaption,
  trend,
  onClick,
  isLoading = false,
  iconClassName,
}: UserManagementMetricCardProps) {
  const numericValue = Number.isFinite(value) ? value : 0;
  const valueText = isLoading ? '...' : String(numericValue);

  const trendPct = trend
    ? `${trendSign(trend.direction)}${formatTrendValue(Math.abs(trend.value))}%`
    : '';
  const trendClass = trend ? trendAccentClass(trend.direction, trend.polarity) : '';

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cn(
        'group flex h-full min-h-0 min-w-0 flex-col gap-4 overflow-hidden rounded-xl border bg-card p-5 transition-[border-color,box-shadow] duration-200 ease-out',
        'border-border outline-none focus-visible:outline-none focus-visible:ring-0',
        onClick &&
          'cursor-pointer hover:border-primary/35 hover:shadow-sm hover:ring-1 hover:ring-primary/15',
        !onClick && 'hover:border-muted-foreground/20',
      )}
    >
      <div className="flex w-full min-w-0 flex-col gap-4">
        <div className="flex w-full min-w-0 items-center gap-2">
          <Icon
            className={cn(
              'h-6 w-6 shrink-0',
              iconClassName ?? 'text-muted-foreground',
              onClick && 'transition-[color] duration-200 group-hover:text-primary',
            )}
            aria-hidden
          />
          <Typography
            variant="body-s"
            color="muted"
            weight="bold"
            lineClamp={2}
            title={label}
            className="min-w-0 flex-1"
          >
            {label}
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
            onClick && 'transition-colors duration-200 group-hover:text-primary',
          )}
        >
          {valueText}
        </Typography>
        {footerCaption || trend ? (
          <div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-1">
            {footerCaption ? (
              <Typography
                variant="caption"
                weight="semibold"
                color="muted"
                className="min-w-0 max-w-[70%] text-muted-foreground/90"
                lineClamp={2}
                title={footerCaption}
              >
                {footerCaption}
              </Typography>
            ) : trend ? (
              <span className="min-w-0 flex-1" aria-hidden />
            ) : null}
            {trend ? (
              <div className="ml-auto flex shrink-0 items-center gap-1">
                {trend.direction === 'up' ? (
                  <TrendingUp className={cn('h-6 w-6 shrink-0', trendClass)} aria-hidden />
                ) : null}
                {trend.direction === 'down' ? (
                  <TrendingDown className={cn('h-6 w-6 shrink-0', trendClass)} aria-hidden />
                ) : null}
                {trend.direction === 'neutral' ? (
                  <Minus className="h-6 w-6 shrink-0 text-muted-foreground" aria-hidden />
                ) : null}
                <Typography variant="body-s" weight="bold" className={cn('shrink-0 tabular-nums', trendClass)}>
                  {trendPct}
                </Typography>
              </div>
            ) : footerCaption ? (
              <span className="h-6 w-6 shrink-0" aria-hidden />
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
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

  return (
    <div className={cn('grid items-stretch gap-4', gridCols[columns], className)}>
      {stats.map((stat) => {
        const IconComponent = stat.icon;
        const numericValue =
          typeof stat.value === 'number' && Number.isFinite(stat.value)
            ? stat.value
            : Number(stat.value) || 0;
        const valueText = isLoading ? '...' : String(numericValue);
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

/** Distinct header icon accents for quick visual scanning (light + dark). */
const METRIC_ICON_TEAM = 'text-sky-600 dark:text-sky-400';
const METRIC_ICON_MANAGER = 'text-violet-600 dark:text-violet-400';
const METRIC_ICON_ACCOUNTANT = 'text-emerald-600 dark:text-emerald-400';
const METRIC_ICON_TECH = 'text-amber-600 dark:text-amber-400';
const METRIC_ICON_AGENT = 'text-rose-600 dark:text-rose-400';

export function UserStatsCards({
  userStats,
  viewerRole: _viewerRole,
  isLoading = false,
  className,
  onRoleFilter,
}: UserStatsCardsProps & {
  onRoleFilter?: (role: string | null) => void;
}) {
  const stats = normalizeUserStats(userStats);

  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-4 lg:grid-cols-5 lg:items-stretch',
        className,
      )}
    >
      <div className="col-span-2 min-w-0 lg:col-span-1">
        <UserManagementMetricCard
          icon={Users}
          label="Total users"
          value={stats.total}
          iconClassName={METRIC_ICON_TEAM}
          isLoading={isLoading}
          onClick={onRoleFilter ? () => onRoleFilter(null) : undefined}
        />
      </div>
      <div className="min-w-0">
        <UserManagementMetricCard
          icon={UserCog}
          label="Managers"
          value={stats.manager}
          iconClassName={METRIC_ICON_MANAGER}
          isLoading={isLoading}
          onClick={onRoleFilter ? () => onRoleFilter(USER_ROLES.MANAGER) : undefined}
        />
      </div>
      <div className="min-w-0">
        <UserManagementMetricCard
          icon={BriefcaseBusiness}
          label="Accountants"
          value={stats.accountant}
          iconClassName={METRIC_ICON_ACCOUNTANT}
          isLoading={isLoading}
          onClick={onRoleFilter ? () => onRoleFilter(USER_ROLES.ACCOUNTANT) : undefined}
        />
      </div>
      <div className="min-w-0">
        <UserManagementMetricCard
          icon={Wrench}
          label="Tech"
          value={stats.tech}
          iconClassName={METRIC_ICON_TECH}
          isLoading={isLoading}
          onClick={onRoleFilter ? () => onRoleFilter(USER_ROLES.TECH) : undefined}
        />
      </div>
      <div className="min-w-0">
        <UserManagementMetricCard
          icon={User}
          label="Agents"
          value={stats.agent}
          iconClassName={METRIC_ICON_AGENT}
          isLoading={isLoading}
          onClick={onRoleFilter ? () => onRoleFilter(USER_ROLES.AGENT) : undefined}
        />
      </div>
    </div>
  );
}
