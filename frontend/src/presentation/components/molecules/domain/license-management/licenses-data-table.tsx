/**
 * LicensesDataTable Component
 */

"use client";

import * as React from "react";
import { FileText, Pencil } from "lucide-react";

import {
  DataTable,
  DataTableToolbar,
  DataTableSkeleton,
} from "@/presentation/components/molecules/data-table";
import { useDataTable } from "@/presentation/hooks";
import { Card, CardContent, CardHeader } from "@/presentation/components/atoms/primitives/card";
import { Button } from "@/presentation/components/atoms/primitives/button";
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
  showHeader?: boolean;
  onEdit?: () => void;
}

export function LicensesDataTable({
  data,
  pageCount,
  title = 'License Management',
  description = 'Manage license records and subscriptions',
  isLoading = false,
  className,
  showHeader = false,
  onEdit,
}: LicensesDataTableProps) {
  const columns = React.useMemo(() => getLicenseTableColumns(), []);

  const { table } = useDataTable({
    data,
    columns,
    pageCount,
    initialState: {
      pagination: { pageSize: 5, pageIndex: 0 },
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

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
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
        <CardContent className="pt-6">
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
      {showHeader && (
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <Typography variant="title-s" className="font-semibold tracking-tight">
                {title}
              </Typography>
              <Typography variant="body-s" className="text-muted-foreground mt-1">
                {description}
              </Typography>
            </div>
          </div>
        </CardHeader>
      )}
      <CardContent>
        <DataTable table={table}>
          <DataTableToolbar table={table} >
            {onEdit && (
              <Button
                onClick={onEdit}
                size="sm"
                className="gap-1.5"
                title="Edit License"
              >
                <Pencil className="h-2.5 w-2.5 text-foreground" />
                <span className="hidden sm:inline">Edit License</span>
              </Button>
            )}
          </DataTableToolbar>
        </DataTable>
      </CardContent>
    </Card>
  );
}

