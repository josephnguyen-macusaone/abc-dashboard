import { Skeleton } from "@/presentation/components/atoms/primitives/skeleton";
import { getRowHeightValue } from "@/shared/lib/data-grid";
import { LICENSE_COLUMN_WIDTHS } from "@/shared/constants/license";
import type { LicenseColumnId } from "@/shared/constants/license";
import { cn } from "@/shared/helpers";

/** Row height matches LicensesDataGrid (rowHeight: "medium" = 56px) */
const ROW_HEIGHT = getRowHeightValue("medium");

/**
 * Default-visible columns only — matches `LicensesDataGrid` `initialState.columnVisibility`
 * (`createdBy` / `updatedBy` off; `auditHistory` on; no `select` column in grid defs).
 * Order matches `license-grid-columns.tsx` + trailing `auditHistory`.
 */
const GRID_COLUMN_IDS: LicenseColumnId[] = [
  "dba",
  "agents",
  "agentsName",
  "zip",
  "startsAt",
  "status",
  "plan",
  "term",
  "dueDate",
  "lastPayment",
  "lastActive",
  "smsPurchased",
  "smsSent",
  "smsBalance",
  "agentsCost",
  "notes",
  "auditHistory",
];

const PILL_COLUMNS = new Set<LicenseColumnId>(["status", "plan", "term"]);

const NUMBER_COLUMNS = new Set<LicenseColumnId>([
  "lastPayment",
  "smsPurchased",
  "smsSent",
  "smsBalance",
  "agentsCost",
]);

function getGridCellSkeleton(columnId: LicenseColumnId) {
  if (columnId === "auditHistory") {
    return <Skeleton className="size-7 rounded-full shrink-0 mx-auto" />;
  }
  if (PILL_COLUMNS.has(columnId)) {
    return <Skeleton className="h-5 w-14 rounded-full shrink-0" />;
  }
  if (columnId === "plan") {
    return <Skeleton className="h-5 w-24 rounded-full shrink-0" />;
  }
  if (columnId === "dba" || columnId === "agents" || columnId === "agentsName") {
    return <Skeleton className="h-4 w-28 max-w-full rounded" />;
  }
  if (columnId === "notes") {
    return <Skeleton className="h-4 w-32 max-w-full rounded" />;
  }
  if (NUMBER_COLUMNS.has(columnId)) {
    return <Skeleton className="h-4 w-12 rounded ms-auto" />;
  }
  if (columnId === "zip") {
    return <Skeleton className="h-4 w-10 rounded ms-auto" />;
  }
  if (columnId === "startsAt" || columnId === "dueDate" || columnId === "lastActive") {
    return <Skeleton className="h-4 w-[4.5rem] rounded ms-auto" />;
  }
  return <Skeleton className="h-4 w-16 rounded" />;
}

function cellAlignClass(columnId: LicenseColumnId): string {
  if (
    NUMBER_COLUMNS.has(columnId) ||
    columnId === "zip" ||
    columnId === "startsAt" ||
    columnId === "dueDate" ||
    columnId === "lastActive"
  ) {
    return "justify-end text-end";
  }
  if (columnId === "auditHistory") {
    return "justify-center text-center";
  }
  return "justify-start text-start";
}

/** Keep in sync with `LicensesDataGrid` / DataGrid intrinsic layout (header, add-row under header, body). */
const GRID_HEADER_APPROX_PX = 49;
const ADD_ROW_STRIP_PX = 32;
const GRID_VERTICAL_PADDING_PX = 8;

function defaultSkeletonGridHeight(rowCount: number, showAddRow: boolean): number {
  const addStrip = showAddRow ? ADD_ROW_STRIP_PX : 0;
  const contentPx =
    GRID_HEADER_APPROX_PX +
    rowCount * ROW_HEIGHT +
    addStrip +
    GRID_VERTICAL_PADDING_PX;
  return Math.max(contentPx, 200);
}

interface LicensesDataGridSkeletonProps {
  className?: string;
  rowCount?: number;
  height?: number;
  showAddRow?: boolean;
  showPagination?: boolean;
}

/**
 * Licenses Data Grid skeleton — toolbar rhythm, scroll shell, columns, and add-row
 * aligned with `LicensesDataGrid` + `DataGrid` (`addRowPosition="top"`).
 */
export function LicensesDataGridSkeleton({
  className,
  rowCount = 20,
  height,
  showAddRow = true,
  showPagination = true,
}: LicensesDataGridSkeletonProps) {
  const resolvedHeight = height ?? defaultSkeletonGridHeight(rowCount, showAddRow);
  const colCount = GRID_COLUMN_IDS.length;

  return (
    <div className={cn("space-y-5", className)}>
      {/* Toolbar — mirrors `LicensesDataGrid` role="toolbar" layout */}
      <div
        role="toolbar"
        aria-orientation="horizontal"
        className="flex w-full flex-col gap-2 py-2 min-w-0 min-h-8 lg:flex-row lg:flex-wrap lg:items-center lg:gap-2 lg:py-1 lg:min-h-8"
      >
        <div className="flex w-full sm:hidden shrink-0">
          <Skeleton className="h-8 w-32 rounded-md" />
        </div>
        <div className="flex w-full sm:hidden lg:hidden items-center flex-nowrap gap-2 overflow-x-auto min-w-0">
          <Skeleton className="h-8 flex-1 min-w-[120px] rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
        <div className="hidden w-full sm:flex lg:w-auto lg:min-w-0 items-center min-h-8 flex-nowrap gap-2 overflow-x-auto min-w-0">
          <Skeleton className="h-8 w-28 rounded-md shrink-0" />
          <Skeleton className="h-8 w-40 md:w-52 lg:w-72 min-w-[120px] max-w-full rounded-md shrink-0" />
          <Skeleton className="h-8 w-20 rounded-md shrink-0" />
          <Skeleton className="h-8 w-8 rounded-md shrink-0 border border-dashed" />
          <div className="ms-auto hidden shrink-0 items-center gap-2 sm:flex lg:hidden">
            <Skeleton className="h-8 w-8 rounded-md shrink-0" />
            <Skeleton className="h-8 w-24 rounded-md shrink-0" />
          </div>
        </div>
        <div className="flex flex-1 flex-wrap items-center min-h-8 gap-2 min-w-0 justify-start lg:justify-end overflow-x-auto lg:overflow-visible">
          <Skeleton className="h-8 w-20 rounded-md shrink-0" />
          <Skeleton className="h-8 w-16 rounded-md shrink-0" />
          <Skeleton className="h-8 w-14 rounded-md shrink-0" />
          <div className="hidden shrink-0 items-center gap-2 sm:hidden lg:flex">
            <Skeleton className="h-8 w-8 rounded-md shrink-0" />
            <Skeleton className="h-8 w-28 rounded-md shrink-0" />
          </div>
          <Skeleton className="h-8 w-24 rounded-md shrink-0" />
        </div>
      </div>

      {/* Grid shell — matches `DataGrid` scroll root (no ScrollArea) */}
      <div className="relative flex w-full min-h-0 flex-col">
        <div
          data-slot="grid-scroll"
          className="app-scrollbar-x-slim w-full rounded-md border bg-card text-sm min-h-0 overflow-auto select-none"
          style={{
            height: `${resolvedHeight}px`,
            maxHeight: `${resolvedHeight}px`,
          }}
          role="grid"
          aria-label="Data grid"
          aria-rowcount={rowCount + (showAddRow ? 1 : 0)}
          aria-colcount={colCount}
          tabIndex={0}
        >
          <div className="relative grid select-none">
            <div
              role="rowgroup"
              data-slot="grid-header"
              className="sticky top-0 z-10 grid border-b bg-muted [&_[role=row]]:border-b"
            >
              <div role="row" className="flex w-full transition-colors">
                {GRID_COLUMN_IDS.map((id, colIndex) => (
                  <div
                    key={id}
                    role="columnheader"
                    aria-colindex={colIndex + 1}
                    className={cn("relative", {
                      "border-e": colIndex < colCount - 1,
                    })}
                    style={{ width: `${LICENSE_COLUMN_WIDTHS[id].size}px` }}
                  >
                    <div
                      className={cn(
                        "size-full h-12 px-4 py-2 flex items-center min-w-0",
                        cellAlignClass(id),
                      )}
                    >
                      {id === "auditHistory" ? (
                        <span className="sr-only">Activity</span>
                      ) : (
                        <Skeleton
                          className={cn(
                            "h-4 rounded shrink-0",
                            id === "dba"
                              ? "w-24"
                              : id === "agents" || id === "agentsName"
                                ? "w-20"
                                : id === "agentsCost"
                                  ? "w-16"
                                  : PILL_COLUMNS.has(id) || id === "plan"
                                    ? "w-14"
                                    : "w-16",
                          )}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {showAddRow && (
              <div
                role="rowgroup"
                data-slot="grid-add-row-group"
                className="grid border-b bg-muted"
              >
                <div role="row" className="flex w-full" aria-rowindex={2}>
                  <div
                    role="gridcell"
                    className="relative flex h-8 grow items-center bg-muted/30"
                  >
                    <div className="sticky start-0 flex items-center gap-2 px-3 text-muted-foreground">
                      <Skeleton className="size-3.5 rounded-full shrink-0" />
                      <Skeleton className="h-4 w-24 rounded shrink-0" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div
              role="rowgroup"
              data-slot="grid-body"
              className="relative grid"
              style={{
                height: `${rowCount * ROW_HEIGHT}px`,
                contain: "strict",
              }}
            >
              {Array.from({ length: rowCount }).map((_, rowIndex) => (
                <div
                  key={rowIndex}
                  role="row"
                  aria-rowindex={rowIndex + (showAddRow ? 3 : 2)}
                  className={cn(
                    "absolute flex w-full border-b will-change-transform",
                    rowIndex % 2 === 0 ? "bg-background" : "bg-muted/20",
                  )}
                  style={{
                    height: `${ROW_HEIGHT}px`,
                    transform: `translateY(${rowIndex * ROW_HEIGHT}px)`,
                  }}
                >
                  {GRID_COLUMN_IDS.map((id, colIndex) => (
                    <div
                      key={id}
                      role="gridcell"
                      aria-colindex={colIndex + 1}
                      className={cn(
                        "border-e flex size-full min-w-0 items-center",
                        cellAlignClass(id),
                      )}
                      style={{ width: `${LICENSE_COLUMN_WIDTHS[id].size}px` }}
                    >
                      <div
                        className={cn(
                          "size-full flex min-w-0 items-center px-4 py-4",
                          cellAlignClass(id),
                        )}
                      >
                        {getGridCellSkeleton(id)}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {showPagination && (
          <div className="mt-4 flex flex-col gap-2.5">
            <div className="flex w-full flex-col gap-4 overflow-auto p-1 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
              <div className="flex w-full items-center justify-between gap-2 sm:hidden">
                <Skeleton className="h-5 w-28 rounded" />
                <div className="flex shrink-0 items-center gap-2">
                  <Skeleton className="size-8 rounded-md" />
                  <Skeleton className="size-8 rounded-md" />
                </div>
              </div>
              <div className="flex w-full min-w-0 flex-col items-center gap-3 sm:flex-1 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
                <div className="order-1 flex flex-col items-center gap-3 sm:order-2 sm:flex-row sm:items-center sm:gap-6 lg:gap-8">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-24 rounded" />
                    <Skeleton className="h-8 w-16 rounded-md" />
                  </div>
                  <Skeleton className="hidden h-5 w-24 rounded sm:block" />
                  <div className="hidden items-center gap-2 sm:flex">
                    <Skeleton className="hidden size-8 rounded-md lg:block" />
                    <Skeleton className="size-8 rounded-md" />
                    <Skeleton className="size-8 rounded-md" />
                    <Skeleton className="hidden size-8 rounded-md lg:block" />
                  </div>
                </div>
                <div className="order-2 flex w-full justify-center sm:order-1 sm:flex-1 sm:justify-start">
                  <Skeleton className="h-5 w-48 max-w-full rounded" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
