/**
 * License Management Page - Excel-like editing with DataGrid
 */

"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/presentation/contexts/auth-context";
import { LicenseManagement } from "@/presentation/components/organisms/license-management";
import { DashboardTemplate } from "@/presentation/components/templates";
import { fakerLicenses, createEmptyLicense } from "@/shared/mock/license-faker-data";
import type { LicenseRecord } from "@/shared/types";

export function LicenseManagementPage() {
  const { user: currentUser } = useAuth();

  const [licenses, setLicenses] = useState<LicenseRecord[]>(fakerLicenses);
  const [isLoading, setIsLoading] = useState(false);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date } | undefined>();

  // Data is loaded immediately from faker

  const onSave = useCallback(async (data: LicenseRecord[]) => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setLicenses(data);
    console.log("Saved licenses:", { data });
  }, []);

  const onAddRow = useCallback((): LicenseRecord => {
    return createEmptyLicense(licenses.map((l) => l.id));
  }, [licenses]);

  const onDeleteRows = useCallback(
    async (rows: LicenseRecord[], indices: number[]) => {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      console.log("Deleted rows:", { rows, indices });
    },
    [],
  );

  const onDateRangeChange = useCallback((values: { range: { from?: Date; to?: Date } }) => {
    setDateRange(values.range);
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
      onSaveLicenses={onSave}
      onAddLicense={onAddRow}
      onDeleteLicenses={onDeleteRows}
      dateRange={dateRange}
      onDateRangeChange={onDateRangeChange}
    />
  );
}

