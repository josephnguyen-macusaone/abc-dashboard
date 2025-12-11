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
}

export function LicensesDataTable({
  data,
  pageCount: initialPageCount = -1,
  isLoading = false,
}: LicensesDataTableProps) {
  const columns = React.useMemo(() => getLicenseTableColumns(), []);

  const [currentPageSize, setCurrentPageSize] = React.useState(20);

  const pageCount = React.useMemo(() =>
    Math.ceil(data.length / currentPageSize),
    [data.length, currentPageSize]
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
      <DataTableToolbar table={table} />
    </DataTable>
  );
}

