/**
 * LicensesDataTable Component
 */

"use client";

import * as React from "react";
import { FileText } from "lucide-react";

import {
  DataTable,
  DataTableToolbar,
  DataTableSkeleton,
} from "@/presentation/components/molecules/data/data-table";
import { useDataTable } from "@/presentation/hooks";
import { Typography } from "@/presentation/components/atoms";
import { getLicenseTableColumns } from "./license-table-columns";
import type { LicenseRecord } from "@/shared/types";

interface LicensesDataTableProps {
  data: LicenseRecord[];
  pageCount?: number;
  totalRows?: number;
  isLoading?: boolean;
  searchBar?: React.ReactNode;
  onReset?: () => void;
  hasActiveFilters?: boolean;
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

export function LicensesDataTable({
  data,
  pageCount: serverPageCount = -1,
  totalRows,
  isLoading = false,
  searchBar,
  onReset,
  hasActiveFilters,
  onQueryChange,
}: LicensesDataTableProps) {
  const columns = React.useMemo(() => getLicenseTableColumns(), []);

  const [currentPageSize, setCurrentPageSize] = React.useState(20);
  
  // Track previous query to avoid infinite loops
  const previousLicenseQueryRef = React.useRef<string>("");

  const pageCount = React.useMemo(
    () => (serverPageCount >= 0 ? serverPageCount : Math.ceil(data.length / currentPageSize)),
    [serverPageCount, data.length, currentPageSize]
  );

  const { table } = useDataTable({
    data,
    columns,
    pageCount,
    totalRows,
    initialState: {
      pagination: { pageSize: 20, pageIndex: 0 },
      sorting: [{ id: "id", desc: false }],
      columnVisibility: {
        select: false,
        smsPurchased: true,
        smsSent: true,
        smsBalance: true,
        agentsName: true,
        agentsCost: true,
        notes: true,
      },
    },
    manualPagination: !!onQueryChange,
    manualSorting: !!onQueryChange,
    manualFiltering: !!onQueryChange,
  });

  // Use separate refs to track state changes without depending on table object
  const pageIndexRef = React.useRef(table.getState().pagination.pageIndex);
  const pageSizeRef = React.useRef(table.getState().pagination.pageSize);
  const sortIdRef = React.useRef(table.getState().sorting?.[0]?.id);
  const sortDescRef = React.useRef(table.getState().sorting?.[0]?.desc);
  const filterRef = React.useRef<string>("");

  React.useEffect(() => {
    if (!onQueryChange) return;

    const state = table.getState();
    const { pagination, sorting, columnFilters } = state;
    const activeSort = sorting?.[0];
    const filterLookup = columnFilters?.reduce<Record<string, any>>((acc, filter) => {
      acc[filter.id] = filter.value;
      return acc;
    }, {});

    // Check if any relevant state changed
    const pageIndexChanged = pageIndexRef.current !== pagination.pageIndex;
    const pageSizeChanged = pageSizeRef.current !== pagination.pageSize;
    const sortIdChanged = sortIdRef.current !== activeSort?.id;
    const sortDescChanged = sortDescRef.current !== activeSort?.desc;
    const currentFilters = JSON.stringify(filterLookup);
    const filtersChanged = filterRef.current !== currentFilters;

    if (pageIndexChanged || pageSizeChanged || sortIdChanged || sortDescChanged || filtersChanged) {
      // Update refs
      pageIndexRef.current = pagination.pageIndex;
      pageSizeRef.current = pagination.pageSize;
      sortIdRef.current = activeSort?.id;
      sortDescRef.current = activeSort?.desc;
      filterRef.current = currentFilters;

      const queryParams = {
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        sortBy: activeSort?.id as keyof LicenseRecord,
        sortOrder: (activeSort?.desc ? "desc" : "asc") as "asc" | "desc",
        status: Array.isArray(filterLookup?.status) ? filterLookup.status[0] : filterLookup?.status,
        dba: Array.isArray(filterLookup?.dba) ? filterLookup.dba[0] : filterLookup?.dba,
      };

      onQueryChange(queryParams);
    }
  });

  // Update page size when table page size changes
  React.useEffect(() => {
    const tablePageSize = table.getState().pagination.pageSize;
    if (tablePageSize !== currentPageSize) {
      setCurrentPageSize(tablePageSize);
    }
  }, [table.getState().pagination.pageSize, currentPageSize]);

  // Loading state
  if (isLoading) {
    return (
      <DataTableSkeleton
        columnCount={12}
        rowCount={10}
        filterCount={4}
        withPagination
        withViewOptions
      />
    );
  }

  // Empty state
  if (data.length === 0) {
    return (
      <div className="p-12 text-center border rounded-md">
        <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="h-8 w-8 text-muted-foreground" />
        </div>
        <Typography variant="title-s" className="text-foreground mb-2">
          No licenses found
        </Typography>
        <Typography variant="body-s" color="muted" className="text-muted-foreground">
          No license records are available at this time.
        </Typography>
      </div>
    );
  }

  return (
    <DataTable table={table}>
      <DataTableToolbar table={table} searchBar={searchBar} onReset={onReset} hasActiveFilters={hasActiveFilters} />
    </DataTable>
  );
}

