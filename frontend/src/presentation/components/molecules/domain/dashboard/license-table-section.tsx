'use client';

import { useMemo, useState, useCallback } from 'react';
import { Typography } from '@/presentation/components/atoms';
import { LicensesDataTable } from '@/presentation/components/molecules/domain/license-management';
import { SearchBar } from '@/presentation/components/molecules';
import { useDebouncedCallback } from '@/presentation/hooks/use-debounced-callback';
import { cn } from '@/shared/utils';
import type { LicenseRecord } from '@/shared/types';
import type { DateRange } from '@/presentation/components/atoms/forms/date-range-picker';
import type { LicenseDateRange } from '@/application/services/license-dashboard-metrics';

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
   * Shared date range filter (optional)
   */
  dateRange?: LicenseDateRange;
  /**
   * Callback when date range changes
   */
  onDateRangeChange?: (values: { range: DateRange; rangeCompare?: DateRange }) => void;
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
    status?: string;
    dba?: string;
    search?: string;
  }) => void;
}

export function LicenseTableSection({
  className,
  title = 'License Management',
  description = 'Manage license records and subscriptions',
  licenses,
  dateRange,
  isLoading = false,
  pageCount,
  totalRows,
  onQueryChange,
}: LicenseTableSectionProps) {
  // Search state for DBA search
  const [searchInput, setSearchInput] = useState("");
  const [searchValue, setSearchValue] = useState("");

  // Debounce the search value update (500ms delay)
  const debouncedSetSearch = useDebouncedCallback((value: string) => {
    setSearchValue(value);
  }, 500);

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    debouncedSetSearch(value);
  }, [debouncedSetSearch]);

  // Note: Date filtering is now handled server-side in the API call
  const filteredLicenses = licenses;

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
        data={filteredLicenses}
        isLoading={isLoading}
        pageCount={pageCount}
        totalRows={totalRows}
        hasActiveFilters={searchValue.trim() !== ""}
        searchBar={
          <SearchBar
            placeholder="Search by DBA..."
            value={searchInput}
            onValueChange={handleSearchChange}
            allowClear
            className="w-64"
            inputClassName="h-8"
          />
        }
        onReset={() => {
          // Clear search state for DBA search
          setSearchInput("");
          debouncedSetSearch("");
          setSearchValue("");
        }}
        onQueryChange={(params) => {
          onQueryChange?.({
            ...params,
            search: searchValue, // Pass the debounced search value
          });
        }}
      />
    </div>
  );
}
