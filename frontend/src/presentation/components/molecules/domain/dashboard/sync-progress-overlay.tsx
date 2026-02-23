'use client';

import { useEffect } from 'react';
import { LoadingOverlay } from '@/presentation/components/atoms';
import { useLicenseStore, selectSyncStatus } from '@/infrastructure/stores/license';

const SYNC_POLL_INTERVAL_MS = 2_000;

/**
 * Full-screen overlay shown when license sync is in progress.
 * Shows progress bar and percent when backend provides syncProgress.
 * Polls sync status frequently to update progress.
 */
export function SyncProgressOverlay() {
  const syncStatus = useLicenseStore(selectSyncStatus);
  const fetchSyncStatus = useLicenseStore((state) => state.fetchSyncStatus);

  const syncProgress = syncStatus?.syncProgress;
  const percent = syncProgress?.percent ?? 0;
  const processed = syncProgress?.processed ?? 0;
  const total = syncProgress?.total ?? 0;
  const hasProgress = total > 0;
  const subtext = hasProgress ? `${processed.toLocaleString()} / ${total.toLocaleString()} processed` : undefined;

  useEffect(() => {
    if (!syncStatus?.syncInProgress) return;
    const id = setInterval(() => {
      fetchSyncStatus();
    }, SYNC_POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [syncStatus?.syncInProgress, fetchSyncStatus]);

  return (
    <LoadingOverlay
      text="Syncing license data. Please wait before entering data."
      progress={hasProgress ? percent : undefined}
      subtext={subtext}
    />
  );
}
