/**
 * License Management Page - Excel-like editing with DataGrid
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";

import { useAuth } from "@/presentation/contexts/auth-context";
import { LicenseManagement } from "@/presentation/components/organisms/license-management";
import { DashboardTemplate } from "@/presentation/components/templates";
import { fakerLicenses, createEmptyLicense } from "@/shared/mock/license-faker-data";
import { licenseService } from "@/application/services/license-management-service";
import type { LicenseRecord } from "@/shared/types";

export function LicenseManagementPage() {
  const { user: currentUser } = useAuth();

  const [licenses, setLicenses] = useState<LicenseRecord[]>(fakerLicenses);
  const [isLoading, setIsLoading] = useState(false);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date } | undefined>();

  const loadLicenses = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await licenseService.list({ page: 1, limit: 100 });
      if (response?.data) {
        setLicenses(response.data);
      }
    } catch (error) {
      toast.error("Using mock license data (API unavailable)");
      setLicenses(fakerLicenses);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLicenses();
  }, [loadLicenses]);

  const onSave = useCallback(
    async (data: LicenseRecord[]) => {
      setIsLoading(true);
      try {
        await licenseService.bulkUpdate(data);
        setLicenses(data);
        toast.success("Licenses saved");
      } catch (error) {
        toast.error("Failed to save licenses");
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const onAddRow = useCallback(async (): Promise<LicenseRecord> => {
    try {
      const { data: payload } = await licenseService.addRow({
        dba: "",
        zip: "",
        startDay: new Date().toISOString().split("T")[0],
        status: "pending",
        plan: "Basic",
        term: "monthly",
        lastPayment: 0,
        smsPurchased: 0,
        smsSent: 0,
        agents: 0,
        agentsName: [],
        agentsCost: 0,
        notes: "",
      });
      if (payload?.license) {
        return payload.license;
      }
    } catch (error) {
      toast.error("Failed to add license row");
    }
    return createEmptyLicense(licenses.map((l) => l.id));
  }, [licenses]);

  const onDeleteRows = useCallback(
    async (rows: LicenseRecord[], _indices: number[]) => {
      try {
        await licenseService.bulkDelete(rows.map((row) => row.id));
        toast.success("Deleted selected licenses");
      } catch (error) {
        toast.error("Failed to delete licenses");
      }
    },
    [],
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
    />
  );
}

