'use client';

import { Typography } from '@/presentation/components/atoms';
import { LicensesDataTable } from '@/presentation/components/molecules/domain/license-management';
import { cn } from '@/shared/utils';
import type { LicenseRecord } from '@/shared/types';

export interface LicenseTableSectionProps {
  /**
   * Optional title for the section
   */
  title?: string;
  /**
   * Optional description
   */
  description?: string;
  /**
   * Maximum height for internal table scrolling (e.g., '400px', '60vh')
   */
  maxTableHeight?: string;
  /**
   * Additional class names
   */
  className?: string;
  /**
   * License data to render
   */
  licenses: LicenseRecord[];
  /**
   * Loading state
   */
  isLoading?: boolean;
  /**
   * Optional server page count for pagination
   */
  pageCount?: number;
  /**
   * Total number of rows for pagination display
   */
  totalRows?: number;
  /**
   * Callback when table query changes (pagination/sort/filter)
   */
  onQueryChange?: (params: {
    page: number;
    limit: number;
    sortBy?: keyof LicenseRecord;
    sortOrder?: "asc" | "desc";
    status?: string | string[];
    search?: string;
  }) => void;
}

export function LicenseTableSection({
  className,
  title = 'License Management',
  description = 'Manage license records and subscriptions',
  licenses,
  isLoading = false,
  pageCount,
  totalRows,
  onQueryChange,
}: LicenseTableSectionProps) {
  return (
    <div className={cn('bg-card border border-border rounded-xl shadow-sm space-y-3 px-6 pb-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between pt-4">
        <div className="">
          <Typography variant="title-l" className="text-foreground">
            {title}
          </Typography>
          <Typography variant="body-s" color="muted" className="text-muted-foreground mt-0.5">
            {description}
          </Typography>
        </div>
      </div>

      {/* Licenses Data Grid */}
      <LicensesDataTable
        data={licenses}
        isLoading={isLoading}
        pageCount={pageCount}
        totalRows={totalRows}
        onQueryChange={onQueryChange}
      />
    </div>
  );
}
