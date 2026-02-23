'use client';

import { Button } from '@/presentation/components/atoms/primitives/button';
import { TooltipWrapper } from '@/presentation/components/molecules/ui/tooltip-wrapper';
import {
  useLicenseStore,
  selectSyncStatus,
  selectTriggerManualSyncLoading,
} from '@/infrastructure/stores/license';
import { CloudDownload, Loader2 } from 'lucide-react';
import { cn } from '@/shared/helpers';

/**
 * Button to trigger manual license sync.
 * Sync data first, then enter data to avoid conflicts.
 * Disabled during sync (syncInProgress or triggerLoading) to prevent duplicate clicks.
 */
export function SyncButton({ className }: { className?: string }) {
  const syncStatus = useLicenseStore(selectSyncStatus);
  const triggerLoading = useLicenseStore(selectTriggerManualSyncLoading);
  const triggerManualSync = useLicenseStore((state) => state.triggerManualSync);

  const syncInProgress = syncStatus?.syncInProgress === true;
  const disabled = syncInProgress || triggerLoading; // Prevents duplicate clicks
  const tooltip = syncInProgress
    ? 'Syncing, please wait...'
    : 'Sync license data before entering data';

  return (
    <TooltipWrapper content={tooltip} side="bottom">
      <Button
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => triggerManualSync()}
        className={cn('gap-1.5', className)}
        aria-label={tooltip}
      >
        {triggerLoading || syncInProgress ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <CloudDownload className="h-4 w-4" aria-hidden />
        )}
        <span className="hidden sm:inline">Sync</span>
      </Button>
    </TooltipWrapper>
  );
}
