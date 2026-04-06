import { Skeleton } from "@/presentation/components/atoms/primitives/skeleton";
import { ScrollArea } from "@/presentation/components/atoms/primitives/scroll-area";
import { getRowHeightValue } from "@/shared/lib/data-grid";
import { LICENSE_COLUMN_WIDTHS } from "@/shared/constants/license";
import type { LicenseColumnId } from "@/shared/constants/license";
import { cn } from "@/shared/helpers";

/** Row height matches LicensesDataGrid (rowHeight: "medium" = 56px) */
const ROW_HEIGHT = getRowHeightValue("medium");

/** Keep in sync with `LicensesDataGrid` / DataGrid intrinsic layout (header, rows, add-row strip, slack). */
const GRID_HEADER_APPROX_PX = 49;
const ADD_ROW_STRIP_PX = 36;
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

/** Grid columns: same as license grid, no select */
const GRID_COLUMN_IDS: LicenseColumnId[] = [
  "dba",
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
  "agents",
  "agentsName",
  "agentsCost",
  "notes",
];

const PILL_COLUMNS = new Set<LicenseColumnId>(["status", "plan", "term"]);

function getGridCellSkeleton(columnId: LicenseColumnId) {
  if (PILL_COLUMNS.has(columnId)) {
    return <Skeleton className="h-5 w-14 rounded-full shrink-0" />;
  }
  if (columnId === "dba" || columnId === "agentsName") {
    return <Skeleton className="h-4 w-24 rounded" />;
  }
  if (columnId === "notes") {
    return <Skeleton className="h-4 w-32 rounded" />;
  }
  return <Skeleton className="h-4 w-16 rounded" />;
}

interface LicensesDataGridSkeletonProps {
  className?: string;
  rowCount?: number;
  height?: number;
  showAddRow?: boolean;
  showPagination?: boolean;
}

/**
 * Licenses Data Grid Skeleton Organism
 * Matches user-data-table-skeleton style: Skeleton primitive, LICENSE_COLUMN_WIDTHS, pill for status/plan/term.
 */
export function LicensesDataGridSkeleton({
  className,
  rowCount = 20,
  height,
  showAddRow = true,
  showPagination = true,
}: LicensesDataGridSkeletonProps) {
  const resolvedHeight = height ?? defaultSkeletonGridHeight(rowCount, showAddRow);

  return (
    <div className={cn("space-y-5", className)}>
      {/* Toolbar - Skeleton placeholders aligned with user skeleton */}
      <div className="flex flex-col gap-2 w-full min-w-0 lg:flex-row lg:flex-wrap lg:items-center lg:gap-2 lg:justify-between">
        <div className="flex w-full sm:hidden shrink-0">
          <Skeleton className="h-8 w-32 rounded-md" />
        </div>
        <div className="flex w-full sm:hidden lg:hidden items-center gap-2 flex-nowrap min-w-0">
          <Skeleton className="h-8 flex-1 min-w-[120px] rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
        <div className="hidden w-full sm:flex lg:w-auto lg:min-w-0 items-center gap-2 flex-nowrap min-w-0 overflow-x-auto shrink-0">
          <Skeleton className="h-8 w-28 rounded-md shrink-0" />
          <Skeleton className="h-8 w-40 md:w-52 lg:w-72 rounded-md shrink-0" />
          <Skeleton className="h-8 w-20 rounded-md shrink-0" />
        </div>
        <div className="flex flex-1 flex-wrap items-center gap-2 min-w-0 justify-start lg:justify-end overflow-x-auto lg:overflow-visible">
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-16 rounded-md" />
          <Skeleton className="h-8 w-14 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
      </div>

      {/* Data Grid */}
      <div className="relative flex w-full flex-col">
        <ScrollArea
          type="auto"
          className="w-full rounded-md border bg-card"
          style={{ height: `${resolvedHeight}px`, maxHeight: `${resolvedHeight}px` }}
          viewportProps={{ role: "grid", "aria-label": "Data grid", tabIndex: 0 }}
          viewportClassName="focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <div className="relative grid select-none">
          {/* Grid Header */}
          <div
            role="rowgroup"
            className="sticky top-0 z-10 grid border-b bg-muted [&_[role=row]]:border-b"
          >
            <div role="row" className="flex w-full">
              {GRID_COLUMN_IDS.map((id, colIndex) => (
                <div
                  key={id}
                  role="columnheader"
                  aria-colindex={colIndex + 1}
                  className={cn("relative", { "border-e": colIndex < GRID_COLUMN_IDS.length - 1 })}
                  style={{ width: `${LICENSE_COLUMN_WIDTHS[id].size}px` }}
                >
                  <div className="size-full h-12 px-4 py-2 flex items-center">
                    <Skeleton className="h-4 w-full rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Grid Body */}
          <div
            role="rowgroup"
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
                aria-rowindex={rowIndex + 2}
                className={cn(
                  "absolute flex w-full border-b will-change-transform hover:bg-muted/50",
                  rowIndex % 2 === 0 ? "bg-background" : "bg-muted/20"
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
                    className={cn("border-e flex size-full min-w-0 items-center")}
                    style={{ width: `${LICENSE_COLUMN_WIDTHS[id].size}px` }}
                  >
                    <div className="size-full flex min-w-0 items-center px-4 py-4">
                      {getGridCellSkeleton(id)}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Grid Footer - Add row */}
          {showAddRow && (
            <div
              role="rowgroup"
              className="sticky bottom-0 z-10 grid border-t bg-background"
            >
              <div role="row" className="flex w-full">
                <div
                  role="gridcell"
                  className="relative flex h-9 grow items-center bg-muted/30 transition-colors hover:bg-muted/50"
                >
                  <div className="sticky start-0 flex items-center gap-2 px-3 text-muted-foreground">
                    <Skeleton className="size-3.5 rounded-full" />
                    <Skeleton className="h-4 w-24 rounded" />
                  </div>
                </div>
              </div>
            </div>
          )}
          </div>
        </ScrollArea>

        {/* Pagination - same layout and Skeleton classes as user skeleton */}
        {showPagination && (
          <div className="flex flex-col gap-2.5 mt-6">
            <div className="flex w-full flex-col-reverse items-center justify-between gap-4 overflow-auto p-1 sm:flex-row sm:gap-8">
              <div className="flex-1 whitespace-nowrap text-muted-foreground text-sm">
                <Skeleton className="h-5 w-32 rounded" />
              </div>
              <div className="flex flex-col-reverse items-center gap-4 sm:flex-row sm:gap-6 lg:gap-8">
                <div className="flex items-center space-x-2">
                  <Skeleton className="h-5 w-24 rounded" />
                  <Skeleton className="h-8 w-16 rounded-md" />
                </div>
                <div className="flex items-center justify-center font-medium text-sm">
                  <Skeleton className="h-5 w-20 rounded" />
                </div>
                <div className="flex items-center space-x-2">
                  <Skeleton className="hidden size-8 rounded-md lg:block" />
                  <Skeleton className="size-8 rounded-md" />
                  <Skeleton className="size-8 rounded-md" />
                  <Skeleton className="hidden size-8 rounded-md lg:block" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
