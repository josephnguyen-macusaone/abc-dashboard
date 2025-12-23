import { ShapeSkeleton } from '@/presentation/components/atoms';
import { ButtonSkeleton } from '@/presentation/components/molecules';
import { cn } from "@/shared/helpers";

interface LicensesDataGridSkeletonProps {
  className?: string;
  rowCount?: number;
  height?: number;
  showAddRow?: boolean;
  showPagination?: boolean;
}

/**
 * Licenses Data Grid Skeleton Organism
 * Matches the exact structure and styling of the actual LicensesDataGrid component
 */
export function LicensesDataGridSkeleton({
  className,
  rowCount = 20,
  height = 1200,
  showAddRow = true,
  showPagination = true,
}: LicensesDataGridSkeletonProps) {
  // Column definitions matching license-grid-columns.tsx
  const columns = [
    { id: 'dba', width: 150, header: 'DBA' },
    { id: 'zip', width: 100, header: 'Zip Code' },
    { id: 'startsAt', width: 120, header: 'Start Date' },
    { id: 'status', width: 120, header: 'Status' },
    { id: 'plan', width: 120, header: 'Plan' },
    { id: 'term', width: 110, header: 'Term' },
    { id: 'lastPayment', width: 130, header: 'Last Payment' },
    { id: 'lastActive', width: 120, header: 'Last Active' },
    { id: 'smsPurchased', width: 130, header: 'SMS Purchased' },
    { id: 'smsSent', width: 110, header: 'SMS Sent' },
    { id: 'smsBalance', width: 120, header: 'SMS Balance' },
    { id: 'agents', width: 90, header: 'Agents' },
    { id: 'agentsName', width: 200, header: 'Agents Name' },
    { id: 'agentsCost', width: 120, header: 'Agents Cost' },
    { id: 'notes', width: 200, header: 'Notes' },
  ];

  return (
    <div className={cn("space-y-5", className)}>
      {/* Toolbar - matches actual LicensesDataGrid toolbar */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        {/* Left side - Search and filter menus */}
        <div className="flex items-center gap-2">
          {/* Search bar */}
          <div className="relative">
            <ShapeSkeleton width="40 lg:56" height="8" variant="rounded" />
          </div>

          {/* DataGridFilterMenu */}
          <ButtonSkeleton variant="outline" size="sm" showText />

          {/* DataGridSortMenu */}
          <ButtonSkeleton variant="outline" size="sm" showText />

          {/* DataGridRowHeightMenu */}
          <ButtonSkeleton variant="outline" size="sm" showText />

          {/* DataGridViewMenu */}
          <ButtonSkeleton variant="outline" size="sm" showText />
        </div>

        {/* Right side - Conditional action buttons (when hasChanges) */}
        <div className="flex items-center gap-2">
          {/* Discard button */}
          <ButtonSkeleton variant="outline" size="sm" textWidth="16" />

          {/* Save Changes button */}
          <ButtonSkeleton variant="default" size="sm" textWidth="20" />
        </div>
      </div>

      {/* Data Grid - matching DataGrid component structure exactly */}
      <div className="relative flex w-full flex-col">
        <div
          role="grid"
          aria-label="Data grid"
          className="relative grid select-none overflow-auto rounded-md border focus:outline-none bg-card"
          style={{ maxHeight: `${height}px` }}
        >
          {/* Grid Header - matching DataGrid header structure */}
          <div
            role="rowgroup"
            className="sticky top-0 z-10 grid border-b bg-background"
          >
            <div
              role="row"
              className="flex w-full"
            >
              {columns.map((column, colIndex) => (
                <div
                  key={column.id}
                  role="columnheader"
                  aria-colindex={colIndex + 1}
                  className={cn("relative", {
                    "border-e": column.id !== "select",
                  })}
                  style={{ width: `${column.width}px` }}
                >
                  <div className="size-full px-3 py-1.5">
                    <ShapeSkeleton width="full" height="4" variant="rectangle" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Grid Body - matching DataGrid body structure */}
          <div
            role="rowgroup"
            className="relative grid"
            style={{
              height: `${rowCount * 36}px`,
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
                  height: '36px',
                  transform: `translateY(${rowIndex * 36}px)`,
                }}
              >
                {columns.map((column, colIndex) => (
                  <div
                    key={column.id}
                    role="gridcell"
                    aria-colindex={colIndex + 1}
                    className={cn("border-e")}
                    style={{ width: `${column.width}px` }}
                  >
                    <div className="size-full px-3 py-1.5">
                      {column.id === 'status' || column.id === 'plan' || column.id === 'term' ? (
                        <ShapeSkeleton width="16" height="6" variant="rounded" />
                      ) : (
                        <ShapeSkeleton
                          width={column.id === 'dba' ? "24" : column.id === 'agentsName' ? "32" : "16"}
                          height="4"
                          variant="rectangle"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Grid Footer - Add row button */}
          {showAddRow && (
            <div
              role="rowgroup"
              className="sticky bottom-0 z-10 grid border-t bg-background"
            >
              <div
                role="row"
                className="flex w-full"
              >
                <div
                  role="gridcell"
                  className="relative flex h-9 grow items-center bg-muted/30 transition-colors hover:bg-muted/50"
                >
                  <div className="sticky start-0 flex items-center gap-2 px-3 text-muted-foreground">
                    <ShapeSkeleton width="3.5" height="3.5" variant="rounded" />
                    <ShapeSkeleton width="12" height="4" variant="rectangle" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pagination - matching TablePagination component exactly */}
        {showPagination && (
          <div className="flex flex-col gap-4 mt-6">
            <div className="flex w-full flex-col-reverse items-center justify-between gap-4 overflow-auto p-1 sm:flex-row sm:gap-8">
              {/* Left side - "Showing X to Y of Z entries" */}
              <div className="flex-1 whitespace-nowrap text-muted-foreground text-sm">
                <ShapeSkeleton width="32" height="4" variant="rectangle" />
              </div>

              {/* Right side - Rows per page, Page info, Navigation buttons */}
              <div className="flex flex-col-reverse items-center gap-4 sm:flex-row sm:gap-6 lg:gap-8">
                {/* Rows per page selector */}
                <div className="flex items-center space-x-2">
                  <ShapeSkeleton width="20" height="4" variant="rectangle" />
                  <div className="h-8 w-16">
                    <ShapeSkeleton width="full" height="full" variant="rounded" />
                  </div>
                </div>

                {/* Page info */}
                <div className="flex items-center justify-center font-medium text-sm">
                  <ShapeSkeleton width="16" height="4" variant="rectangle" />
                </div>

                {/* Navigation buttons */}
                <div className="flex items-center space-x-2">
                  {/* First page button (hidden on small screens) */}
                  <div className="hidden size-8 lg:block">
                    <ShapeSkeleton width="full" height="full" variant="rounded" />
                  </div>
                  {/* Previous page button */}
                  <div className="size-8">
                    <ShapeSkeleton width="full" height="full" variant="rounded" />
                  </div>
                  {/* Next page button */}
                  <div className="size-8">
                    <ShapeSkeleton width="full" height="full" variant="rounded" />
                  </div>
                  {/* Last page button (hidden on small screens) */}
                  <div className="hidden size-8 lg:block">
                    <ShapeSkeleton width="full" height="full" variant="rounded" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
