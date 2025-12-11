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
  isLoading?: boolean;
  onQueryChange?: (params: {
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    status?: string;
    dba?: string;
  }) => void;
}

export function LicensesDataTable({
  data,
  pageCount: serverPageCount = -1,
  isLoading = false,
  onQueryChange,
}: LicensesDataTableProps) {
  const columns = React.useMemo(() => getLicenseTableColumns(), []);

  const [currentPageSize, setCurrentPageSize] = React.useState(20);

  const pageCount = React.useMemo(
    () => (serverPageCount >= 0 ? serverPageCount : Math.ceil(data.length / currentPageSize)),
    [serverPageCount, data.length, currentPageSize]
  );

  const { table } = useDataTable({
    data,
    columns,
    pageCount,
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

  React.useEffect(() => {
    if (!onQueryChange) return;
    const { pagination, sorting, columnFilters } = table.getState();
    const activeSort = sorting?.[0];
    const filterLookup = columnFilters?.reduce<Record<string, any>>((acc, filter) => {
      acc[filter.id] = filter.value;
      return acc;
    }, {});

    onQueryChange({
      page: pagination.pageIndex + 1,
      limit: pagination.pageSize,
      sortBy: activeSort?.id,
      sortOrder: activeSort?.desc ? "desc" : "asc",
      status: Array.isArray(filterLookup?.status) ? filterLookup.status[0] : filterLookup?.status,
      dba: Array.isArray(filterLookup?.dba) ? filterLookup.dba[0] : filterLookup?.dba,
    });
  }, [table, onQueryChange]);

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
      <DataTableToolbar table={table} />
    </DataTable>
  );
}

