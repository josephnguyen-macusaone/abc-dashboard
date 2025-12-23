import { LicenseStatus, LicenseTerm } from '@/types';

/**
 * Application DTOs: License Management
 * Domain-level data transfer objects for license operations
 * Independent of infrastructure layer types
 */

/**
 * Create License DTO
 * Used for creating new licenses
 */
export interface CreateLicenseDTO {
  dba: string;
  zip: string;
  startsAt: string;
  plan: string;
  term: LicenseTerm;
  seatsTotal?: number;
  lastPayment?: number;
  smsPurchased?: number;
  agents?: number;
  agentsName?: string[];
  agentsCost?: number;
  notes?: string;
}

/**
 * Update License DTO
 * Used for updating existing licenses
 */
export interface UpdateLicenseDTO {
  dba?: string;
  zip?: string;
  status?: LicenseStatus;
  plan?: string;
  term?: LicenseTerm;
  seatsTotal?: number;
  lastPayment?: number;
  smsPurchased?: number;
  agents?: number;
  agentsName?: string[];
  agentsCost?: number;
  notes?: string;
}

/**
 * License List Query DTO
 * Used for querying licenses with pagination and filters
 */
export interface LicenseListQueryDTO {
  page?: number;
  limit?: number;
  search?: string;
  searchField?: 'dba' | 'plan' | 'key' | 'notes';
  dba?: string;
  zip?: string;
  status?: LicenseStatus | string;
  plan?: string;
  term?: LicenseTerm;
  seatsTotal?: {
    min?: number;
    max?: number;
  };
  seatsUsed?: {
    min?: number;
    max?: number;
  };
  smsBalance?: {
    min?: number;
    max?: number;
  };
  lastPayment?: {
    min?: number;
    max?: number;
  };
  sortBy?: 'dba' | 'status' | 'plan' | 'startsAt' | 'createdAt' | 'updatedAt' | 'lastActive' | 'seatsTotal' | 'seatsUsed' | 'smsBalance' | 'lastPayment';
  sortOrder?: 'asc' | 'desc';
  // Date range filters
  startsAtFrom?: string;
  startsAtTo?: string;
  createdAtFrom?: string;
  createdAtTo?: string;
  updatedAtFrom?: string;
  updatedAtTo?: string;
  lastActiveFrom?: string;
  lastActiveTo?: string;
  // Advanced filters
  expiringWithin?: number; // Days
  hasAvailableSeats?: boolean;
  utilizationRate?: {
    min?: number;
    max?: number;
  };
}

/**
 * License Search Query DTO
 * Used for flexible license search operations
 */
export interface LicenseSearchQueryDTO {
  query: string;
  limit?: number;
  fields?: ('dba' | 'plan' | 'key' | 'notes' | 'agentsName')[];
}

/**
 * License Response DTO
 * Used for license data in responses
 */
export interface LicenseResponseDTO {
  id: string;
  key?: string;
  product?: string;
  dba: string;
  zip: string;
  startsAt: string;
  status: LicenseStatus;
  cancelDate?: string;
  plan: string;
  term: LicenseTerm;
  seatsTotal: number;
  seatsUsed: number;
  lastPayment: number;
  lastActive: string;
  smsPurchased: number;
  smsSent: number;
  smsBalance: number;
  agents: number;
  agentsName: string[];
  agentsCost: number;
  notes: string;
  // Computed fields
  expirationDate: string;
  daysUntilExpiration: number;
  isExpiringSoon: boolean;
  utilizationRate: number;
  healthScore?: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Bulk License Operation DTO
 * Used for bulk create/update/delete operations
 */
export interface BulkCreateLicensesDTO {
  licenses: CreateLicenseDTO[];
}

export interface BulkUpdateLicensesDTO {
  updates: Array<{
    id: string;
    updates: UpdateLicenseDTO;
  }>;
}

export interface BulkDeleteLicensesDTO {
  ids: string[];
}

/**
 * License Statistics DTO
 * Used for license analytics and dashboard data
 */
export interface LicenseStatisticsDTO {
  total: number;
  byStatus: Record<LicenseStatus, number>;
  byTerm: Record<LicenseTerm, number>;
  byPlan: Record<string, number>;
  expiringSoon: number; // Within 30 days
  expired: number;
  utilization: {
    average: number;
    low: number; // < 50%
    optimal: number; // 50-90%
    high: number; // > 90%
  };
  revenue: {
    total: number;
    averagePerLicense: number;
    byPlan: Record<string, number>;
  };
  sms: {
    totalPurchased: number;
    totalSent: number;
    totalBalance: number;
    averagePerLicense: number;
  };
  activity: {
    recentlyActive: number; // Last 30 days
    inactive: number; // Over 90 days
    averageLastActive: number; // Days ago
  };
  health: {
    averageScore: number;
    excellent: number; // 80-100
    good: number; // 60-79
    fair: number; // 40-59
    poor: number; // 0-39
  };
}

/**
 * License Metrics DTO
 * Used for dashboard license metrics
 */
export interface LicenseMetricsDTO {
  totalLicenses: number;
  activeLicenses: number;
  expiringLicenses: number;
  expiredLicenses: number;
  utilizationRate: number;
  totalRevenue: number;
  totalSmsBalance: number;
  averageHealthScore: number;
  renewalRate: number;
  // Time series data for charts
  statusDistribution: Array<{
    status: LicenseStatus;
    count: number;
    percentage: number;
  }>;
  expirationTimeline: Array<{
    period: string; // e.g., "Next 7 days", "Next 30 days"
    count: number;
  }>;
  revenueByPlan: Array<{
    plan: string;
    revenue: number;
    percentage: number;
  }>;
}

/**
 * Paginated License List DTO
 * Used for paginated license responses
 */
export interface PaginatedLicenseListDTO {
  licenses: LicenseResponseDTO[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  statistics?: LicenseStatisticsDTO;
  filters?: {
    applied: Record<string, any>;
    available: {
      statuses: LicenseStatus[];
      plans: string[];
      terms: LicenseTerm[];
    };
  };
}

/**
 * License Validation Result DTO
 * Used for license validation responses
 */
export interface LicenseValidationResultDTO {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
    code?: string;
  }>;
  warnings?: Array<{
    field: string;
    message: string;
    suggestion?: string;
  }>;
}

/**
 * License Bulk Operation Result DTO
 * Used for bulk operation responses
 */
export interface BulkOperationResultDTO<T = any> {
  success: boolean;
  processed: number;
  successful: number;
  failed: number;
  results: Array<{
    id: string;
    success: boolean;
    result?: T;
    error?: string;
  }>;
  summary: {
    message: string;
    details?: Record<string, any>;
  };
}

/**
 * License Dashboard DTO
 * Used for comprehensive dashboard data
 */
export interface LicenseDashboardDTO {
  overview: {
    totalLicenses: number;
    activeLicenses: number;
    utilizationRate: number;
    totalRevenue: number;
  };
  alerts: Array<{
    type: 'expiring' | 'expired' | 'low_utilization' | 'high_utilization' | 'inactive';
    severity: 'low' | 'medium' | 'high' | 'critical';
    count: number;
    message: string;
    actionRequired: boolean;
  }>;
  charts: {
    statusDistribution: Array<{
      status: LicenseStatus;
      count: number;
      color: string;
    }>;
    expirationTrend: Array<{
      date: string;
      expiring: number;
      expired: number;
    }>;
    utilizationTrend: Array<{
      date: string;
      averageUtilization: number;
      lowUtilization: number;
      highUtilization: number;
    }>;
    revenueTrend: Array<{
      date: string;
      revenue: number;
      planBreakdown: Record<string, number>;
    }>;
  };
  recentActivity: Array<{
    id: string;
    type: 'created' | 'activated' | 'expired' | 'cancelled' | 'updated';
    dba: string;
    timestamp: string;
    details?: string;
  }>;
}

/**
 * License Export DTO
 * Used for data export operations
 */
export interface LicenseExportDTO {
  format: 'csv' | 'excel' | 'json';
  fields: (keyof LicenseResponseDTO)[];
  filters?: LicenseListQueryDTO;
  includeStatistics?: boolean;
  dateRange?: {
    from: string;
    to: string;
  };
}

/**
 * License Import Result DTO
 * Used for data import operations
 */
export interface LicenseImportResultDTO {
  success: boolean;
  totalProcessed: number;
  successful: number;
  failed: number;
  errors: Array<{
    row: number;
    field?: string;
    message: string;
    data?: Record<string, any>;
  }>;
  preview?: LicenseResponseDTO[];
}

// Re-export domain types for convenience
export type { LicenseStatus, LicenseTerm } from '@/types';
