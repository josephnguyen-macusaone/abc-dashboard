/**
 * License API - Unified entry point.
 * Use createLicenseApiClient() or LicenseRepository for license operations.
 */

// Re-export all types
export type {
  LicenseSyncStatusResponse,
  LicenseListMeta,
  ExternalLicenseRow,
  ExternalLicenseListResponse,
  InternalLicenseRow,
  InternalLicenseListResponse,
  LicenseGetResponse,
  LicensesRequiringAttentionResponse,
  LicenseApiRow,
} from './types';

// Re-export transforms
export { extractNotes, transformApiLicenseToRecord, transformRecordToApiLicense } from './transforms';
export type { ExternalLicensePayload } from './transforms';

// Re-export API client (preferred for new code)
export { LicenseApiClient, createLicenseApiClient } from './api-client';
export type { ILicenseApiClient, LicenseListResult } from '@/infrastructure/api/interfaces/i-license-api-client';
