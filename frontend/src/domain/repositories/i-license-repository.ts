import { License, LicenseId, CreateLicenseProps, PersistenceLicenseProps } from '@/domain/entities/license-entity';

/**
 * Domain Repository Interface: License Management
 * Defines the contract for license data operations
 *
 * This interface follows Clean Architecture principles:
 * - Only depends on domain entities and value objects
 * - No dependencies on application DTOs or infrastructure
 * - Uses domain-specific types for all operations
 */
export interface ILicenseRepository {
  /**
   * Find license by ID
   */
  findById(id: LicenseId): Promise<License | null>;

  /**
   * Find licenses by DBA
   */
  findByDba(dba: string): Promise<License[]>;

  /**
   * Find licenses by status
   */
  findByStatus(status: string): Promise<License[]>;

  /**
   * Find licenses expiring within specified days
   */
  findExpiringWithin(days: number): Promise<License[]>;

  /**
   * Find licenses by plan
   */
  findByPlan(plan: string): Promise<License[]>;

  /**
   * Search licenses by query (flexible search across multiple fields)
   */
  search(query: string): Promise<License[]>;

  /**
   * Get paginated licenses with filtering and sorting
   * Returns both the paginated results and total count
   */
  findAll(specification: LicenseSpecification): Promise<{
    licenses: License[];
    total: number;
    pagination: {
      page: number;
      limit: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }>;

  /**
   * Get total count of licenses matching specification
   * @deprecated Use findAll() which returns total count
   */
  count(specification: LicenseSpecification): Promise<number>;

  /**
   * Save license (create or update)
   */
  save(license: License): Promise<void>;

  /**
   * Save multiple licenses
   */
  saveAll(licenses: License[]): Promise<void>;

  /**
   * Delete license by ID
   */
  delete(id: LicenseId): Promise<void>;

  /**
   * Delete multiple licenses
   */
  deleteAll(ids: LicenseId[]): Promise<void>;

  /**
   * Check if license exists
   */
  exists(id: LicenseId): Promise<boolean>;

  /**
   * Get license statistics
   */
  getStatistics(): Promise<LicenseStatistics>;

  /**
   * Bulk create licenses
   */
  bulkCreate(licenses: CreateLicenseProps[]): Promise<License[]>;

  /**
   * Bulk update licenses
   */
  bulkUpdate(updates: Array<{ id: LicenseId; updates: Partial<PersistenceLicenseProps> }>): Promise<License[]>;

  /**
   * Get license sync status (e.g. last sync result for dashboard display)
   */
  getSyncStatus(): Promise<LicenseSyncStatus>;

  /**
   * Get dashboard metrics (overview, utilization, alerts - shape depends on backend)
   */
  getDashboardMetrics(params?: DashboardMetricsParams): Promise<unknown>;

  /**
   * Get licenses requiring attention (expiring soon, expired, suspended)
   */
  getLicensesRequiringAttention(options?: Record<string, unknown>): Promise<LicensesRequiringAttentionResult>;

  /**
   * Bulk update licenses by external identifiers (appids, emails, countids)
   */
  bulkUpdateByIdentifiers(identifiers: BulkIdentifiers, updates: Record<string, unknown>): Promise<{ updated: number }>;

  /**
   * Get SMS payments with optional filters
   */
  getSmsPayments(params?: SmsPaymentsParams): Promise<SmsPaymentsResult>;

  /**
   * Add SMS payment
   */
  addSmsPayment(paymentData: AddSmsPaymentData): Promise<unknown>;

  /**
   * Bulk create licenses (raw API shape) for application service use
   */
  bulkCreateLicensesRaw(licenses: unknown[]): Promise<{ success?: boolean; data?: { results?: unknown[] }; message?: string }>;

  /**
   * Bulk update internal licenses by ID (raw API shape) for application service use
   */
  bulkUpdateInternalLicensesRaw(updates: unknown[]): Promise<unknown>;
}

/** Params for dashboard metrics (read-model) */
export interface DashboardMetricsParams {
  startsAtFrom?: string;
  startsAtTo?: string;
  search?: string;
  searchField?: string;
  status?: string | string[];
  plan?: string | string[];
  term?: string | string[];
  dba?: string;
  zip?: string;
}

/** Result for licenses requiring attention */
export interface LicensesRequiringAttentionResult {
  expiringSoon: unknown[];
  expired: unknown[];
  suspended: unknown[];
  total: number;
}

/** Identifiers for bulk update by external IDs */
export interface BulkIdentifiers {
  appids?: string[];
  emails?: string[];
  countids?: number[];
}

/** Params for SMS payments list */
export interface SmsPaymentsParams {
  appid?: string;
  emailLicense?: string;
  countid?: number;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/** Result for SMS payments list */
export interface SmsPaymentsResult {
  payments: unknown[];
  totals: unknown;
  pagination: unknown;
}

/** Payload for adding SMS payment */
export interface AddSmsPaymentData {
  appid?: string;
  emailLicense?: string;
  countid?: number;
  amount: number;
  paymentDate?: string;
  description?: string;
}

/**
 * License sync status (read-only, for dashboard/UI)
 */
export interface LicenseSyncStatus {
  syncInProgress?: boolean;
  lastSyncResult?: {
    timestamp?: string;
    success?: boolean;
    error?: string;
    created?: number;
    updated?: number;
    failed?: number;
    duration?: number;
  };
}

/**
 * Specification pattern for license queries
 * Defines search criteria for flexible querying
 */
export interface LicenseSpecification {
  /** General search term; backend matches DBA and agent names when searchField is not set */
  search?: string;
  /** When set with search, limit search to one field (e.g. agentsName, dba) */
  searchField?: string;
  /** Filter by DBA (partial match) */
  dba?: string;

  /** Filter by exact status */
  status?: string;

  /** Filter by plan (partial match) */
  plan?: string;

  /** Filter by term */
  term?: string;

  /** Filter by seats usage */
  seatsUsed?: {
    min?: number;
    max?: number;
  };

  /** Filter by expiration date range */
  expiresBetween?: {
    from: Date;
    to: Date;
  };

  /** Filter by license start date (starts_at) - sent as startsAtFrom/startsAtTo to API */
  startsAtFrom?: string;
  startsAtTo?: string;

  /** Filter licenses expiring within days */
  expiringWithin?: number;

  /** Filter by SMS balance */
  smsBalance?: {
    min?: number;
    max?: number;
  };

  /** Filter by creation date range */
  createdBetween?: {
    from: Date;
    to: Date;
  };

  /** Filter by last active date range */
  lastActiveBetween?: {
    from: Date;
    to: Date;
  };

  /** Pagination */
  pagination?: {
    page: number;
    limit: number;
  };

  /** Sorting */
  sort?: {
    field: LicenseSortField;
    direction: 'asc' | 'desc';
  };
}

/**
 * Sortable fields for licenses
 */
export type LicenseSortField =
  | 'dba'
  | 'status'
  | 'plan'
  | 'term'
  | 'startsAt'
  | 'createdAt'
  | 'updatedAt'
  | 'lastActive'
  | 'seatsTotal'
  | 'seatsUsed'
  | 'smsBalance'
  | 'lastPayment';

/**
 * License statistics for dashboard and reporting
 */
export interface LicenseStatistics {
  /** Total number of licenses */
  total: number;

  /** Count by status */
  byStatus: Record<string, number>;

  /** Count by term */
  byTerm: Record<string, number>;

  /** Count by plan */
  byPlan: Record<string, number>;

  /** Licenses expiring within 30 days */
  expiringSoon: number;

  /** Licenses expired */
  expired: number;

  /** Total seats across all licenses */
  totalSeats: number;

  /** Total seats used */
  usedSeats: number;

  /** Total SMS purchased */
  totalSmsPurchased: number;

  /** Total SMS balance remaining */
  totalSmsBalance: number;

  /** Total revenue from payments */
  totalRevenue: number;

  /** Recent activity (last 30 days) */
  recentActivity: {
    created: number;
    activated: number;
    expired: number;
    cancelled: number;
  };
}

/**
 * License repository factory for dependency injection
 */
export interface ILicenseRepositoryFactory {
  create(): ILicenseRepository;
}
