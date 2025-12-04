/**
 * DataTable Component
 */

import { flexRender, type Table as TanstackTable } from "@tanstack/react-table";
import * as React from "react";

import { DataTablePagination } from "./data-table-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/presentation/components/atoms/primitives/table";
import { cn } from "@/shared/utils";

interface DataTableProps<TData> extends React.ComponentProps<"div"> {
  table: TanstackTable<TData>;
  actionBar?: React.ReactNode;
  showPageSizeSelector?: boolean;
}

export function DataTable<TData>({
  table,
  actionBar,
  children,
  className,
  showPageSizeSelector = true,
  ...props
}: DataTableProps<TData>) {
  // Reset to page 1 if current page exceeds page count
  const pageCount = table.getPageCount();
  const currentPage = table.getState().pagination.pageIndex;

  React.useEffect(() => {
    if (pageCount > 0 && currentPage >= pageCount) {
      table.setPageIndex(0);
    }
  }, [pageCount, currentPage, table]);

  return (
    <div
      className={cn("flex w-full flex-col gap-2.5", className)}
      {...props}
    >
      {children}
      <Table className="rounded-md border">
        <TableHeader className="sticky top-0 z-10 bg-inherit">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  colSpan={header.colSpan}
                  className="whitespace-nowrap bg-muted"
                  style={{
                    minWidth: header.column.columnDef.size,
                  }}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>

        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row, index) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
                className={cn(
                  "transition-colors duration-200 ease-in-out cursor-pointer"
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className="whitespace-nowrap"
                    style={{
                      minWidth: cell.column.columnDef.size,
                    }}
                  >
                    {flexRender(
                      cell.column.columnDef.cell,
                      cell.getContext(),
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={table.getAllColumns().length}
                className="h-24 text-center"
              >
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <div className="flex flex-col gap-2.5">
        <DataTablePagination table={table} showPageSizeSelector={showPageSizeSelector} />
        {actionBar &&
          table.getFilteredSelectedRowModel().rows.length > 0 &&
          actionBar}
      </div>
    </div>
  );
}

