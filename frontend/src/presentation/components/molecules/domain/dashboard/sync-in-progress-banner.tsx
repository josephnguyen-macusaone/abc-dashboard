'use client';

import { Alert, AlertDescription } from '@/presentation/components/atoms/primitives/alert';
import { useLicenseStore, selectSyncStatus } from '@/infrastructure/stores/license';
import { Loader2 } from 'lucide-react';

/**
 * Banner shown when license sync is in progress.
 * Warns users to wait before saving data to avoid conflicts.
 */
export function SyncInProgressBanner() {
  const syncStatus = useLicenseStore(selectSyncStatus);
  const syncInProgress = syncStatus?.syncInProgress === true;

  if (!syncInProgress) return null;

  return (
    <Alert variant="warning" className="mb-4 rounded-lg">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      <AlertDescription>
        License sync in progress. Please wait before saving changes to avoid conflicts.
      </AlertDescription>
    </Alert>
  );
}
