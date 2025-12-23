/**
 * License Management Page - Excel-like editing with DataGrid
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";

import { useAuth } from "@/presentation/contexts/auth-context";
import { LicenseManagement } from "@/presentation/components/organisms/license-management";
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
  const { user: currentUser } = useAuth();

  const licenses = useLicenseStore(selectLicenses);
  const isLoading = useLicenseStore(selectLicenseLoading);
  const licensePagination = useLicenseStore(selectLicensePagination);
  const fetchLicenses = useLicenseStore(state => state.fetchLicenses);
  const bulkCreateLicenses = useLicenseStore(state => state.bulkCreateLicenses);
  const bulkUpsertLicenses = useLicenseStore(state => (state as any).bulkUpsertLicenses);
  const bulkDeleteLicenses = useLicenseStore(state => state.bulkDeleteLicenses);

  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date } | undefined>();

  const loadLicenses = useCallback(async (params?: { page?: number; limit?: number; search?: string; status?: string }) => {
    try {
      await fetchLicenses({
        page: params?.page || 1,
        limit: params?.limit || 20,
        search: params?.search,
        status: params?.status as any,
      });
    } catch (error) {
      if (shouldShowError(error)) {
        toast.error("Failed to load licenses");
      }
    }
  }, [fetchLicenses]);

  useEffect(() => {
    loadLicenses({ page: 1, limit: 20 });
  }, [loadLicenses]);

  // Generate a unique license key
  const generateLicenseKey = useCallback((): string => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `LIC-${timestamp}-${random}`;
  }, []);

  const onSave = useCallback(
    async (data: LicenseRecord[]) => {
      try {
        // Separate new licenses (temp IDs) from existing ones
        const newLicenses = data.filter(license => typeof license.id === 'string' && license.id.startsWith('temp-'));
        const existingLicenses = data.filter(license => !newLicenses.includes(license));

        let hasOperations = false;

        // Bulk create new licenses if any
        if (newLicenses.length > 0) {
          const licensesToCreate = newLicenses.map(license => {
            const licenseKey = generateLicenseKey();
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
      status: "pending",
      plan: "Basic",
      term: "monthly",
      lastPayment: 0,
      lastActive: new Date().toISOString().split("T")[0],
      smsPurchased: 0,
      smsSent: 0,
      smsBalance: 0,
      agents: 0,
      agentsName: [],
      agentsCost: 0,
      notes: "",
    };
  }, []);

  const onDeleteRows = useCallback(
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
    setDateRange(hasRange ? nextRange : undefined);
  }, []);

  if (!currentUser) {
    return (
      <DashboardTemplate>
        <div className="text-center py-8">
          <p>Please log in to access license management.</p>
        </div>
      </DashboardTemplate>
    );
  }

  const handleQueryChange = useCallback(async (params: {
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    search?: string;
    status?: string | string[];
  }) => {
    try {
      // Convert status array to comma-separated string for API
      const statusParam = Array.isArray(params.status)
        ? params.status.join(',')
        : params.status;

      await fetchLicenses({
        page: params.page,
        limit: params.limit,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
        search: params.search,
        status: statusParam as any,
      });
    } catch (error) {
      if (shouldShowError(error)) {
        toast.error("Failed to fetch licenses");
      }
    }
  }, [fetchLicenses]);

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
      pageCount={licensePagination.totalPages}
      totalCount={licensePagination.total}
    />
  );
}

