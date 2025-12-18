/**
 * License Management Page - Excel-like editing with DataGrid
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";

import { useAuth } from "@/presentation/contexts/auth-context";
import { LicenseManagement } from "@/presentation/components/organisms/license-management";
import { DashboardTemplate } from "@/presentation/components/templates";
import { createEmptyLicense } from "@/shared/mock/license-faker-data";
import { useLicenseStore, selectLicenses, selectLicenseLoading, selectLicensePagination } from "@/infrastructure/stores/license";
import type { LicenseRecord } from "@/shared/types";

export function LicenseManagementPage() {
  const { user: currentUser } = useAuth();

  const licenses = useLicenseStore(selectLicenses);
  const isLoading = useLicenseStore(selectLicenseLoading);
  const licensePagination = useLicenseStore(selectLicensePagination);
  const fetchLicenses = useLicenseStore(state => state.fetchLicenses);
  const createLicense = useLicenseStore(state => state.createLicense);
  const updateLicense = useLicenseStore(state => state.updateLicense);
  const deleteLicense = useLicenseStore(state => state.deleteLicense);
  const bulkUpdateLicenses = useLicenseStore(state => state.bulkUpdateLicenses);
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
      toast.error("Failed to load licenses");
    }
  }, [fetchLicenses]);

  useEffect(() => {
    loadLicenses({ page: 1, limit: 20 });
  }, [loadLicenses]);

  const onSave = useCallback(
    async (data: LicenseRecord[]) => {
      try {
        // Separate new licenses (temp IDs) from existing ones
        const newLicenses = data.filter(license => typeof license.id === 'string' && license.id.startsWith('temp-'));
        const existingLicenses = data.filter(license => !newLicenses.includes(license));

        // Create new licenses first
        const createdLicenses: LicenseRecord[] = [];
        for (const license of newLicenses) {
          try {
            // Remove temp ID and create the license
            const { id, ...licenseData } = license;
            const created = await createLicense({
              ...licenseData,
              startDay: licenseData.startsAt, // Map startsAt to startDay for API
            });
            createdLicenses.push(created);
          } catch (error) {
            console.error('Failed to create license:', error);
            throw new Error(`Failed to create license for DBA: ${license.dba}`);
          }
        }

        // Update existing licenses
        if (existingLicenses.length > 0) {
          const updates = existingLicenses.map(license => ({
            ...license,
          }));
          await bulkUpdateLicenses(updates);
        }

        toast.success(`${createdLicenses.length + existingLicenses.length} licenses saved`);
        // Reload licenses to get updated data
        await loadLicenses();
      } catch (error) {
        console.error('Save error:', error);
        toast.error(error instanceof Error ? error.message : "Failed to save licenses");
      }
    },
    [bulkUpdateLicenses, createLicense, loadLicenses],
  );

  const onAddRow = useCallback(async (): Promise<LicenseRecord> => {
    // Return a temporary license record for grid editing
    // The license will be created in the database only when saved via bulkUpdateLicenses
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
        toast.error("Failed to delete licenses");
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
      toast.error("Failed to fetch licenses");
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

