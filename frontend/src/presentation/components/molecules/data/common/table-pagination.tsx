import type { Table } from "@tanstack/react-table";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

import { Button } from "@/presentation/components/atoms/primitives/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/presentation/components/atoms/forms/select";
import { cn } from "@/shared/helpers";

interface TablePaginationProps<TData> extends React.ComponentProps<"div"> {
  table: Table<TData>;
  pageSizeOptions?: number[];
}

export function TablePagination<TData>({
  table,
  pageSizeOptions = [20, 40, 60],
  className,
  ...props
}: TablePaginationProps<TData>) {
  const { pageIndex, pageSize } = table.getState().pagination;
  // Prefer totalRows from meta (server-side pagination), fallback to current data length
  // During page transitions, current data might be empty, so meta.totalRows is more reliable
  const metaTotalRows = (table.options.meta as { totalRows?: number })?.totalRows;
  const currentDataLength = table.getFilteredRowModel().rows.length;
  const totalRows = metaTotalRows !== undefined && metaTotalRows !== null
    ? metaTotalRows
    : currentDataLength;

  // Calculate pageCount from totalRows and pageSize if table's pageCount seems incorrect
  // This ensures we have the correct number of pages for calculation
  const tablePageCount = table.getPageCount();
  const calculatedPageCount = totalRows > 0 && pageSize > 0
    ? Math.ceil(totalRows / pageSize)
    : 0;
  // Use calculated pageCount if table's pageCount is invalid (-1 or 0 when we have data)
  const pageCount = (tablePageCount > 0 || calculatedPageCount === 0)
    ? tablePageCount
    : calculatedPageCount;

  // Calculate page start and end
  let pageStart = 0;
  let pageEnd = 0;

  if (totalRows > 0 && pageSize > 0) {
    // Use the actual pageIndex from table state directly
    // Calculate the start index for the current page (1-based)
    const calculatedStart = pageIndex * pageSize + 1;

    // Calculate end index
    if (calculatedStart <= totalRows) {
      // Normal case: calculate start and end based on actual pageIndex
      pageStart = calculatedStart;
      pageEnd = Math.min(pageStart + pageSize - 1, totalRows);
    } else {
      // If calculated start exceeds totalRows, we're beyond the data
      // This shouldn't happen if pageCount is correct, but handle gracefully
      // Show the last valid page's range
      const maxPageIndex = Math.max(0, pageCount - 1);
      const lastPageStart = maxPageIndex * pageSize + 1;
      if (lastPageStart <= totalRows) {
        pageStart = lastPageStart;
        pageEnd = totalRows;
      } else {
        // Fallback to first page if even last page calculation fails
        pageStart = 1;
        pageEnd = Math.min(pageSize, totalRows);
      }
    }

    // Final validation: ensure values are reasonable
    if (pageStart < 1 || pageEnd < 1 || pageStart > totalRows || pageEnd > totalRows) {
      // Fallback to first page if calculation is invalid
      pageStart = 1;
      pageEnd = Math.min(pageSize, totalRows);
    }
  }

  // Use calculated values
  const finalPageStart = pageStart;
  const finalPageEnd = pageEnd;

  const pageLabel = `Page ${pageIndex + 1} of ${pageCount}`;

  const navButtons = (
    <>
      <Button
        aria-label="Go to first page"
        variant="outline"
        size="icon"
        className="hidden size-8 lg:flex"
        onClick={() => table.setPageIndex(0)}
        disabled={!table.getCanPreviousPage()}
      >
        <ChevronsLeft />
      </Button>
      <Button
        aria-label="Go to previous page"
        variant="outline"
        size="icon"
        className="size-8"
        onClick={() => table.previousPage()}
        disabled={!table.getCanPreviousPage()}
      >
        <ChevronLeft />
      </Button>
      <Button
        aria-label="Go to next page"
        variant="outline"
        size="icon"
        className="size-8"
        onClick={() => table.nextPage()}
        disabled={!table.getCanNextPage()}
      >
        <ChevronRight />
      </Button>
      <Button
        aria-label="Go to last page"
        variant="outline"
        size="icon"
        className="hidden size-8 lg:flex"
        onClick={() => table.setPageIndex(table.getPageCount() - 1)}
        disabled={!table.getCanNextPage()}
      >
        <ChevronsRight />
      </Button>
    </>
  );

  return (
    <div
      className={cn(
        "flex w-full flex-col gap-4 overflow-auto p-1 sm:flex-row sm:items-center sm:justify-between sm:gap-8",
        className,
      )}
      {...props}
    >
      <div className="flex w-full items-center justify-between gap-2 sm:hidden">
        <p className="whitespace-nowrap font-medium text-sm">{pageLabel}</p>
        <div className="flex shrink-0 items-center gap-2">{navButtons}</div>
      </div>

      <div className="flex w-full min-w-0 flex-col items-center gap-3 sm:flex-1 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
        <div className="order-1 flex flex-col items-center gap-3 sm:order-2 sm:flex-row sm:items-center sm:gap-6 lg:gap-8">
          <div className="flex items-center gap-2">
            <p className="whitespace-nowrap font-medium text-sm">Rows per page</p>
            <Select
              value={`${pageSize}`}
              onValueChange={(value) => {
                table.setPageSize(Number(value));
              }}
            >
              <SelectTrigger className="h-8 w-16">
                <SelectValue placeholder={pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {pageSizeOptions.map((option) => (
                  <SelectItem key={option} value={`${option}`}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="hidden whitespace-nowrap font-medium text-sm sm:block">
            {pageLabel}
          </p>
          <div className="hidden items-center gap-2 sm:flex">{navButtons}</div>
        </div>
        <div className="order-2 w-full whitespace-nowrap text-center text-muted-foreground text-sm sm:order-1 sm:flex-1 sm:text-start">
          Showing {finalPageStart} to {finalPageEnd} of {totalRows} entries
        </div>
      </div>
    </div>
  );
}

