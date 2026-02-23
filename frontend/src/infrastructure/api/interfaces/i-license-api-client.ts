/**
 * License API Client interface.
 * Allows injection for testing and SSR (server-side http client with cookies).
 */
import type {
  GetLicensesParams,
  InternalLicenseUpdatePayload,
  LicenseGetResponse,
  LicenseSyncStatusResponse,
  BulkUpdateResponse,
  BulkCreateResponse,
  BulkDeleteResponse,
  LicensesRequiringAttentionResponse,
} from '@/infrastructure/api/licenses/types';

export interface LicenseListResult {
  licenses: import('@/types').LicenseRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ILicenseApiClient {
  getLicenses(params?: GetLicensesParams): Promise<LicenseListResult>;
  getLicense(id: string): Promise<LicenseGetResponse>;
  updateLicense(id: string, updates: InternalLicenseUpdatePayload): Promise<LicenseGetResponse>;
  bulkCreateLicenses(licenses: InternalLicenseUpdatePayload[]): Promise<BulkCreateResponse>;
  bulkUpdateLicenses(updates: {
    identifiers: { appids?: string[]; emails?: string[]; countids?: number[] };
    updates: InternalLicenseUpdatePayload;
  }): Promise<BulkUpdateResponse>;
  bulkUpdateInternalLicenses(updates: Array<{ id: string; [key: string]: unknown }>): Promise<unknown[]>;
  bulkDeleteLicenses(identifiers: { appids?: string[]; emails?: string[]; countids?: number[] }): Promise<BulkDeleteResponse>;
  getLicenseSyncStatus(): Promise<LicenseSyncStatusResponse>;
  getDashboardMetrics(params?: Record<string, unknown>): Promise<unknown>;
  getLicensesRequiringAttention(options?: Record<string, unknown>): Promise<{ data: LicensesRequiringAttentionResponse }>;
  getSmsPayments(params?: Record<string, unknown>): Promise<unknown>;
  addSmsPayment(paymentData: Record<string, unknown>): Promise<unknown>;
}
