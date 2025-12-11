import { httpClient } from '@/infrastructure/api/client';
import type { LicenseRecord, LicenseStatus, LicenseTerm } from '@/shared/types';

export interface LicenseListQuery {
  page?: number;
  limit?: number;
  status?: LicenseStatus;
  dba?: string;
  sortBy?: keyof LicenseRecord;
  sortOrder?: 'asc' | 'desc';
}

export interface LicenseListResponse {
  success: boolean;
  data: LicenseRecord[];
  meta: {
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

export interface LicenseResponse {
  success: boolean;
  data: {
    license: LicenseRecord;
  };
}

export const licenseService = {
  async list(params: LicenseListQuery): Promise<LicenseListResponse> {
    return httpClient.get<LicenseListResponse>('/licenses', { params });
  },

  async getById(id: number): Promise<LicenseResponse> {
    return httpClient.get<LicenseResponse>(`/licenses/${id}`);
  },

  async create(payload: Omit<LicenseRecord, 'id' | 'smsBalance' | 'createdAt' | 'updatedAt'>) {
    return httpClient.post<LicenseResponse>('/licenses', payload);
  },

  async update(id: number, payload: Partial<LicenseRecord>) {
    return httpClient.put<LicenseResponse>(`/licenses/${id}`, payload);
  },

  async bulkUpdate(updates: Partial<LicenseRecord>[]) {
    return httpClient.patch('/licenses/bulk', { updates });
  },

  async bulkCreate(licenses: Array<Omit<LicenseRecord, 'id' | 'smsBalance' | 'createdAt' | 'updatedAt'>>) {
    return httpClient.post('/licenses/bulk', { licenses });
  },

  async addRow(payload: Partial<LicenseRecord>) {
    return httpClient.post<LicenseResponse>('/licenses/row', payload);
  },

  async bulkDelete(ids: number[]) {
    return httpClient.delete('/licenses/bulk', { data: { ids } });
  },

  async delete(id: number) {
    return httpClient.delete(`/licenses/${id}`);
  },
};
