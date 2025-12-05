'use client';

import { useState, useCallback } from 'react';
import { Typography } from '@/presentation/components/atoms';
import { LicenseMetricsSection } from '@/presentation/components/organisms/dashboard/sections/license-metrics-section';
import { LicensesDataGrid } from '@/presentation/components/molecules/domain/license-management';
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
  onLoadLicenses?: () => Promise<void>;
  /** Callback for saving license changes */
  onSaveLicenses?: (licenses: LicenseRecord[]) => Promise<void>;
  /** Callback for adding a new license row */
  onAddLicense?: () => LicenseRecord;
  /** Callback for deleting license rows */
  onDeleteLicenses?: (licenses: LicenseRecord[], indices: number[]) => Promise<void>;
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
  const handleAddRow = useCallback((): LicenseRecord => {
    return onAddLicense?.() || {
      id: licenses.length + 1,
      dbA: '',
      zip: '',
      startDay: new Date().toISOString().split('T')[0],
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
  }, [licenses.length, onAddLicense]);

  // Delete rows handler
  const handleDeleteRows = useCallback(
    async (rows: LicenseRecord[], indices: number[]) => {
      await onDeleteLicenses?.(rows, indices);
    },
    [onDeleteLicenses],
  );

  return (
    <div className={cn('bg-card border border-border rounded-xl shadow-sm space-y-6 px-6 pb-8', className)}>
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
      </div>

      {/* Statistics */}
      <LicenseMetricsSection />

      {/* Licenses Data Grid */}
      <LicensesDataGrid
        data={licenses}
        isLoading={isLoading}
        height={650}
        onSave={handleSave}
        onAddRow={handleAddRow}
        onDeleteRows={handleDeleteRows}
        title="All Licenses"
        description="Click on any cell to edit. Press Enter or double-click to start editing. Use keyboard shortcuts like Excel: Enter to edit, Tab to navigate, Ctrl+C/V to copy/paste."
      />
    </div>
  );
}
