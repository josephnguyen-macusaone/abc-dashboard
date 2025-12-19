import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { LicenseRecord, LicenseStatus, LicenseTerm } from '@/shared/types';
import { licenseApi } from '@/infrastructure/api/licenses';
import { getErrorMessage } from '@/infrastructure/api/errors';
import logger from '@/shared/utils/logger';
import { toast } from 'sonner';
import { container } from '@/shared/di/container';

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
  key: string;
  product: string;
  dba: string;
  zip?: string;
  startsAt: string;
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
  bulkCreateLicenses: (licenses: Array<Partial<LicenseRecord>>) => Promise<LicenseRecord[]>;
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

            // Convert status array to comma-separated string for API compatibility
            const apiParams = {
              ...queryParams,
              status: Array.isArray(queryParams.status)
                ? queryParams.status.join(',')
                : queryParams.status,
              sortBy: queryParams.sortBy as keyof LicenseRecord
            };

            const response = await container.licenseManagementService.getLicenses(apiParams);

            // Ensure response has expected structure with better error handling
            if (!response) {
              storeLogger.error('API returned null/undefined response');
              throw new Error('API returned null or undefined response');
            }

            if (!response.data && !Array.isArray(response.data)) {
              storeLogger.error('API response missing or invalid data field', {
                responseKeys: Object.keys(response),
                dataType: typeof response.data
              });
              // Provide fallback empty array instead of crashing
              set({
                licenses: [],
                pagination: {
                  page: apiParams.page || 1,
                  limit: apiParams.limit || 20,
                  total: 0,
                  totalPages: 0
                },
                loading: false
              });
              return;
            }

            if (!response.pagination) {
              storeLogger.warn('API response missing pagination, using defaults', {
                responseKeys: Object.keys(response)
              });
              // Use default pagination if missing
              set({
                licenses: response.data,
                pagination: {
                  page: apiParams.page || 1,
                  limit: apiParams.limit || 20,
                  total: response.data.length,
                  totalPages: Math.ceil(response.data.length / (apiParams.limit || 20))
                },
                loading: false
              });
              return;
            }

            set({
              licenses: response.data,
              pagination: {
                ...response.pagination,
                total: response.pagination.total || response.data.length
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

            const licenseData = await container.licenseManagementService.getLicense(typeof id === 'string' ? parseInt(id) : id);

            set({ currentLicense: licenseData, loading: false });

            return licenseData;
          } catch (error) {
            const errorMessage = getErrorMessage(error);
            set({ error: errorMessage, loading: false });
            storeLogger.error('Failed to fetch license', { licenseId: id, error: errorMessage });
            throw error;
          }
        },

        bulkCreateLicenses: async (licenses: Array<Partial<LicenseRecord>>) => {
          try {
            set({ loading: true, error: null });

            const createdLicenses = await container.licenseManagementService.bulkCreateLicenses(licenses as Array<Omit<LicenseRecord, 'id' | 'updatedAt' | 'createdAt' | 'smsBalance'>>);

            // Add the new licenses to the list
            const currentLicenses = get().licenses;
            set({
              licenses: [...createdLicenses, ...currentLicenses],
              loading: false
            });

            toast.success(`${createdLicenses.length} licenses created successfully`);
            return createdLicenses;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to bulk create licenses';
            set({ error: errorMessage, loading: false });
            throw error;
          }
        },

        createLicense: async (licenseData: CreateLicenseRequest) => {
          try {
            set({ loading: true, error: null });

            // Transform CreateLicenseRequest to Partial<LicenseRecord>
            const licenseRecord: Partial<LicenseRecord> = {
              key: licenseData.key,
              product: licenseData.product,
              dba: licenseData.dba,
              zip: licenseData.zip,
              startsAt: licenseData.startsAt, // Transform startsAt to startsAt
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

            const createdLicense = await container.licenseManagementService.createLicense(licenseRecord as Omit<LicenseRecord, 'id' | 'smsBalance' | 'createdAt' | 'updatedAt'>);

            // Add the new license to the list
            const currentLicenses = get().licenses;
            set({
              licenses: [createdLicense, ...currentLicenses],
              loading: false
            });

            toast.success('License created successfully');
            return createdLicense;
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

            const updatedLicense = await container.licenseManagementService.updateLicense(typeof id === 'string' ? parseInt(id) : id, licenseRecord);

            // Update the license in the list
            const currentLicenses = get().licenses;
            const updatedLicenses = currentLicenses.map(license =>
              license.id === id ? updatedLicense : license
            );

            set({
              licenses: updatedLicenses,
              currentLicense: updatedLicense,
              loading: false
            });

            toast.success('License updated successfully');
            return updatedLicense;
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

            await container.licenseManagementService.deleteLicense(typeof id === 'string' ? parseInt(id) : id);

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
            // The LicenseManagementService will handle the rest of the transformation
            const response = await container.licenseManagementService.bulkUpdateLicenses(updates);

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

            toast.success(`Changes saved successfully`);
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

            await container.licenseManagementService.bulkDeleteLicenses(ids.map(id => typeof id === 'string' ? parseInt(id) : id));

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
