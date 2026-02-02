/**
 * License API DTOs and response types.
 * Mirrors external and internal license management API shapes (see PLAN_LICENSE_API_REFACTOR.md §4).
 * Types are manually maintained; update when backend API changes.
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
  expiringSoon: LicenseAttentionItem[];
  expired: LicenseAttentionItem[];
  suspended: LicenseAttentionItem[];
  total: number;
}

/** Union for transform input: external or internal license row */
export type LicenseApiRow = ExternalLicenseRow | InternalLicenseRow;

// =============================================================================
// Query parameters
// =============================================================================

export interface GetLicensesParams {
  page?: number;
  limit?: number;
  status?: string | string[];
  dba?: string;
  license_type?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  searchField?: string;
  plan?: string | string[];
  term?: string | string[];
  zip?: string;
}

// =============================================================================
// Update payloads
// =============================================================================

export interface InternalLicenseUpdatePayload {
  status?: string;
  seatsTotal?: number;
  notes?: string;
  dba?: string;
  zip?: string;
  key?: string;
  product?: string;
  plan?: string;
  term?: string;
  startsAt?: string;
  expiresAt?: string;
  emailLicense?: string;
  pass?: string;
  cancelDate?: string;
  lastPayment?: number;
  lastActive?: string;
  smsPurchased?: number;
  smsSent?: number;
  smsBalance?: number;
  agents?: number;
  agentsCost?: number;
  agentsName?: string[];
  [key: string]: unknown;
}

// =============================================================================
// Bulk operations
// =============================================================================

export interface BulkResultItem {
  id?: string;
  appid?: string;
  email?: string;
  countid?: number;
  success?: boolean;
  error?: string;
  message?: string;
  license?: InternalLicenseRow;
}

export interface BulkUpdateResponse {
  success: boolean;
  message: string;
  data: {
    updated: number;
    failed: number;
    results: BulkResultItem[];
  };
}

export interface BulkCreateResponse {
  success: boolean;
  message: string;
  data: {
    created: number;
    failed: number;
    results: BulkResultItem[];
  };
}

export interface BulkDeleteResponse {
  success: boolean;
  message: string;
  data: {
    deleted: number;
    failed: number;
    results: BulkResultItem[];
  };
}

// =============================================================================
// Lifecycle operations
// =============================================================================

export interface ConflictItem {
  type: string;
  message: string;
  id?: string;
  details?: Record<string, unknown>;
}

export interface RenewalPreviewResponse {
  success: boolean;
  message: string;
  data: {
    currentExpiration: string;
    proposedExpiration: string;
    extensionDays: number;
    costImpact: number;
    conflicts: ConflictItem[];
  };
}

export interface ExpirationPreviewResponse {
  success: boolean;
  message: string;
  data: {
    currentStatus: string;
    proposedStatus: string;
    gracePeriodDays: number;
    autoSuspendEnabled: boolean;
    conflicts: ConflictItem[];
  };
}

export interface BulkRenewResponse {
  success: boolean;
  message: string;
  data: {
    renewed: number;
    failed: number;
    results: BulkResultItem[];
  };
}

export interface BulkExpireResponse {
  success: boolean;
  message: string;
  data: {
    expired: number;
    failed: number;
    results: BulkResultItem[];
  };
}

export interface LicenseAttentionItem {
  id: string;
  dba?: string;
  status?: string;
  startDay?: string;
  expiresAt?: string;
  daysUntilExpiry?: number;
  plan?: string;
  lastPayment?: number;
  emailLicense?: string;
  [key: string]: unknown;
}

// =============================================================================
// Analytics
// =============================================================================

export interface MonthlyBreakdownItem {
  month: number;
  year: number;
  count: number;
  amount?: number;
  revenue?: number;
  activeLicenses?: number;
  newLicenses?: number;
  expiredLicenses?: number;
}

export interface LicenseAnalyticsResponse {
  success: boolean;
  message: string;
  data: {
    totalLicenses: number;
    activeLicenses: number;
    expiredLicenses: number;
    suspendedLicenses: number;
    utilizationRate: number;
    monthlyBreakdown: MonthlyBreakdownItem[];
    statusDistribution: Record<string, number>;
  };
}

// =============================================================================
// SMS Payments
// =============================================================================

export interface SmsPaymentItem {
  id?: string;
  appid?: string;
  countid?: number;
  emailLicense?: string;
  amount: number;
  paymentDate?: string;
  description?: string;
  smsCredits?: number;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface SmsPaymentsResponse {
  success: boolean;
  message: string;
  data: {
    payments: SmsPaymentItem[];
    totals: {
      totalPayments: number;
      totalAmount: number;
      totalSmsCredits: number;
    };
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
}

export interface AddSmsPaymentResponse {
  success: boolean;
  message: string;
  data: {
    payment: SmsPaymentItem;
    updatedLicense: InternalLicenseRow;
  };
}

// =============================================================================
// Dashboard metrics
// =============================================================================

export interface DashboardMetricsAlertItem {
  id: string;
  dba?: string;
  status?: string;
  expiresAt?: string;
  daysUntilExpiry?: number;
  seatsTotal?: number;
  usedSeats?: number;
  availableSeats?: number;
  [key: string]: unknown;
}
