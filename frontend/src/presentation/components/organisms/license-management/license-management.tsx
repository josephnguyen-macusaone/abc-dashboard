'use client';

import { useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Typography } from '@/presentation/components/atoms';
import { DateRangeFilterCard } from '@/presentation/components/molecules/domain/dashboard/date-range-filter-card';
import { LicensesDataGridSkeleton } from '@/presentation/components/organisms';
import { cn } from '@/shared/helpers';
import type { LicenseRecord } from '@/types';
import type { User } from '@/domain/entities/user-entity';

// Dynamically import heavy data grid component for better code splitting
const LicensesDataGrid = dynamic(
  () => import('@/presentation/components/molecules/domain/license-management').then(mod => ({ default: mod.LicensesDataGrid })),
  {
    loading: () => <LicensesDataGridSkeleton />,
    ssr: false, // Disable SSR for complex data grid component
  }
);

/**
 * LicenseManagement Component
 *
 * Orchestrates the license management UI including:
 * - License metrics and statistics
 * - License data grid with inline editing
 *
 * Note: CRUD operations are handled directly by the data grid
 * component with inline editing capabilities.
 */
interface LicenseManagementProps {
  /** Current authenticated user */
  currentUser: User;
  /** List of licenses to display */
  licenses: LicenseRecord[];
  /** Loading state for the license list */
  isLoading?: boolean;
  /** Callback to reload licenses (called after operations) */
  onLoadLicenses?: (params?: { page?: number; limit?: number; search?: string; status?: string }) => Promise<void>;
  /** Callback for saving license changes */
  onSaveLicenses?: (licenses: LicenseRecord[]) => Promise<void>;
  /** Callback for adding a new license row */
  onAddLicense?: () => LicenseRecord | Promise<LicenseRecord>;
  /** Callback for deleting license rows */
  onDeleteLicenses?: (licenses: LicenseRecord[], indices: number[]) => Promise<void>;
  /** Current date range filter */
  dateRange?: { from?: Date; to?: Date };
  /** Callback when date range changes */
  onDateRangeChange?: (values: { range: { from?: Date; to?: Date } }) => void;
  /** Pagination configuration */
  pageCount?: number;
  totalCount?: number;
  /** Callback when table query changes (pagination/sort/filter/search) */
  onQueryChange?: (params: {
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    search?: string;
    /** When set, search is limited to this field only (DBA or Agents Name) */
    searchField?: 'dba' | 'agentsName';
    status?: string | string[];
    plan?: string | string[];
    term?: string | string[];
  }) => void;
  /** Optional key to force grid remount when filters change (e.g. date range) so TanStack table shows fresh data */
  dataSourceKey?: string;
  /** Additional CSS classes */
  className?: string;
}

export function LicenseManagement({
  licenses,
  isLoading = false,
  onLoadLicenses,
  onSaveLicenses,
  onAddLicense,
  onDeleteLicenses,
  dateRange,
  onDateRangeChange,
  pageCount,
  totalCount,
  onQueryChange,
  dataSourceKey,
  className
}: LicenseManagementProps) {
  // Reload licenses handler (called after operations)
  const handleLoadLicenses = useCallback(async () => {
    await onLoadLicenses?.();
  }, [onLoadLicenses]);

  // Save handler
  const handleSave = useCallback(async (data: LicenseRecord[]) => {
    await onSaveLicenses?.(data);
  }, [onSaveLicenses]);

  // Add row handler: must return a row with a temp id (e.g. temp-xxx) so the save flow treats it as "create", not "update"
  const handleAddRow = useCallback(async (): Promise<LicenseRecord> => {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    const fallback: LicenseRecord = {
      id: tempId,
      dba: '',
      zip: '',
      startsAt: new Date().toISOString().split('T')[0],
      status: 'active',
      plan: 'Basic',
      term: 'monthly',
      lastPayment: 0,
      lastActive: new Date().toISOString().split('T')[0],
      smsPurchased: 0,
      smsSent: 0,
      smsBalance: 0,
      agents: 0,
      agentsName: [],
      agentsCost: 0,
      notes: '',
    };

    if (!onAddLicense) {
      return fallback;
    }

    const result = onAddLicense();
    if (result instanceof Promise) {
      try {
        const row = await result;
        // Ensure id is never numeric so the row is always classified as "new" on save
        if (row && typeof (row as { id?: unknown }).id === 'number') {
          return { ...row, id: tempId };
        }
        return row;
      } catch {
        return fallback;
      }
    }
    const row = result as LicenseRecord;
    if (row && typeof (row as { id?: unknown }).id === 'number') {
      return { ...row, id: tempId };
    }
    return row;
  }, [onAddLicense]);

  // Delete rows handler
  const handleDeleteRows = useCallback(
    async (rows: LicenseRecord[], indices: number[]) => {
      await onDeleteLicenses?.(rows, indices);
    },
    [onDeleteLicenses],
  );

  // Licenses are already filtered by start date on the server when dateRange is set (GET /licenses?startDate=...&endDate=...)
  return (
    <div className={cn('bg-card border border-border rounded-xl shadow-sm space-y-5 px-6 pb-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between pt-4">
        <div className="">
          <Typography variant="title-l" className="text-foreground">
            License Management
          </Typography>
          <Typography variant="body-s" color="muted" className="text-muted-foreground mt-0.5">
            Manage license records and subscriptions
          </Typography>
        </div>
        {/* Date Range Filter */}
        {onDateRangeChange && (
          <DateRangeFilterCard
            initialDateFrom={dateRange?.from}
            initialDateTo={dateRange?.to}
            onUpdate={onDateRangeChange}
            align="end"
          />
        )}
      </div>

      {/* Licenses Data Grid with full CRUD functionality. key forces remount when date filter changes so table shows server-filtered data. */}
      <LicensesDataGrid
        key={dataSourceKey}
        data={licenses}
        isLoading={isLoading}
        onSave={handleSave}
        onAddRow={handleAddRow}
        onDeleteRows={handleDeleteRows}
        pageCount={pageCount}
        totalCount={totalCount}
        onQueryChange={onQueryChange}
        onLoadLicenses={handleLoadLicenses}
      />
    </div>
  );
}
