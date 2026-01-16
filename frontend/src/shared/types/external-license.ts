/**
 * External License Types
 * Types for the external license management system integration
 */

export type ExternalLicenseStatus = 0 | 1; // 0 = inactive, 1 = active

export type ExternalLicenseType = 'product' | 'service' | 'trial' | 'enterprise';

export type SyncStatusType = 'pending' | 'synced' | 'failed';

export interface ExternalLicense {
  // Core fields from external API
  id: string;
  countid?: number;
  appid: string;
  license_type: ExternalLicenseType;
  dba?: string;
  zip?: string;
  mid?: string;
  status: ExternalLicenseStatus;
  ActivateDate?: string;
  Coming_expired?: string;
  monthlyFee: number;
  smsBalance: number;
  Email_license: string;
  pass: string;
  Package?: any;
  Note?: string;
  Sendbat_workspace?: string;
  lastActive?: string;

  // Sync metadata (internal)
  lastSyncedAt?: string;
  syncStatus: SyncStatusType;
  syncError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SyncStatus {
  success: boolean;
  internal: {
    total: number;
    synced: number;
    failed: number;
    pending: number;
    successRate: number;
  };
  external: {
    healthy: boolean;
    lastHealthCheck: string;
    error?: string;
  };
  lastSync?: string;
}

export interface ExternalLicenseFilters {
  search?: string;
  appid?: string;
  email?: string;
  dba?: string;
  status?: ExternalLicenseStatus;
  license_type?: ExternalLicenseType;
  syncStatus?: SyncStatusType;
  createdAtFrom?: string;
  createdAtTo?: string;
}

export interface ExternalLicensePagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ExternalLicenseListResponse {
  licenses: ExternalLicense[];
  pagination: ExternalLicensePagination;
  stats?: {
    total: number;
    active: number;
    expired: number;
    pending: number;
    synced: number;
  };
}

export interface CreateExternalLicenseRequest {
  emailLicense: string;
  pass: string;
  monthlyFee?: number;
  Mid?: string;
  dba?: string;
  zip?: string;
  status?: ExternalLicenseStatus;
  license_type?: ExternalLicenseType;
  Package?: any;
  Note?: string;
  coming_expired?: string;
  sendbat_workspace?: string;
}

export interface UpdateExternalLicenseRequest {
  dba?: string;
  zip?: string;
  status?: ExternalLicenseStatus;
  license_type?: ExternalLicenseType;
  monthlyFee?: number;
  smsBalance?: number;
  Note?: string;
}

export interface BulkUpdateExternalLicenseRequest {
  updates: Array<{
    id: string;
    updates: UpdateExternalLicenseRequest;
  }>;
}

export interface SyncOptions {
  forceFullSync?: boolean;
  batchSize?: number;
  dryRun?: boolean;
}

export interface ExternalLicenseStats {
  totalLicenses: number;
  active: number;
  expired: number;
  expiringSoon: number;
  pendingSync: number;
  failedSync: number;
}

// Status display helpers
export const EXTERNAL_LICENSE_STATUS_LABELS: Record<ExternalLicenseStatus, string> = {
  0: 'Inactive',
  1: 'Active',
};

export const EXTERNAL_LICENSE_TYPE_LABELS: Record<ExternalLicenseType, string> = {
  product: 'Product',
  service: 'Service',
  trial: 'Trial',
  enterprise: 'Enterprise',
};

export const SYNC_STATUS_LABELS: Record<SyncStatusType, string> = {
  pending: 'Pending',
  synced: 'Synced',
  failed: 'Failed',
};

export const SYNC_STATUS_COLORS: Record<SyncStatusType, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  synced: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
};