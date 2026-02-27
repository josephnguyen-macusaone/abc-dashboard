/**
 * License API Client - Instance-based, injectable.
 * Replaces static LicenseApiService/InternalLicenseApiService for repository use.
 * Accepts optional httpClient for SSR injection.
 */
import type { ILicenseApiClient, LicenseListResult } from '@/infrastructure/api/interfaces/i-license-api-client';
import type {
  GetLicensesParams,
  InternalLicenseUpdatePayload,
  LicenseGetResponse,
  LicenseSyncStatusResponse,
  BulkCreateResponse,
  BulkUpdateResponse,
  BulkDeleteResponse,
  LicensesRequiringAttentionResponse,
  InternalLicenseListResponse,
} from './types';
import { transformApiLicenseToRecord } from './transforms';
import { httpClient } from '@/infrastructure/api/core/client';
import type { LicenseRecord } from '@/types';

type HttpClientLike = {
  get<T = unknown>(url: string, config?: unknown): Promise<T>;
  post<T = unknown>(url: string, data?: unknown, config?: unknown): Promise<T>;
  put<T = unknown>(url: string, data?: unknown, config?: unknown): Promise<T>;
  patch<T = unknown>(url: string, data?: unknown, config?: unknown): Promise<T>;
  delete<T = unknown>(url: string, config?: unknown): Promise<T>;
};

function buildQueryString(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        searchParams.append(key, value.join(','));
      } else {
        searchParams.append(key, String(value));
      }
    }
  });
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

export class LicenseApiClient implements ILicenseApiClient {
  constructor(private readonly client: HttpClientLike = httpClient) {}

  async getLicenses(params: GetLicensesParams = {}): Promise<LicenseListResult> {
    const qs = buildQueryString(params as Record<string, unknown>);
    const response = await this.client.get<InternalLicenseListResponse>(`/licenses${qs}`);
    const data = (response as InternalLicenseListResponse)?.data ?? [];
    const meta = (response as InternalLicenseListResponse)?.meta ?? {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
    };
    const licenses: LicenseRecord[] = (Array.isArray(data) ? data : []).map(transformApiLicenseToRecord);
    return {
      licenses,
      pagination: meta,
    };
  }

  async getLicense(id: string): Promise<LicenseGetResponse> {
    return this.client.get<LicenseGetResponse>(`/licenses/${id}`);
  }

  async updateLicense(id: string, updates: InternalLicenseUpdatePayload): Promise<LicenseGetResponse> {
    return this.client.put<LicenseGetResponse>(`/licenses/${id}`, updates);
  }

  async bulkCreateLicenses(licenses: InternalLicenseUpdatePayload[]): Promise<BulkCreateResponse> {
    return this.client.post<BulkCreateResponse>('/licenses/bulk', licenses);
  }

  async bulkUpdateLicenses(updates: {
    identifiers: { appids?: string[]; emails?: string[]; countids?: number[] };
    updates: InternalLicenseUpdatePayload;
  }): Promise<BulkUpdateResponse> {
    return this.client.patch<BulkUpdateResponse>('/licenses/bulk', updates);
  }

  async bulkUpdateInternalLicenses(updates: Array<{ id: string; [key: string]: unknown }>): Promise<unknown[]> {
    const response = await this.client.patch<unknown[] | { data?: unknown[] }>('/licenses/bulk', updates);
    return Array.isArray(response) ? response : (response as { data?: unknown[] })?.data ?? [];
  }

  async bulkDeleteLicenses(identifiers: {
    appids?: string[];
    emails?: string[];
    countids?: number[];
  }): Promise<BulkDeleteResponse> {
    return this.client.delete<BulkDeleteResponse>('/licenses/bulk', { data: identifiers } as unknown);
  }

  async getLicenseSyncStatus(): Promise<LicenseSyncStatusResponse> {
    // Cache-bust so each poll is a fresh request (avoids HTTP client deduplication returning stale progress)
    const response = await this.client.get<{ data?: LicenseSyncStatusResponse } | LicenseSyncStatusResponse>(
      '/licenses/sync/status',
      { params: { _: Date.now() } }
    );
    const body = response as { data?: LicenseSyncStatusResponse };
    return body?.data ?? (response as LicenseSyncStatusResponse);
  }

  async triggerSync(): Promise<void> {
    await this.client.post<{ message?: string }>('/licenses/sync');
  }

  async getDashboardMetrics(params?: Record<string, unknown>): Promise<unknown> {
    const qs = params ? buildQueryString(params) : '';
    return this.client.get(`/licenses/dashboard/metrics${qs}`);
  }

  async getLicensesRequiringAttention(options?: Record<string, unknown>): Promise<{
    data: LicensesRequiringAttentionResponse;
  }> {
    const qs = options ? buildQueryString(options) : '';
    const response = await this.client.get<{ data: LicensesRequiringAttentionResponse }>(
      `/licenses/attention${qs}`
    );
    const data = (response as { data?: LicensesRequiringAttentionResponse })?.data ?? {
      expiringSoon: [],
      expired: [],
      suspended: [],
      total: 0,
    };
    return { data };
  }

  async getSmsPayments(params?: Record<string, unknown>): Promise<unknown> {
    const qs = params ? buildQueryString(params ?? {}) : '';
    return this.client.get(`/external-licenses/sms-payments${qs}`);
  }

  async addSmsPayment(paymentData: Record<string, unknown>): Promise<unknown> {
    return this.client.post('/external-licenses/add-sms-payment', paymentData);
  }
}

/** Create default client (uses httpClient singleton) */
export function createLicenseApiClient(client?: HttpClientLike): ILicenseApiClient {
  return new LicenseApiClient(client);
}
