/**
 * License Management Page - Excel-like editing with DataGrid
 */

"use client";

import { useCallback, useEffect, useMemo } from "react";
import { toast } from "sonner";

import { useAuthStore } from "@/infrastructure/stores/auth";
import { useInitialLicenseFilters } from "@/presentation/hooks/use-initial-license-filters";
import { LicenseManagement } from "@/presentation/components/organisms/license-management";
import { LicensesDataGridSkeleton } from "@/presentation/components/organisms";
import { DashboardTemplate } from "@/presentation/components/templates";
import { useLicenseStore, selectLicenses, selectLicenseLoading, selectLicensePagination } from "@/infrastructure/stores/license";
import { ApiExceptionDto } from "@/application/dto/api-dto";
import type { LicenseRecord } from "@/types";

// Helper function to check if error should be shown to user
const shouldShowError = (error: unknown): boolean => {
  // Don't show errors that have been handled by auth system (redirecting to login)
  if (error instanceof ApiExceptionDto && error.authHandled) {
    return false;
  }
  return true;
};

export function LicenseManagementPage() {
  const { user: currentUser } = useAuthStore();

  const licenses = useLicenseStore(selectLicenses);
  const isLoading = useLicenseStore(selectLicenseLoading);
  const licensePagination = useLicenseStore(selectLicensePagination);
  const filters = useLicenseStore(state => state.filters);
  const fetchLicenses = useLicenseStore(state => state.fetchLicenses);
  const setFilters = useLicenseStore(state => state.setFilters);
  const setLoading = useLicenseStore(state => state.setLoading);
  const bulkCreateLicenses = useLicenseStore(state => state.bulkCreateLicenses);
  const bulkUpsertLicenses = useLicenseStore(state => state.bulkUpsertLicenses);
  const bulkDeleteLicenses = useLicenseStore(state => state.bulkDeleteLicenses);

  // Derive date range from store filters (server-side filter by license start date)
  const dateRange = useMemo((): { from?: Date; to?: Date } | undefined => {
    const from = filters.startsAtFrom ? new Date(filters.startsAtFrom) : undefined;
    const to = filters.startsAtTo ? new Date(filters.startsAtTo) : undefined;
    if (!from && !to) return undefined;
    return { from: isNaN(from?.getTime() ?? NaN) ? undefined : from, to: isNaN(to?.getTime() ?? NaN) ? undefined : to };
  }, [filters.startsAtFrom, filters.startsAtTo]);

  const loadLicenses = useCallback(
    async (params?: {
      page?: number;
      limit?: number;
      search?: string;
      searchField?: 'dba' | 'agentsName';
      status?: string;
      startsAtFrom?: string;
      startsAtTo?: string;
    }) => {
      const storeFilters = useLicenseStore.getState().filters;
      try {
        await fetchLicenses({
          page: params?.page ?? 1,
          limit: params?.limit ?? 20,
          search: params?.search,
          searchField: params?.searchField,
          status: params?.status as import('@/types').LicenseStatus | import('@/types').LicenseStatus[] | undefined,
          startsAtFrom: params?.startsAtFrom ?? storeFilters.startsAtFrom,
          startsAtTo: params?.startsAtTo ?? storeFilters.startsAtTo,
        });
      } catch (error) {
        if (shouldShowError(error)) {
          toast.error("Failed to load licenses");
        }
      }
    },
    [fetchLicenses]
  );

  // Initial load: always reset to current month when License Management mounts
  useInitialLicenseFilters({ filters, setFilters, setLoading, fetchLicenses });

  // Refetch when tab becomes visible to recover from stuck loading when tab was inactive
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const storeFilters = useLicenseStore.getState().filters;
        fetchLicenses({
          page: 1,
          limit: 20,
          startsAtFrom: storeFilters.startsAtFrom,
          startsAtTo: storeFilters.startsAtTo,
        }).catch(() => { });
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [fetchLicenses]);

  // Clear search when leaving this page so it doesn't persist when switching pages
  useEffect(() => {
    return () => {
      const currentFilters = useLicenseStore.getState().filters;
      setFilters({ ...currentFilters, search: undefined, searchField: undefined });
    };
  }, [setFilters]);

  // Generate a unique license key
  const generateLicenseKey = useCallback((): string => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `LIC-${timestamp}-${random}`;
  }, []);

  const onSave = useCallback(
    async (data: LicenseRecord[]) => {
      try {
        // agentsName is now a string, no transformation needed
        const transformedData = data.map(license => ({
          ...license,
          agentsName: typeof license.agentsName === 'string' ? license.agentsName : '',
        }));

        // Separate new licenses (no valid server id) from existing ones (UUID or numeric id)
        const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const isNewLicense = (license: LicenseRecord): boolean => {
          const id = license.id;
          if (id == null || id === "") return true;
          if (typeof id === "number" && Number.isInteger(id)) return false;
          const s = String(id).trim();
          if (s === "" || s === "undefined" || s === "null") return true;
          if (s.startsWith("temp-")) return true;
          if (UUID_REGEX.test(s)) return false;
          return true; // other strings (e.g. key or lost temp id) -> create
        };
        const newLicenses = transformedData.filter(isNewLicense);
        const existingLicenses = transformedData.filter((license) => !isNewLicense(license));

        let hasOperations = false;

        // Bulk create new licenses if any
        if (newLicenses.length > 0) {
          const licensesToCreate = newLicenses.map(license => {
            const licenseKey = generateLicenseKey();
            // eslint-disable-next-line @typescript-eslint/no-unused-vars -- omit id for create payload
            const { id, ...licenseData } = license;
            return {
              ...licenseData,
              key: licenseKey, // Add the license key for frontend state management (removed by API transform)
              product: 'ABC Business Suite', // Add the required product field
              seatsTotal: 1, // Add the required seats total (default to 1)
            };
          });

          await bulkCreateLicenses(licensesToCreate);
          hasOperations = true;
        }

        // Bulk update existing licenses if any
        if (existingLicenses.length > 0) {
          await bulkUpsertLicenses(existingLicenses);
          hasOperations = true;
        }

        // Only reload if we actually performed operations
        if (hasOperations) {
          await loadLicenses();
          toast.success("Licenses saved successfully");
        }
      } catch (error) {
        if (shouldShowError(error)) {
          toast.error(error instanceof Error ? error.message : "Failed to save licenses");
        }
      }
    },
    [bulkCreateLicenses, bulkUpsertLicenses, loadLicenses, generateLicenseKey],
  );

  const onAddRow = useCallback(async (): Promise<LicenseRecord> => {
    // Return a temporary license record for grid editing
    // The license will be created in the database only when saved via bulkUpsertLicenses
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return {
      id: tempId,
      dba: "",
      zip: "",
      startsAt: new Date().toISOString().split("T")[0],
      status: "active",
      plan: "",
      term: "monthly",
      lastPayment: 0,
      lastActive: new Date().toISOString().split("T")[0],
      smsPurchased: 0,
      smsSent: 0,
      smsBalance: 0,
      agents: 0,
      agentsName: '',
      agentsCost: 0,
      notes: "",
    };
  }, []);

  const onDeleteRows = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- signature required by grid
    async (rows: LicenseRecord[], _indices: number[]) => {
      try {
        const ids = rows.map((row) => row.id);
        await bulkDeleteLicenses(ids);
        toast.success("Deleted selected licenses");
      } catch (error) {
        if (shouldShowError(error)) {
          toast.error("Failed to delete licenses");
        }
      }
    },
    [bulkDeleteLicenses],
  );

  const onDateRangeChange = useCallback((values: { range: { from?: Date; to?: Date } }) => {
    const nextRange = values.range;
    const hasRange = nextRange?.from || nextRange?.to;
    const startsAtFrom = nextRange?.from?.toISOString?.().split('T')[0];
    const startsAtTo = nextRange?.to?.toISOString?.().split('T')[0];
    const newFilters = {
      ...filters,
      startsAtFrom: hasRange ? startsAtFrom : undefined,
      startsAtTo: hasRange ? startsAtTo : undefined,
    };
    setFilters(newFilters);
    // Pass date params explicitly so the request uses them even before store state has updated
    fetchLicenses({
      page: 1,
      startsAtFrom: newFilters.startsAtFrom,
      startsAtTo: newFilters.startsAtTo,
    }).catch((error) => {
      if (shouldShowError(error)) toast.error("Failed to apply date filter");
    });
  }, [filters, setFilters, fetchLicenses]);

  const handleQueryChange = useCallback(async (params: {
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    search?: string;
    searchField?: 'dba' | 'agentsName';
    status?: string | string[];
    plan?: string | string[];
    term?: string | string[];
  }) => {
    try {
      const statusParam = Array.isArray(params.status)
        ? params.status.join(',')
        : params.status;
      const planParam = Array.isArray(params.plan)
        ? params.plan.join(',')
        : params.plan;
      const termParam = Array.isArray(params.term)
        ? params.term.join(',')
        : params.term;

      await fetchLicenses({
        page: params.page,
        limit: params.limit,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
        search: params.search,
        searchField: params.searchField,
        status: statusParam as import('@/types').LicenseStatus | import('@/types').LicenseStatus[] | undefined,
        plan: planParam,
        term: termParam as import('@/types').LicenseTerm | import('@/types').LicenseTerm[] | undefined,
        startsAtFrom: filters.startsAtFrom,
        startsAtTo: filters.startsAtTo,
      });
    } catch (error) {
      if (shouldShowError(error)) {
        toast.error("Failed to fetch licenses");
      }
    }
  }, [fetchLicenses, filters.startsAtFrom, filters.startsAtTo]);

  const dataSourceKey = [filters.startsAtFrom ?? '', filters.startsAtTo ?? ''].join(',');

  if (!currentUser) {
    return (
      <DashboardTemplate>
        <div className="text-center py-8">
          <p>Please log in to access license management.</p>
        </div>
      </DashboardTemplate>
    );
  }

  if (isLoading) {
    return (
      <DashboardTemplate>
        <div className="space-y-8">
          <div className="bg-card border border-border rounded-xl shadow-sm space-y-5 px-6 pb-6">
            <LicensesDataGridSkeleton />
          </div>
        </div>
      </DashboardTemplate>
    );
  }

  return (
    <LicenseManagement
      currentUser={currentUser}
      licenses={licenses}
      isLoading={isLoading}
      onLoadLicenses={loadLicenses}
      onSaveLicenses={onSave}
      onAddLicense={onAddRow}
      onDeleteLicenses={onDeleteRows}
      dateRange={dateRange}
      onDateRangeChange={onDateRangeChange}
      onQueryChange={handleQueryChange}
      dataSourceKey={dataSourceKey}
      pageCount={licensePagination.totalPages}
      totalCount={licensePagination.total}
    />
  );
}

