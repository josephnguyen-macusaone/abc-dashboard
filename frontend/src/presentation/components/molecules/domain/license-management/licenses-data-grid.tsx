/**
 * LicensesDataGrid Component - Excel-like editing for license management
 */

"use client";

import * as React from "react";
import { FileText, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import {
  DataGrid,
  DataGridFilterMenu,
  DataGridSearch,
  DataGridSortMenu,
  DataGridRowHeightMenu,
  DataGridViewMenu,
} from "@/presentation/components/molecules/data-grid";
import { useDataGrid } from "@/presentation/hooks/use-data-grid";
import { Button } from "@/presentation/components/atoms/primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/presentation/components/atoms/primitives/card";
import { Typography } from "@/presentation/components/atoms";
import { Skeleton } from "@/presentation/components/atoms/primitives/skeleton";
import { getLicenseGridColumns } from "./license-grid-columns";
import type { LicenseRecord } from "@/shared/types";

interface LicensesDataGridProps {
  data: LicenseRecord[];
  title?: string;
  description?: string;
  isLoading?: boolean;
  height?: number;
  className?: string;
  onSave?: (data: LicenseRecord[]) => Promise<void>;
  onAddRow?: () => LicenseRecord;
  onDeleteRows?: (rows: LicenseRecord[], indices: number[]) => Promise<void>;
}

export function LicensesDataGrid({
  data: initialData,
  title = "License Management",
  description = "Edit license records directly in the grid like Excel",
  isLoading = false,
  height = 600,
  className,
  onSave,
  onAddRow,
  onDeleteRows,
}: LicensesDataGridProps) {
  const [data, setData] = React.useState<LicenseRecord[]>(initialData);
  const [hasChanges, setHasChanges] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  // Sync with initialData when it changes
  React.useEffect(() => {
    setData(initialData);
    setHasChanges(false);
  }, [initialData]);

  const columns = React.useMemo(() => getLicenseGridColumns(), []);

  const handleDataChange = React.useCallback((newData: LicenseRecord[]) => {
    setData(newData);
    setHasChanges(true);
  }, []);

  const handleRowAdd = React.useCallback(() => {
    if (onAddRow) {
      const newRow = onAddRow();
      setData((prev) => [...prev, newRow]);
      setHasChanges(true);
      return { rowIndex: data.length, columnId: "dbA" };
    }
    // Default new row
    const newRow: LicenseRecord = {
      id: data.length + 1,
      dbA: "",
      zip: "",
      startDay: new Date().toISOString().split("T")[0],
      status: "pending",
      plan: "Basic",
      term: "monthly",
      lastPayment: 0,
      lastActive: new Date().toISOString().split("T")[0],
      smsPurchased: 0,
      smsSent: 0,
      smsBalance: 0,
      agents: 0,
      agentsName: [],
      agentsCost: 0,
      notes: "",
    };
    setData((prev) => [...prev, newRow]);
    setHasChanges(true);
    return { rowIndex: data.length, columnId: "dbA" };
  }, [data.length, onAddRow]);

  const handleRowsDelete = React.useCallback(
    async (rows: LicenseRecord[], indices: number[]) => {
      if (onDeleteRows) {
        await onDeleteRows(rows, indices);
      }
      setData((prev) => prev.filter((_, idx) => !indices.includes(idx)));
      setHasChanges(true);
    },
    [onDeleteRows],
  );

  const handleSave = React.useCallback(async () => {
    if (!onSave) return;

    setIsSaving(true);
    try {
      await onSave(data);
      setHasChanges(false);
      toast.success("Changes saved successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save changes",
      );
    } finally {
      setIsSaving(false);
    }
  }, [data, onSave]);

  const handleReset = React.useCallback(() => {
    setData(initialData);
    setHasChanges(false);
    toast.info("Changes discarded");
  }, [initialData]);

  const gridState = useDataGrid({
    data,
    columns,
    onDataChange: handleDataChange,
    onRowAdd: handleRowAdd,
    onRowsDelete: handleRowsDelete,
    rowHeight: "short",
    enableSearch: true,
    enablePaste: true,
    autoFocus: true,
  });


  // Loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
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
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (initialData.length === 0 && !hasChanges) {
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
          <div className="p-12 text-center border rounded-md">
            <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <Typography variant="title-s" className="text-foreground mb-2">
              No licenses found
            </Typography>
            <Typography variant="body-s" className="text-muted-foreground mb-4">
              Get started by adding your first license record.
            </Typography>
            <Button onClick={handleRowAdd}>Add License</Button>
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
      <CardContent className="space-y-4">
        {/* Toolbar with Search, Filter, Sort, Row Height, View, and Action buttons */}
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <DataGridSearch table={gridState.table} placeholder="Search DBA..." />
            <DataGridFilterMenu table={gridState.table} />
            <DataGridSortMenu table={gridState.table} />
            <DataGridRowHeightMenu table={gridState.table} />
            <DataGridViewMenu table={gridState.table} />
          </div>
          {/* Action buttons */}
          {hasChanges && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={isSaving}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Discard
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!onSave || isSaving}
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </div>
        <DataGrid {...gridState} height={height} stretchColumns />
      </CardContent>
    </Card>
  );
}

