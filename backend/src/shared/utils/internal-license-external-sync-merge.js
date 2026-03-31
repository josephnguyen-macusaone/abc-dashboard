/**
 * External→internal license sync: when the internal row was edited after the last successful
 * external sync, strip web-managed fields from the patch so the dashboard does not lose edits.
 * Shared by SyncExternalLicensesUseCase and ExternalLicenseRepository legacy/comprehensive paths.
 */

export const INTERNAL_WEB_MANAGED_FIELDS_FOR_EXTERNAL_SYNC = [
  'dba',
  'zip',
  'status',
  'plan',
  'term',
  'startsAt',
  'cancelDate',
  'lastPayment',
  'seatsTotal',
  'seatsUsed',
  'smsPurchased',
  'smsSent',
  'agents',
  'agentsName',
  'agentsCost',
  'notes',
];

function getLastExternalSyncRaw(internalLicense) {
  return internalLicense?.last_external_sync ?? internalLicense?.lastExternalSync ?? null;
}

export function isInternalNewerThanLastExternalSync(internalLicense) {
  if (!internalLicense?.updatedAt) {
    return false;
  }
  const lastSyncRaw = getLastExternalSyncRaw(internalLicense);
  if (!lastSyncRaw) {
    return false;
  }
  const internalUpdatedAt = new Date(internalLicense.updatedAt);
  const lastExternalSync = new Date(lastSyncRaw);
  if (Number.isNaN(internalUpdatedAt.getTime()) || Number.isNaN(lastExternalSync.getTime())) {
    return false;
  }
  return internalUpdatedAt.getTime() > lastExternalSync.getTime();
}

export function applyInternalMergePolicy(rawUpdateData, internalLicense) {
  const updateData = { ...rawUpdateData };
  const preservedFields = [];

  if (!isInternalNewerThanLastExternalSync(internalLicense)) {
    return { updateData, preservedFields };
  }

  for (const field of INTERNAL_WEB_MANAGED_FIELDS_FOR_EXTERNAL_SYNC) {
    if (field in updateData) {
      preservedFields.push(field);
      delete updateData[field];
    }
  }

  return { updateData, preservedFields };
}
