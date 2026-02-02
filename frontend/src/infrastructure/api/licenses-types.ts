/**
 * License API DTOs and response types.
 * Mirrors external and internal license management API shapes (see PLAN_LICENSE_API_REFACTOR.md §4).
 */

// =============================================================================
// List meta (same for both APIs)
// =============================================================================

export interface LicenseListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// =============================================================================
// External license management API
// =============================================================================

export interface ExternalLicenseRow {
  countid?: number;
  id?: string;
  appid?: string;
  license_type?: string;
  dba?: string;
  zip?: string;
  mid?: string;
  status?: string | number;
  ActivateDate?: string;
  Coming_expired?: string;
  monthlyFee?: number;
  smsBalance?: number;
  Email_license?: string;
  pass?: string;
  Package?: Record<string, unknown>;
  Note?: string;
  Sendbat_workspace?: string;
  lastActive?: string;
  [key: string]: unknown;
}

export interface ExternalLicenseListResponse {
  success: boolean;
  data: ExternalLicenseRow[];
  meta: LicenseListMeta;
}

// =============================================================================
// Internal license management API
// =============================================================================

export interface InternalLicenseRow {
  id?: string;
  dba?: string;
  zip?: string;
  startDay?: string;
  status?: string;
  plan?: string;
  term?: string;
  cancelDate?: string;
  lastPayment?: number;
  lastActive?: string;
  smsPurchased?: number;
  smsSent?: number;
  smsBalance?: number;
  agents?: number;
  agentsCost?: number;
  agentsName?: string[];
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface InternalLicenseListResponse {
  success: boolean;
  message?: string;
  timestamp?: string;
  meta: LicenseListMeta;
  data: InternalLicenseRow[];
}

// =============================================================================
// Get single license (internal: data.license; external may wrap differently)
// =============================================================================

export interface LicenseGetResponse {
  success: boolean;
  message?: string;
  data: { license: InternalLicenseRow } | InternalLicenseRow;
}

// =============================================================================
// Sync status
// =============================================================================

export interface LicenseSyncStatusResponse {
  enabled?: boolean;
  running?: boolean;
  timezone?: string;
  schedule?: string;
  lastSyncResult?: {
    timestamp?: string;
    duration?: number;
    success?: boolean;
    totalFetched?: number;
    created?: number;
    updated?: number;
    failed?: number;
    error?: string;
  };
  statistics?: {
    totalRuns?: number;
    successfulRuns?: number;
    failedRuns?: number;
    avgDuration?: number;
    successRate?: string;
  };
}

// =============================================================================
// Other responses (minimal shapes for typing)
// =============================================================================

export interface LicensesRequiringAttentionResponse {
  expiringSoon: unknown[];
  expired: unknown[];
  suspended: unknown[];
  total: number;
}

/** Union for transform input: external or internal license row */
export type LicenseApiRow = ExternalLicenseRow | InternalLicenseRow;
