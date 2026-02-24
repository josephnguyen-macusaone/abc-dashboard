'use client';

import { useEffect, useState } from 'react';
import { LoadingOverlay } from '@/presentation/components/atoms';
import { useLicenseStore, selectSyncStatus } from '@/infrastructure/stores/license';

const SYNC_POLL_INTERVAL_MS = 1_000;
const INDETERMINATE_PROGRESS_INTERVAL_MS = 200;
const INDETERMINATE_MAX_PERCENT = 15;
const INDETERMINATE_STEP = 2;

/**
 * Full-screen overlay shown when license sync is in progress.
 * Shows progress bar and percent when backend provides syncProgress.
 * When backend has no progress yet, shows indeterminate progress (0-15%) so users feel the system is working.
 * Polls sync status every 1s for frequent updates.
 */
export function LicenseSyncProgressOverlay() {
  const syncStatus = useLicenseStore(selectSyncStatus);
  const fetchSyncStatus = useLicenseStore((state) => state.fetchSyncStatus);

  const syncProgress = syncStatus?.syncProgress;
  const backendPercent = syncProgress?.percent ?? 0;
  const processed = syncProgress?.processed ?? 0;
  const total = syncProgress?.total ?? 0;
  const hasBackendProgress = total > 0;

  const [indeterminatePercent, setIndeterminatePercent] = useState(0);

  const percent = hasBackendProgress ? backendPercent : indeterminatePercent;
  const hasProgress = total > 0;
  const subtext = hasProgress
    ? `${processed.toLocaleString()} / ${total.toLocaleString()} processed. Do not refresh the page.`
    : 'Do not refresh the page.';
  const mainText = `Syncing license data (${Math.round(percent)}%). Please wait!`;

  useEffect(() => {
    if (!syncStatus?.syncInProgress) return;
    queueMicrotask(() => setIndeterminatePercent(0));
    fetchSyncStatus();
    const pollId = setInterval(() => {
      fetchSyncStatus();
    }, SYNC_POLL_INTERVAL_MS);
    return () => clearInterval(pollId);
  }, [syncStatus?.syncInProgress, fetchSyncStatus]);

  useEffect(() => {
    if (!syncStatus?.syncInProgress || hasBackendProgress) return;
    const tick = () => {
      setIndeterminatePercent((p) =>
        Math.min(INDETERMINATE_MAX_PERCENT, p + INDETERMINATE_STEP)
      );
    };
    const immediateId = setTimeout(tick, 50);
    const intervalId = setInterval(tick, INDETERMINATE_PROGRESS_INTERVAL_MS);
    return () => {
      clearTimeout(immediateId);
      clearInterval(intervalId);
    };
  }, [syncStatus?.syncInProgress, hasBackendProgress]);

  return (
    <LoadingOverlay
      text={mainText}
      progress={syncStatus?.syncInProgress ? percent : undefined}
      subtext={subtext}
    />
  );
}
