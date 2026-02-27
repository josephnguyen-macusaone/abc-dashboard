'use client';

import { useEffect } from 'react';
import { LoadingOverlay } from '@/presentation/components/atoms';
import { useLicenseStore, selectSyncStatus } from '@/infrastructure/stores/license';

const SYNC_POLL_INTERVAL_MS = 500;

/** Parse percent from backend log-style line, e.g. "Fetching pages 5 of 148 (3% complete)" */
function parsePercentFromLogLine(line: string | null | undefined): number | undefined {
  if (!line || typeof line !== 'string') return undefined;
  const match = line.match(/\((\d+)%\s*complete\)/);
  return match ? Math.min(100, Math.max(0, parseInt(match[1], 10))) : undefined;
}

/**
 * Full-screen overlay shown when license sync is in progress.
 * Percent is parsed from backend lastProgressLogLine (same format as server logs); fallback to syncProgress.
 * Polls sync status every 500ms so percentages (1%, 3%, …) update promptly.
 */
export function LicenseSyncProgressOverlay() {
  const syncStatus = useLicenseStore(selectSyncStatus);
  const fetchSyncStatus = useLicenseStore((state) => state.fetchSyncStatus);

  const syncProgress = syncStatus?.syncProgress;
  const processed = syncProgress?.processed ?? 0;
  const total = syncProgress?.total ?? 0;
  const phase = (syncProgress as { phase?: string })?.phase;
  const logLine = syncStatus?.lastProgressLogLine;

  // Prefer percent parsed from backend log line; then syncProgress.percent; then processed/total
  const percentFromLog = parsePercentFromLogLine(logLine);
  const percentFromSync =
    total > 0 && typeof (syncProgress as { percent?: number })?.percent === 'number'
      ? (syncProgress as { percent: number }).percent
      : total > 0
        ? Math.round((processed / total) * 100)
        : undefined;
  const percent =
    typeof percentFromLog === 'number'
      ? Math.min(100, percentFromLog)
      : typeof percentFromSync === 'number'
        ? Math.min(100, percentFromSync)
        : undefined;

  const hasProgress = total > 0 || Boolean(logLine);
  const subtext = logLine
    ? `${logLine}. Do not refresh the page.`
    : hasProgress
      ? phase === 'fetch'
        ? `Fetching pages… ${processed.toLocaleString()} / ${total.toLocaleString()}. Do not refresh the page.`
        : `${processed.toLocaleString()} / ${total.toLocaleString()} processed. Do not refresh the page.`
      : 'Do not refresh the page.';
  const mainText =
    typeof percent === 'number'
      ? `Syncing license data (${Math.round(percent)}%). Please wait!`
      : 'Syncing license data… Please wait!';

  useEffect(() => {
    if (!syncStatus?.syncInProgress) return;
    fetchSyncStatus();
    const pollId = setInterval(() => {
      fetchSyncStatus();
    }, SYNC_POLL_INTERVAL_MS);
    return () => clearInterval(pollId);
  }, [syncStatus?.syncInProgress, fetchSyncStatus]);

  return (
    <LoadingOverlay
      text={mainText}
      progress={syncStatus?.syncInProgress ? percent : undefined}
      hidePercentLabel
      subtext={subtext}
    />
  );
}
