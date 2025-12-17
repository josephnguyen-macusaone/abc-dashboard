import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { LicenseRecord, LicenseStatus, LicenseTerm } from '@/shared/types';
import { licenseApi } from '@/infrastructure/api/licenses';
import { getErrorMessage } from '@/infrastructure/api/errors';
import logger from '@/shared/utils/logger';

export interface LicenseFilters {
  search?: string;
  status?: LicenseStatus | LicenseStatus[];
  dba?: string;
}

export interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface LicenseListResponse {
  licenses: LicenseRecord[];
  pagination: PaginationState;
  stats?: {
    total: number;
    active: number;
    expired: number;
    pending: number;
    cancel: number;
  };
}

export interface CreateLicenseRequest {
  dba: string;
  zip?: string;
  startDay: string;
  status?: LicenseStatus;
  plan?: string;
  term?: LicenseTerm;
  cancelDate?: string;
  lastPayment?: number;
  smsPurchased?: number;
  smsSent?: number;
  agents?: number;
  agentsName?: string[];
  agentsCost?: number;
  notes?: string;
}

export interface UpdateLicenseRequest {
  dba?: string;
  zip?: string;
  startDay?: string;
  status?: LicenseStatus;
  plan?: string;
  term?: LicenseTerm;
  cancelDate?: string;
  lastPayment?: number;
  smsPurchased?: number;
  smsSent?: number;
  agents?: number;
  agentsName?: string[];
  agentsCost?: number;
  notes?: string;
}

interface LicenseState {
  // State
  licenses: LicenseRecord[];
  currentLicense: LicenseRecord | null;
  loading: boolean;
  error: string | null;
  filters: LicenseFilters;
  pagination: PaginationState;
  selectedLicenses: (number | string)[];

  // Actions
  fetchLicenses: (params?: Partial<LicenseFilters & { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc'; status?: LicenseStatus | LicenseStatus[] }>) => Promise<void>;
  fetchLicense: (id: number | string) => Promise<LicenseRecord | null>;
  createLicense: (licenseData: CreateLicenseRequest) => Promise<LicenseRecord>;
  updateLicense: (id: number | string, licenseData: UpdateLicenseRequest) => Promise<LicenseRecord>;
  deleteLicense: (id: number | string) => Promise<void>;
  bulkUpdateLicenses: (updates: Array<Partial<LicenseRecord> & { id: number | string }>) => Promise<LicenseRecord[]>;
  bulkDeleteLicenses: (ids: (number | string)[]) => Promise<void>;
  setFilters: (filters: LicenseFilters) => void;
  setPagination: (pagination: Partial<PaginationState>) => void;
  setSelectedLicenses: (licenseIds: (number | string)[]) => void;
  clearError: () => void;
  reset: () => void;
}

export const useLicenseStore = create<LicenseState>()(
  devtools(
    (set, get) => {
      const storeLogger = logger.createChild({
        component: 'LicenseStore',
      });

      return {
        // Initial state
        licenses: [],
        currentLicense: null,
        loading: false,
        error: null,
        filters: {},
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        selectedLicenses: [],

        fetchLicenses: async (params = {}) => {
          try {
            set({ loading: true, error: null });

            const currentFilters = get().filters;
            const currentPagination = get().pagination;

            // Only send page and limit from pagination, not metadata (total, totalPages, hasNext, hasPrev)
            const queryParams = {
              ...currentFilters,
              page: params.page ?? currentPagination.page,
              limit: params.limit ?? currentPagination.limit,
              ...params,
            };

            // Remove undefined values from queryParams before sending to API
            (Object.keys(queryParams) as Array<keyof typeof queryParams>)
              .forEach((key) => {
                if (queryParams[key] === undefined)
                  delete queryParams[key];
              });

            const response = await licenseApi.getLicenses(queryParams);

            // Use total from stats if available, otherwise from pagination
            const total = response.stats?.total ?? response.pagination.total ?? 0;

            set({
              licenses: response.licenses,
              pagination: {
                ...response.pagination,
                total: total
              },
              loading: false
            });
          } catch (error) {
            const errorMessage = getErrorMessage(error);
            set({ error: errorMessage, loading: false });
            storeLogger.error('Failed to fetch licenses', { error: errorMessage });
            throw error;
          }
        },

        fetchLicense: async (id: number | string) => {
          try {
            set({ loading: true, error: null });

            const licenseData = await licenseApi.getLicense(id);

            set({ currentLicense: licenseData, loading: false });

            return licenseData;
          } catch (error) {
            const errorMessage = getErrorMessage(error);
            set({ error: errorMessage, loading: false });
            storeLogger.error('Failed to fetch license', { licenseId: id, error: errorMessage });
            throw error;
          }
        },

        createLicense: async (licenseData: CreateLicenseRequest) => {
          try {
            set({ loading: true, error: null });

            // Transform CreateLicenseRequest to Partial<LicenseRecord>
            const licenseRecord: Partial<LicenseRecord> = {
              dba: licenseData.dba,
              zip: licenseData.zip,
              startsAt: licenseData.startDay, // Transform startDay to startsAt
              status: licenseData.status,
              plan: licenseData.plan,
              term: licenseData.term,
              cancelDate: licenseData.cancelDate,
              lastPayment: licenseData.lastPayment,
              smsPurchased: licenseData.smsPurchased,
              smsSent: licenseData.smsSent,
              agents: licenseData.agents,
              agentsName: licenseData.agentsName,
              agentsCost: licenseData.agentsCost,
              notes: licenseData.notes,
            };

            const response = await licenseApi.createLicense(licenseRecord);

            // Add the new license to the list
            const currentLicenses = get().licenses;
            set({
              licenses: [response, ...currentLicenses],
              loading: false
            });

            return response;
          } catch (error) {
            const errorMessage = getErrorMessage(error);
            set({ error: errorMessage, loading: false });
            storeLogger.error('Failed to create license', { error: errorMessage });
            throw error;
          }
        },

        updateLicense: async (id: number | string, licenseData: UpdateLicenseRequest) => {
          try {
            set({ loading: true, error: null });

            // Transform UpdateLicenseRequest to Partial<LicenseRecord>
            const licenseRecord: Partial<LicenseRecord> = {
              dba: licenseData.dba,
              zip: licenseData.zip,
              startsAt: licenseData.startDay, // Transform startDay to startsAt
              status: licenseData.status,
              plan: licenseData.plan,
              term: licenseData.term,
              cancelDate: licenseData.cancelDate,
              lastPayment: licenseData.lastPayment,
              smsPurchased: licenseData.smsPurchased,
              smsSent: licenseData.smsSent,
              agents: licenseData.agents,
              agentsName: licenseData.agentsName,
              agentsCost: licenseData.agentsCost,
              notes: licenseData.notes,
            };

            const response = await licenseApi.updateLicense(id, licenseRecord);

            // Update the license in the list
            const currentLicenses = get().licenses;
            const updatedLicenses = currentLicenses.map(license =>
              license.id === id ? response : license
            );

            set({
              licenses: updatedLicenses,
              currentLicense: response,
              loading: false
            });

            return response;
          } catch (error) {
            const errorMessage = getErrorMessage(error);
            set({ error: errorMessage, loading: false });
            storeLogger.error('Failed to update license', { licenseId: id, error: errorMessage });
            throw error;
          }
        },

        deleteLicense: async (id: number | string) => {
          try {
            set({ loading: true, error: null });

            await licenseApi.deleteLicense(id);

            // Remove the license from the list
            const currentLicenses = get().licenses;
            const filteredLicenses = currentLicenses.filter(license => license.id !== id);

            set({
              licenses: filteredLicenses,
              loading: false
            });
          } catch (error) {
            const errorMessage = getErrorMessage(error);
            set({ error: errorMessage, loading: false });
            storeLogger.error('Failed to delete license', { licenseId: id, error: errorMessage });
            throw error;
          }
        },

        bulkUpdateLicenses: async (updates: Array<Partial<LicenseRecord> & { id: number | string }>) => {
          try {
            set({ loading: true, error: null });

            // Transform each update from LicenseRecord format (with startsAt) to API format
            // The API service will handle the rest of the transformation
            const response = await licenseApi.bulkUpdateLicenses(updates);

            // Update the licenses in the list with the API response (fully updated records)
            const currentLicenses = get().licenses;
            const updatedLicenses = currentLicenses.map(license => {
              const updatedLicense = response.find(updated => updated.id === license.id);
              return updatedLicense || license;
            });

            set({
              licenses: updatedLicenses,
              loading: false
            });

            return response;
          } catch (error) {
            const errorMessage = getErrorMessage(error);
            set({ error: errorMessage, loading: false });
            storeLogger.error('Failed to bulk update licenses', { error: errorMessage });
            throw error;
          }
        },

        bulkDeleteLicenses: async (ids: (number | string)[]) => {
          try {
            set({ loading: true, error: null });

            await licenseApi.bulkDeleteLicenses(ids);

            // Remove the licenses from the list
            const currentLicenses = get().licenses;
            const filteredLicenses = currentLicenses.filter(license => !ids.includes(license.id));

            set({
              licenses: filteredLicenses,
              selectedLicenses: [],
              loading: false
            });
          } catch (error) {
            const errorMessage = getErrorMessage(error);
            set({ error: errorMessage, loading: false });
            storeLogger.error('Failed to bulk delete licenses', { licenseIds: ids, error: errorMessage });
            throw error;
          }
        },

        setFilters: (filters: LicenseFilters) => {
          set({ filters });
        },

        setPagination: (pagination: Partial<PaginationState>) => {
          set(state => ({
            pagination: { ...state.pagination, ...pagination }
          }));
        },

        setSelectedLicenses: (licenseIds: number[]) => {
          set({ selectedLicenses: licenseIds });
        },

        clearError: () => {
          set({ error: null });
        },

        reset: () => {
          set({
            licenses: [],
            currentLicense: null,
            loading: false,
            error: null,
            filters: {},
            pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
            selectedLicenses: [],
          });
        },
      };
    },
    { name: 'license-store' }
  )
);

// Selectors for easier access
export const selectLicenses = (state: LicenseState) => state.licenses;
export const selectLicenseLoading = (state: LicenseState) => state.loading;
export const selectLicensePagination = (state: LicenseState) => state.pagination;
export const selectLicenseError = (state: LicenseState) => state.error;
export const selectSelectedLicenses = (state: LicenseState) => state.selectedLicenses;
