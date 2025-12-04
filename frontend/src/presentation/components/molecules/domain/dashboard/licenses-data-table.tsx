/**
 * LicensesDataTable Component
 * Uses tablecn pattern with TanStack Table
 */

"use client";

import * as React from "react";
import { FileText } from "lucide-react";

import {
  DataTable,
  DataTableToolbar,
  DataTableSkeleton,
} from "@/presentation/components/molecules/data-table";
import { useDataTable } from "@/presentation/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/presentation/components/atoms/primitives/card";
import { Typography } from "@/presentation/components/atoms";
import { getLicenseTableColumns } from "./license-table-columns";
import type { LicenseRecord } from "@/shared/types";

interface LicensesDataTableProps {
  data: LicenseRecord[];
  pageCount: number;
  title?: string;
  description?: string;
  isLoading?: boolean;
  maxHeight?: string;
  className?: string;
}

export function LicensesDataTable({
  data,
  pageCount,
  title = "License Management",
  description = "Manage license records and subscriptions",
  isLoading = false,
  maxHeight = "500px",
  className,
}: LicensesDataTableProps) {
  const columns = React.useMemo(() => getLicenseTableColumns(), []);

  const { table } = useDataTable({
    data,
    columns,
    pageCount,
    // Client-side pagination, sorting, filtering
    manualPagination: false,
    manualSorting: false,
    manualFiltering: false,
    initialState: {
      pagination: { pageSize: 10, pageIndex: 0 },
      sorting: [{ id: "id", desc: false }],
      columnVisibility: {
        select: false, // Hide select checkbox column
        // Hide some columns by default to keep table manageable
        smsPurchased: false,
        smsSent: false,
        smsBalance: false,
        agentsName: false,
        agentsCost: false,
        notes: false,
      },
    },
  });

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="title-s">{title}</CardTitle>
              <Typography variant="body-s" className="text-muted-foreground mt-1">
                {description}
              </Typography>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTableSkeleton
            columnCount={12}
            rowCount={10}
            filterCount={4}
            withPagination
            withViewOptions
          />
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="title-s">{title}</CardTitle>
              <Typography variant="body-s" className="text-muted-foreground mt-1">
                {description}
              </Typography>
            </div>
          </div>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="title-s">{title}</CardTitle>
            <Typography variant="body-s" className="text-muted-foreground mt-1">
              {description}
            </Typography>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <DataTable table={table}>
          <DataTableToolbar table={table} />
        </DataTable>
      </CardContent>
    </Card>
  );
}

