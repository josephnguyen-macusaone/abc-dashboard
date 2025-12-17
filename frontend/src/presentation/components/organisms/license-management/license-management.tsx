'use client';

import { useState, useCallback, useMemo } from 'react';
import { Typography } from '@/presentation/components/atoms';
import { LicensesDataGrid } from '@/presentation/components/molecules/domain/license-management';
import { DateRangeFilterCard } from '@/presentation/components/molecules/domain/dashboard/date-range-filter-card';
import { cn } from '@/shared/utils';
import type { LicenseRecord } from '@/shared/types';
import type { User } from '@/domain/entities/user-entity';

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
    status?: string | string[];
  }) => void;
  /** Additional CSS classes */
  className?: string;
}

export function LicenseManagement({
  currentUser,
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

  // Add row handler
  const handleAddRow = useCallback(async (): Promise<LicenseRecord> => {
    const fallback: LicenseRecord = {
      id: licenses.length + 1,
      dba: '',
      zip: '',
      startsAt: new Date().toISOString().split('T')[0],
      status: 'pending',
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
        return await result;
      } catch {
        return fallback;
      }
    }
    return result;
  }, [licenses.length, onAddLicense]);

  // Delete rows handler
  const handleDeleteRows = useCallback(
    async (rows: LicenseRecord[], indices: number[]) => {
      await onDeleteLicenses?.(rows, indices);
    },
    [onDeleteLicenses],
  );

  // Filter licenses by date range
  const filteredLicenses = useMemo(() => {
    if (!dateRange?.from && !dateRange?.to) {
      return licenses;
    }

    return licenses.filter((license) => {
      const startDate = new Date(license.startsAt);

      if (dateRange.from && startDate < dateRange.from) {
        return false;
      }

      if (dateRange.to && startDate > dateRange.to) {
        return false;
      }

      return true;
    });
  }, [licenses, dateRange]);

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

      {/* Licenses Data Grid with full CRUD functionality */}
      <LicensesDataGrid
        data={filteredLicenses}
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
