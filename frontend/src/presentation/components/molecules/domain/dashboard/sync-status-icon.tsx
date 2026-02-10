'use client';

import { useEffect } from 'react';
import { Button } from '@/presentation/components/atoms/primitives/button';
import { TooltipWrapper } from '@/presentation/components/molecules/ui/tooltip-wrapper';
import { cn } from '@/shared/helpers';
import {
  useLicenseStore,
  selectSyncStatus,
  selectSyncStatusLoading,
  selectSyncStatusError,
} from '@/infrastructure/stores/license';
import type { LicenseSyncStatus } from '@/domain/repositories/i-license-repository';
import { CloudOff, CloudSync, RefreshCw } from 'lucide-react';

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHour < 24) return `${diffHour} hr ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
  return date.toLocaleDateString();
}

function getTooltipText(
  loading: boolean,
  error: boolean,
  status: LicenseSyncStatus | null
): string {
  if (loading) return 'Sync status: loading…';
  if (error) return 'Sync status unavailable';
  const last = status?.lastSyncResult;
  if (!last?.timestamp) return 'Last sync: —';
  const timeStr = formatRelativeTime(last.timestamp);
  const success = last.success === true;
  const failReason = last.error ? ` – ${last.error}` : '';
  return success ? `Last sync: ${timeStr} – Success` : `Last sync: ${timeStr} – Failed${failReason}`;
}

export interface SyncStatusIconProps {
  className?: string;
  iconClassName?: string;
  refreshIntervalMs?: number;
}

export function SyncStatusIcon({
  className,
  iconClassName,
  refreshIntervalMs = 120_000,
}: SyncStatusIconProps) {
  const status = useLicenseStore(selectSyncStatus);
  const loading = useLicenseStore(selectSyncStatusLoading);
  const error = useLicenseStore(selectSyncStatusError);
  const fetchSyncStatus = useLicenseStore((state) => state.fetchSyncStatus);

  useEffect(() => {
    fetchSyncStatus();
  }, [fetchSyncStatus]);

  useEffect(() => {
    if (refreshIntervalMs <= 0) return;
    const id = setInterval(fetchSyncStatus, refreshIntervalMs);
    return () => clearInterval(id);
  }, [fetchSyncStatus, refreshIntervalMs]);

  const tooltipText = getTooltipText(loading, error, status);
  const last = status?.lastSyncResult;
  const success = last?.success === true;

  const showLoading = loading;
  const showError = !loading && (error || !last?.timestamp);
  const showSynced = !loading && !showError;

  const iconTransition = 'transition-all duration-300 ease-in-out';

  return (
    <TooltipWrapper content={tooltipText} side="bottom">
      <Button
        variant="ghost"
        size="icon"
        aria-label={tooltipText}
        className={cn('relative h-9 w-9 overflow-visible', className)}
      >
        <RefreshCw
          className={cn(
            'absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2',
            iconTransition,
            showLoading ? 'scale-100 opacity-100' : 'scale-0 opacity-0',
            showLoading && 'animate-spin',
            iconClassName
          )}
          aria-hidden
        />
        <CloudOff
          className={cn(
            'absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2',
            iconTransition,
            showError ? 'scale-100 opacity-100' : 'scale-0 opacity-0',
            iconClassName
          )}
          aria-hidden
        />
        <CloudSync
          className={cn(
            'absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2',
            iconTransition,
            showSynced ? 'scale-100 opacity-100' : 'scale-0 opacity-0',
            showSynced && (success ? 'text-green-600' : 'text-destructive'),
            iconClassName
          )}
          aria-hidden
        />
      </Button>
    </TooltipWrapper>
  );
}