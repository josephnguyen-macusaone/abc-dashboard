import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { LicenseRecord, LicenseStatus, LicenseTerm } from '@/types';
import { LicenseSyncStatus } from '@/domain/repositories/i-license-repository';
import { getErrorMessage } from '@/infrastructure/api/errors';
import logger from '@/shared/helpers/logger';
import { toast } from 'sonner';
import { container } from '@/shared/di/container';

export interface LicenseFilters {
  /** Search term; backend matches DBA and agent names by default when searchField is not set */
  search?: string;
  /** When set with search, limit search to one field (e.g. agentsName for agent names only) */
  searchField?: 'key' | 'dba' | 'product' | 'plan' | 'agentsName';
  status?: LicenseStatus | LicenseStatus[];
  plan?: string | string[];
  term?: LicenseTerm | LicenseTerm[];
  dba?: string;
  zip?: string;
  /** Filter by license start date (starts_at) on or after this date (ISO or YYYY-MM-DD). */
  startsAtFrom?: string;
  /** Filter by license start date (starts_at) on or before this date (ISO or YYYY-MM-DD). */
  startsAtTo?: string;
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
  /** Timestamp (ms) when licenses were last successfully fetched; null before first fetch */
  lastFetchedAt: number | null;
  /** License sync status for dashboard (e.g. last sync result) */
  syncStatus: LicenseSyncStatus | null;
  syncStatusLoading: boolean;
  syncStatusError: boolean;
  /** Dashboard metrics (overview, utilization, alerts - shape depends on backend) */
  dashboardMetrics: unknown | null;
  dashboardMetricsLoading: boolean;
  dashboardMetricsError: string | null;
  /** Licenses requiring attention (lifecycle) */
  licensesRequiringAttentionLoading: boolean;
  licensesRequiringAttentionError: string | null;
  /** Bulk update by identifiers (appids/emails/countids) */
  bulkUpdateByIdentifiersLoading: boolean;
  /** SMS payments */
  smsPayments: unknown[];
  smsTotals: unknown;
  smsPagination: unknown;
  smsPaymentsLoading: boolean;
  smsPaymentsError: string | null;

  // Actions
  fetchSyncStatus: () => Promise<void>;
  fetchDashboardMetrics: (params?: { startsAtFrom?: string; startsAtTo?: string; search?: string; status?: string; dba?: string }) => Promise<void>;
  fetchLicensesRequiringAttention: (options?: Record<string, unknown>) => Promise<{ expiringSoon: unknown[]; expired: unknown[]; suspended: unknown[]; total: number }>;
  bulkUpdateByIdentifiers: (identifiers: { appids?: string[]; emails?: string[]; countids?: number[] }, updates: Record<string, unknown>) => Promise<{ updated: number }>;
  fetchSmsPayments: (params?: { appid?: string; emailLicense?: string; countid?: number; startDate?: string; endDate?: string; page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' }) => Promise<void>;
  addSmsPayment: (paymentData: { appid?: string; emailLicense?: string; countid?: number; amount: number; paymentDate?: string; description?: string }) => Promise<void>;
  fetchLicenses: (params?: Partial<LicenseFilters & { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc'; status?: LicenseStatus | LicenseStatus[]; plan?: string | string[]; term?: LicenseTerm | LicenseTerm[]; startsAtFrom?: string; startsAtTo?: string }>) => Promise<void>;
  fetchLicense: (id: number | string) => Promise<LicenseRecord | null>;
  createLicense: (licenseData: CreateLicenseRequest) => Promise<LicenseRecord>;
  updateLicense: (id: number | string, licenseData: UpdateLicenseRequest) => Promise<LicenseRecord>;
  deleteLicense: (id: number | string) => Promise<void>;
  bulkCreateLicenses: (licenses: Array<Partial<LicenseRecord>>) => Promise<LicenseRecord[]>;
  bulkUpdateLicenses: (updates: Array<Partial<LicenseRecord> & { id: number | string }>) => Promise<LicenseRecord[]>;
  /** Create new and update existing licenses in one call (routes by id: temp/none → create, else → update). */
  bulkUpsertLicenses: (licenses: Array<Partial<LicenseRecord> & { id?: number | string }>) => Promise<LicenseRecord[]>;
  bulkDeleteLicenses: (ids: (number | string)[]) => Promise<void>;
  setFilters: (filters: LicenseFilters) => void;
  setPagination: (pagination: Partial<PaginationState>) => void;
  goToPage: (page: number) => Promise<void>;
  changePageSize: (limit: number) => Promise<void>;
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
        lastFetchedAt: null,
        syncStatus: null,
        syncStatusLoading: false,
        syncStatusError: false,
        dashboardMetrics: null,
        dashboardMetricsLoading: false,
        dashboardMetricsError: null,
        licensesRequiringAttentionLoading: false,
        licensesRequiringAttentionError: null,
        bulkUpdateByIdentifiersLoading: false,
        smsPayments: [],
        smsTotals: null,
        smsPagination: null,
        smsPaymentsLoading: false,
        smsPaymentsError: null,

        fetchSyncStatus: async () => {
          set({ syncStatusError: false, syncStatusLoading: true });
          try {
            const status = await container.licenseManagementService.getSyncStatus();
            set({ syncStatus: status, syncStatusLoading: false });
          } catch {
            set({ syncStatus: null, syncStatusLoading: false, syncStatusError: true });
          }
        },

        fetchDashboardMetrics: async (params) => {
          set({ dashboardMetricsError: null, dashboardMetricsLoading: true });
          try {
            const metrics = await container.licenseManagementService.getDashboardMetrics(params);
            set({ dashboardMetrics: metrics, dashboardMetricsLoading: false });
          } catch (err) {
            set({
              dashboardMetrics: null,
              dashboardMetricsLoading: false,
              dashboardMetricsError: getErrorMessage(err),
            });
          }
        },

        fetchLicensesRequiringAttention: async (options = {}) => {
          set({ licensesRequiringAttentionError: null, licensesRequiringAttentionLoading: true });
          try {
            const result = await container.licenseManagementService.getLicensesRequiringAttention(options);
            set({ licensesRequiringAttentionLoading: false });
            return result;
          } catch (err) {
            set({
              licensesRequiringAttentionLoading: false,
              licensesRequiringAttentionError: getErrorMessage(err),
            });
            return { expiringSoon: [], expired: [], suspended: [], total: 0 };
          }
        },

        bulkUpdateByIdentifiers: async (identifiers, updates) => {
          set({ bulkUpdateByIdentifiersLoading: true });
          try {
            const result = await container.licenseManagementService.bulkUpdateByIdentifiers(identifiers, updates);
            set({ bulkUpdateByIdentifiersLoading: false });
            toast.success(`Successfully updated ${result.updated} licenses`);
            return result;
          } catch (err) {
            set({ bulkUpdateByIdentifiersLoading: false });
            toast.error(getErrorMessage(err));
            throw err;
          }
        },

        fetchSmsPayments: async (params) => {
          set({ smsPaymentsError: null, smsPaymentsLoading: true });
          try {
            const result = await container.licenseManagementService.getSmsPayments(params);
            set({
              smsPayments: result.payments,
              smsTotals: result.totals,
              smsPagination: result.pagination,
              smsPaymentsLoading: false,
            });
          } catch (err) {
            set({
              smsPayments: [],
              smsTotals: null,
              smsPagination: null,
              smsPaymentsLoading: false,
              smsPaymentsError: getErrorMessage(err),
            });
          }
        },

        addSmsPayment: async (paymentData) => {
          set({ smsPaymentsError: null, smsPaymentsLoading: true });
          try {
            await container.licenseManagementService.addSmsPayment(paymentData);
            set({ smsPaymentsLoading: false });
            toast.success('SMS payment added successfully');
            await get().fetchSmsPayments();
          } catch (err) {
            set({ smsPaymentsLoading: false, smsPaymentsError: getErrorMessage(err) });
            throw err;
          }
        },

        fetchLicenses: async (params = {}) => {
          try {
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

            // Persist filter state so metrics cards and other consumers use same filters.
            // search matches DBA and agent names; searchField can restrict to one field (e.g. agentsName).
            const filterKeys: (keyof LicenseFilters)[] = ['search', 'searchField', 'status', 'plan', 'term', 'dba', 'zip', 'startsAtFrom', 'startsAtTo'];
            const nextFilters = { ...currentFilters } as Record<string, unknown>;
            const paramsWithFilters = queryParams as Record<string, unknown>;
            filterKeys.forEach((key) => {
              const val = paramsWithFilters[key];
              if (val !== undefined && val !== null && val !== '') {
                nextFilters[key] = val;
              } else {
                delete nextFilters[key];
              }
            });
            const appliedFilters: LicenseFilters = nextFilters as LicenseFilters;

            set({ loading: true, error: null, filters: appliedFilters });

            const apiParams: Record<string, string | number | undefined> = {
              ...queryParams,
              status: Array.isArray(queryParams.status)
                ? queryParams.status.join(',')
                : queryParams.status,
              plan: Array.isArray(queryParams.plan)
                ? queryParams.plan.join(',')
                : queryParams.plan,
              term: Array.isArray(queryParams.term)
                ? queryParams.term.join(',')
                : queryParams.term,
              sortBy: queryParams.sortBy
            };

            // Silent operation - no logging
            storeLogger.debug('Fetching licenses from API', {
              params: apiParams,
              currentLicenseCount: get().licenses.length
            });

            const response = await container.licenseManagementService.getLicenses(apiParams);

            storeLogger.debug('License fetch response received', {
              hasData: !!response?.data,
              dataType: typeof response?.data,
              dataIsArray: Array.isArray(response?.data),
              dataLength: Array.isArray(response?.data) ? response.data.length : 'N/A',
              firstItemId: Array.isArray(response?.data) && response.data.length > 0 ? response.data[0]?.id : 'N/A'
            });

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
                page: Number(apiParams.page) || 1,
                limit: Number(apiParams.limit) || 20,
                total: 0,
                totalPages: 0
              },
              loading: false,
              lastFetchedAt: Date.now(),
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
                  page: Number(apiParams.page) || 1,
                  limit: Number(apiParams.limit) || 20,
                  total: response.data.length,
                  totalPages: Math.ceil(response.data.length / (Number(apiParams.limit) || 20))
                },
                loading: false,
                lastFetchedAt: Date.now(),
              });
              return;
            }

            set({
              licenses: response.data,
              pagination: {
                ...response.pagination,
                // Use pagination.total from service response (which comes from use case)
                total: response.pagination?.total || response.data.length
              },
              loading: false,
              lastFetchedAt: Date.now(),
            });
          } catch (error) {
            const errorMessage = getErrorMessage(error);
            set({ error: errorMessage, loading: false });
            storeLogger.error('Failed to fetch licenses', { error: errorMessage });
            throw error;
          }
        },

        fetchLicense: async (id: string) => {
          try {
            set({ loading: true, error: null });

            const licenseData = await container.licenseManagementService.getLicense(id.toString());

            set({ currentLicense: licenseData, loading: false, lastFetchedAt: Date.now() });

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

            return createdLicenses;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to bulk create licenses';
            set({ error: errorMessage, loading: false });
            throw error;
          }
        },

        // Smart method that automatically routes to create or update based on presence of IDs
        bulkUpsertLicenses: async (licenses: Array<Partial<LicenseRecord> & { id?: number | string }>) => {
          try {
            // Validate store state before proceeding
            const currentState = get();
            if (!Array.isArray(currentState.licenses)) {
              storeLogger.error('Store licenses state is corrupted', {
                licensesType: typeof currentState.licenses,
                licensesValue: currentState.licenses
              });
              throw new Error('Store state corrupted: licenses is not an array');
            }

            set({ loading: true, error: null });

            // Separate licenses into create and update operations
            const licensesToCreate: Array<Partial<LicenseRecord>> = [];
            const licensesToUpdate: Array<Partial<LicenseRecord> & { id: number | string }> = [];

            licenses.forEach(license => {
              const idStr = String(license.id || '').trim();
              const hasValidId = idStr !== '' && idStr !== 'undefined' && idStr !== 'null';
              const isTempId = idStr.startsWith('temp-');

              if (hasValidId && !isTempId) {
                // Has a valid non-temp ID - treat as update
                licensesToUpdate.push(license as Partial<LicenseRecord> & { id: number | string });
              } else {
                // No valid ID or temp ID - treat as create
                const { id, ...licenseWithoutId } = license; // Remove id field for create
                licensesToCreate.push(licenseWithoutId);
              }
            });

            storeLogger.debug('Bulk upsert operation', {
              total: licenses.length,
              toCreate: licensesToCreate.length,
              toUpdate: licensesToUpdate.length
            });

            const results: LicenseRecord[] = [];

            // Handle creates first
            if (licensesToCreate.length > 0) {
              try {
                const createdLicenses = await container.licenseManagementService.bulkCreateLicenses(licensesToCreate);
                results.push(...createdLicenses);
                storeLogger.debug('Bulk create completed', { created: createdLicenses.length });
              } catch (createError) {
                storeLogger.error('Bulk create failed', { error: createError instanceof Error ? createError.message : String(createError) });
                throw createError;
              }
            }

            let updateIdMapping: Record<string, string> = {};
            // Handle updates (pass current store licenses so key-style ids resolve against the same list the user is editing)
            if (licensesToUpdate.length > 0) {
              try {
                const storeLicenses = get().licenses;
                const updateResult = await container.licenseManagementService.bulkUpdateLicenses(licensesToUpdate, {
                  currentLicenses: Array.isArray(storeLicenses) ? storeLicenses : []
                });

                let updatedLicenses: LicenseRecord[];
                const resultObj = updateResult as { _isBulkUpdateResult?: boolean; results?: LicenseRecord[]; idMapping?: Record<string, string> } | LicenseRecord[];

                storeLogger.debug('Bulk update result received', {
                  resultType: typeof updateResult,
                  isArray: Array.isArray(updateResult),
                  has_isBulkUpdateResult: !!(resultObj && typeof resultObj === 'object' && !Array.isArray(resultObj) && (resultObj as { _isBulkUpdateResult?: boolean })._isBulkUpdateResult),
                  resultsType: resultObj && typeof resultObj === 'object' && !Array.isArray(resultObj) && 'results' in resultObj ? typeof (resultObj as { results?: LicenseRecord[] }).results : 'undefined',
                  resultsIsArray: Array.isArray(resultObj && typeof resultObj === 'object' && !Array.isArray(resultObj) ? (resultObj as { results?: LicenseRecord[] }).results : null)
                });

                if (resultObj && typeof resultObj === 'object' && !Array.isArray(resultObj) && (resultObj as { _isBulkUpdateResult?: boolean })._isBulkUpdateResult) {
                  updatedLicenses = ((resultObj as { results?: LicenseRecord[] }).results ?? []) as LicenseRecord[];
                  updateIdMapping = (resultObj as { idMapping?: Record<string, string> }).idMapping ?? {};
                } else if (Array.isArray(updateResult)) {
                  // Direct array format
                  updatedLicenses = updateResult;
                } else {
                  storeLogger.error('Invalid bulk update response format', {
                    resultType: typeof updateResult,
                    resultValue: updateResult
                  });
                  throw new Error('Invalid bulk update response format');
                }

                if (!Array.isArray(updatedLicenses)) {
                  storeLogger.error('Updated licenses is not an array', {
                    updatedLicensesType: typeof updatedLicenses,
                    updatedLicensesValue: updatedLicenses
                  });
                  throw new Error('Bulk update returned invalid license array');
                }

                results.push(...updatedLicenses);
                storeLogger.debug('Bulk update completed', { updated: updatedLicenses.length });
              } catch (updateError) {
                storeLogger.error('Bulk update failed', { error: updateError instanceof Error ? updateError.message : String(updateError) });
                throw updateError;
              }
            }

            // Merge into current list: replace updated rows (by idMapping or key), prepend created
            const currentLicenses = get().licenses;
            const safeCurrent = Array.isArray(currentLicenses) ? currentLicenses : [];
            const mergedList = safeCurrent.map((license) => {
                  if (!license || typeof license !== 'object') return license;
                  const originalId = license.id;
                  const uuid = updateIdMapping[String(originalId)] ?? (typeof originalId === 'string' ? updateIdMapping[originalId] : undefined);
                  if (uuid) {
                    const updated = results.find((r) => r.id === uuid);
                    if (updated) return updated;
                  }
                  // Fallback: match by key when id is key (e.g. external API)
                  const byKey = results.find(
                    (r) => r.key != null && license.key != null && String(r.key) === String(license.key)
                  );
                  return byKey ?? license;
                });

            const newResults = results.filter(
              (r) => !!r && typeof r === 'object' && 'id' in r && !safeCurrent.some((l) =>
                l?.id === r.id || (l?.key != null && r.key != null && String(l.key) === String(r.key))
              )
            );
            set({
              licenses: [...newResults, ...mergedList],
              loading: false
            });

            return results;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to bulk upsert licenses';
            set({ error: errorMessage, loading: false });
            storeLogger.error('Bulk upsert failed', { error: errorMessage });
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

        updateLicense: async (id: string, licenseData: UpdateLicenseRequest) => {
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

            const updatedLicense = await container.licenseManagementService.updateLicense(id.toString(), licenseRecord);

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
          // TODO: Implement delete functionality in Clean Architecture use cases
          throw new Error('Delete functionality not yet implemented in Clean Architecture');
        },

        bulkUpdateLicenses: async (updates: Array<Partial<LicenseRecord> & { id: number | string }>) => {
          try {
            set({ loading: true, error: null });

            // Transform each update from LicenseRecord format (with startsAt) to API format
            // The LicenseManagementService will handle the rest of the transformation
            storeLogger.debug('Calling bulk update service', {
              updateCount: updates.length,
              sampleUpdates: updates.slice(0, 2)
            });

            const storeLicenses = get().licenses;
            const response = await container.licenseManagementService.bulkUpdateLicenses(updates, {
              currentLicenses: Array.isArray(storeLicenses) ? storeLicenses : []
            });

            type BulkUpdateResponse = { _isBulkUpdateResult?: boolean; results?: LicenseRecord[]; idMapping?: Record<string, string> };
            const responseObj = response as BulkUpdateResponse | LicenseRecord[];

            storeLogger.debug('Bulk update store received response', {
              responseType: typeof response,
              isArray: Array.isArray(response),
              responseKeys: response && typeof response === 'object' ? Object.keys(response) : [],
              has_isBulkUpdateResult: !!(responseObj && typeof responseObj === 'object' && !Array.isArray(responseObj) && responseObj._isBulkUpdateResult),
              resultsType: responseObj && typeof responseObj === 'object' && !Array.isArray(responseObj) && responseObj.results ? typeof responseObj.results : 'undefined',
              resultsIsArray: Array.isArray(responseObj && typeof responseObj === 'object' && !Array.isArray(responseObj) ? responseObj.results : undefined)
            });

            let results: LicenseRecord[];
            let idMapping: Record<string, string> = {};

            if (responseObj && typeof responseObj === 'object' && !Array.isArray(responseObj) && responseObj._isBulkUpdateResult) {
              results = responseObj.results ?? [];
              idMapping = responseObj.idMapping ?? {};

              storeLogger.debug('Processing new format response', {
                resultsType: typeof results,
                resultsIsArray: Array.isArray(results),
                resultsLength: Array.isArray(results) ? results.length : 'N/A'
              });

              // Validate that results is an array
              if (!Array.isArray(results)) {
                storeLogger.error('Bulk update results is not an array', {
                  resultsType: typeof results,
                  resultsValue: results
                });
                throw new Error('Bulk update service returned invalid results format');
              }

              storeLogger.debug('Bulk update response with ID mapping', {
                responseCount: results.length,
                idMappingCount: Object.keys(idMapping).length,
                sampleMappings: Object.entries(idMapping).slice(0, 3)
              });
            } else if (Array.isArray(response)) {
              // Direct array format
              results = response;

              storeLogger.debug('Processing direct array format response', {
                resultsLength: results.length,
                sampleResponse: results.slice(0, 2)
              });

              if (!Array.isArray(results)) {
                storeLogger.error('Direct array response is not an array', {
                  responseType: typeof response,
                  responseValue: response
                });
                throw new Error('Bulk update response is not an array');
              }
            } else {
              // Unknown format
              storeLogger.error('Unknown bulk update response format', {
                responseType: typeof response,
                responseValue: response
              });
              throw new Error('Unknown bulk update response format');
            }

            // Update the licenses in the list with the API response (fully updated records)
            const currentState = get();
            const currentLicenses = currentState.licenses;

            // Safety check - ensure currentLicenses is an array
            if (!Array.isArray(currentLicenses)) {
              storeLogger.error('Current licenses is not an array', {
                currentType: typeof currentLicenses,
                currentValue: currentLicenses,
                fullStateKeys: Object.keys(currentState),
                licensesType: typeof currentState.licenses
              });
              throw new Error('Current licenses state is corrupted - not an array');
            }

            // Additional safety - ensure it's not empty in a weird way
            if (currentLicenses.length === undefined) {
              storeLogger.error('Current licenses has no length property', {
                currentLicenses,
                hasLength: 'length' in currentLicenses,
                constructor: currentLicenses.constructor?.name
              });
              throw new Error('Current licenses array is malformed');
            }

            storeLogger.debug('Updating current licenses', {
              currentCount: currentLicenses.length,
              responseCount: results.length,
              hasIdMapping: Object.keys(idMapping).length > 0
            });

            let updatedLicenses;
            // Final safety check before map operation
            if (!Array.isArray(currentLicenses) || typeof currentLicenses.map !== 'function') {
              storeLogger.error('currentLicenses failed final validation', {
                isArray: Array.isArray(currentLicenses),
                hasMap: typeof currentLicenses.map === 'function',
                type: typeof currentLicenses,
                value: currentLicenses
              });
              throw new Error('currentLicenses is not a valid array for mapping');
            }

            // Perform license mapping silently

            try {
              const mapResult = currentLicenses.map((license, index) => {
                if (!license || typeof license !== 'object') {
                  storeLogger.warn(`Invalid license at index ${index}`, {
                    license,
                    licenseType: typeof license
                  });
                  return license; // Return as-is
                }

                let updatedLicense;

                if (Object.keys(idMapping).length > 0) {
                  // Use ID mapping: find result by mapping original ID (or key) to UUID
                  const uuid = idMapping[String(license.id)] ?? idMapping[license.id as string];
                  if (uuid) {
                    updatedLicense = results.find(updated => updated.id === uuid);
                  }
                } else {
                  // Direct matching (legacy)
                  updatedLicense = results.find(updated => updated.id === license.id);
                }
                // Fallback: when current row uses key as id (e.g. external API), match by key
                if (!updatedLicense && license.key != null) {
                  updatedLicense = results.find(
                    (r) => r.key != null && String(r.key) === String(license.key)
                  );
                }

                return updatedLicense || license;
              });

              // Ensure map result is an array
              if (!Array.isArray(mapResult)) {
                storeLogger.error('Map result is not an array', {
                  mapResultType: typeof mapResult,
                  mapResult
                });
                throw new Error('Map operation did not return an array');
              }

              updatedLicenses = mapResult;

            // Count actually updated licenses
            let actuallyUpdated = 0;
            try {
              actuallyUpdated = updatedLicenses.filter((l, i) => l !== currentLicenses[i]).length;
            } catch (filterError) {
              storeLogger.error('Filter operation failed', {
                error: filterError instanceof Error ? filterError.message : String(filterError),
                updatedLicensesType: typeof updatedLicenses,
                updatedLicensesIsArray: Array.isArray(updatedLicenses),
                currentLicensesType: typeof currentLicenses,
                currentLicensesIsArray: Array.isArray(currentLicenses)
              });
              // If filter fails, assume no updates
              actuallyUpdated = 0;
            }

            if (actuallyUpdated > 0) {
              storeLogger.debug('Bulk update completed', {
                processed: currentLicenses.length,
                updated: actuallyUpdated
              });
            }
            } catch (mapError) {
              storeLogger.error('Map operation failed', {
                error: mapError instanceof Error ? mapError.message : String(mapError),
                currentLicensesLength: currentLicenses.length,
                resultsLength: results.length
              });
              // Fallback: don't update anything
              updatedLicenses = currentLicenses;
            }

            // Ensure updatedLicenses is an array before filtering
            let actuallyUpdated = 0;
            if (!Array.isArray(updatedLicenses)) {
              storeLogger.error('updatedLicenses is not an array after map operation', {
                updatedLicensesType: typeof updatedLicenses,
                updatedLicensesValue: updatedLicenses,
                currentLicensesType: typeof currentLicenses,
                currentLicensesIsArray: Array.isArray(currentLicenses)
              });
              // Fallback: assume no updates
              actuallyUpdated = 0;
            } else {
              actuallyUpdated = updatedLicenses.filter((license, index) => {
                const changed = license !== currentLicenses[index];
                if (changed) {
                  storeLogger.debug(`License ${license.id} was updated`, {
                    oldDba: currentLicenses[index]?.dba,
                    newDba: license.dba,
                    oldStatus: currentLicenses[index]?.status,
                    newStatus: license.status
                  });
                }
                return changed;
              }).length;
            }

            storeLogger.debug('License update summary', {
              totalLicenses: currentLicenses.length,
              responseItems: results.length,
              actuallyUpdated,
              finalLicenseSample: updatedLicenses.slice(0, 2).map(l => ({ id: l.id, dba: l.dba, status: l.status }))
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
          // TODO: Implement bulk delete functionality in Clean Architecture use cases
          throw new Error('Bulk delete functionality not yet implemented in Clean Architecture');
        },

        setFilters: (filters: LicenseFilters) => {
          set({ filters });
        },

        setPagination: (pagination: Partial<PaginationState>) => {
          set(state => ({
            pagination: { ...state.pagination, ...pagination }
          }));
        },

        goToPage: async (page: number) => {
          await get().fetchLicenses({ page });
        },

        changePageSize: async (limit: number) => {
          await get().fetchLicenses({ limit, page: 1 }); // Reset to page 1 when changing page size
        },

        setSelectedLicenses: (licenseIds: (number | string)[]) => {
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
            lastFetchedAt: null,
            syncStatus: null,
            syncStatusLoading: false,
            syncStatusError: false,
            dashboardMetrics: null,
            dashboardMetricsLoading: false,
            dashboardMetricsError: null,
            licensesRequiringAttentionLoading: false,
            licensesRequiringAttentionError: null,
            bulkUpdateByIdentifiersLoading: false,
            smsPayments: [],
            smsTotals: null,
            smsPagination: null,
            smsPaymentsLoading: false,
            smsPaymentsError: null,
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
export const selectLicenseFilters = (state: LicenseState) => state.filters;
export const selectLicenseError = (state: LicenseState) => state.error;
export const selectSelectedLicenses = (state: LicenseState) => state.selectedLicenses;
export const selectLicenseLastFetchedAt = (state: LicenseState) => state.lastFetchedAt;
export const selectSyncStatus = (state: LicenseState) => state.syncStatus;
export const selectSyncStatusLoading = (state: LicenseState) => state.syncStatusLoading;
export const selectSyncStatusError = (state: LicenseState) => state.syncStatusError;
export const selectDashboardMetrics = (state: LicenseState) => state.dashboardMetrics;
export const selectDashboardMetricsLoading = (state: LicenseState) => state.dashboardMetricsLoading;
export const selectDashboardMetricsError = (state: LicenseState) => state.dashboardMetricsError;
export const selectLicensesRequiringAttentionLoading = (state: LicenseState) => state.licensesRequiringAttentionLoading;
export const selectLicensesRequiringAttentionError = (state: LicenseState) => state.licensesRequiringAttentionError;
export const selectBulkUpdateByIdentifiersLoading = (state: LicenseState) => state.bulkUpdateByIdentifiersLoading;
export const selectSmsPayments = (state: LicenseState) => state.smsPayments;
export const selectSmsTotals = (state: LicenseState) => state.smsTotals;
export const selectSmsPaymentsLoading = (state: LicenseState) => state.smsPaymentsLoading;
export const selectSmsPaymentsError = (state: LicenseState) => state.smsPaymentsError;