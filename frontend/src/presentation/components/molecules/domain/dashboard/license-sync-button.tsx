'use client';

import { useEffect } from 'react';
import { Button } from '@/presentation/components/atoms/primitives/button';
import { TooltipWrapper } from '@/presentation/components/molecules/ui/tooltip-wrapper';
import {
  useLicenseStore,
  selectSyncStatus,
  selectSyncStatusLoading,
  selectSyncStatusError,
  selectTriggerManualSyncLoading,
} from '@/infrastructure/stores/license';
import type { LicenseSyncStatus } from '@/domain/repositories/i-license-repository';
import { CloudDownload, Loader2 } from 'lucide-react';
import { cn } from '@/shared/helpers';

const REFRESH_INTERVAL_MS = 60_000;

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

function formatSyncStats(last: LicenseSyncStatus['lastSyncResult']): string {
  const parts: string[] = [];
  if (last?.created != null && last.created > 0) parts.push(`${last.created} created`);
  if (last?.updated != null && last.updated > 0) parts.push(`${last.updated} updated`);
  if (last?.failed != null && last.failed > 0) parts.push(`${last.failed} failed`);
  return parts.length > 0 ? ` (${parts.join(', ')})` : '';
}

function getTooltipText(
  loading: boolean,
  error: boolean,
  status: LicenseSyncStatus | null
): string {
  if (loading) return 'Sync status: loading…';
  if (status?.syncInProgress) return 'Syncing…';
  if (error) return 'Sync status unavailable';
  const last = status?.lastSyncResult;
  if (!last?.timestamp) return 'Last sync: —';
  const timeStr = formatRelativeTime(last.timestamp);
  const success = last.success === true;
  const failReason = last.error ? ` – ${last.error}` : '';
  const stats = formatSyncStats(last);
  return success
    ? `Last sync: ${timeStr} – Success${stats}`
    : `Last sync: ${timeStr} – Failed${failReason}${stats}`;
}

export interface LicenseSyncButtonProps {
  className?: string;
  refreshIntervalMs?: number;
}

/**
 * License sync button: click to trigger manual sync, hover to see status.
 * Shows last sync time, success/fail, and stats in tooltip.
 * Polls sync status for accurate tooltip when visible.
 */
export function LicenseSyncButton({
  className,
  refreshIntervalMs = REFRESH_INTERVAL_MS,
}: LicenseSyncButtonProps) {
  const status = useLicenseStore(selectSyncStatus);
  const loading = useLicenseStore(selectSyncStatusLoading);
  const error = useLicenseStore(selectSyncStatusError);
  const triggerLoading = useLicenseStore(selectTriggerManualSyncLoading);
  const fetchSyncStatus = useLicenseStore((state) => state.fetchSyncStatus);
  const triggerManualSync = useLicenseStore((state) => state.triggerManualSync);

  const syncInProgress = status?.syncInProgress === true;
  const disabled = syncInProgress || triggerLoading;
  const statusTooltip = getTooltipText(loading, error, status);
  const tooltipText = disabled ? statusTooltip : `${statusTooltip} Click to sync.`;

  useEffect(() => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      fetchSyncStatus();
    }
  }, [fetchSyncStatus]);

  useEffect(() => {
    if (refreshIntervalMs <= 0) return;
    const runWhenVisible = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchSyncStatus();
      }
    };
    const id = setInterval(runWhenVisible, refreshIntervalMs);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') fetchSyncStatus();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [fetchSyncStatus, refreshIntervalMs]);

  return (
    <TooltipWrapper content={tooltipText} side="bottom" contentClassName="text-xs">
      <Button
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => triggerManualSync()}
        className={cn('gap-1.5', className)}
        aria-label={tooltipText}
      >
        {triggerLoading || syncInProgress || loading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <CloudDownload className="h-4 w-4" aria-hidden />
        )}
        <span className="hidden sm:inline">Sync</span>
      </Button>
    </TooltipWrapper>
  );
}
