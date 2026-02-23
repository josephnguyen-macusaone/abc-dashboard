import { flexRender, type Table as TanstackTable } from "@tanstack/react-table";
import type * as React from "react";

import { TablePagination } from "../common/table-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/presentation/components/atoms/primitives/table";
import { cn } from "@/shared/helpers";

interface DataTableProps<TData> extends React.ComponentProps<"div"> {
  table: TanstackTable<TData>;
  actionBar?: React.ReactNode;
  /** Custom content when table has no rows (toolbar remains visible). */
  emptyState?: React.ReactNode;
}

export function DataTable<TData>({
  table,
  actionBar,
  emptyState,
  children,
  className,
  ...props
}: DataTableProps<TData>) {
  const hasRows = (table.getPaginationRowModel().rows?.length ?? 0) > 0;
  const showEmptyBlock = !hasRows && emptyState != null;

  return (
    <div
      className={cn("flex w-full flex-col gap-4 overflow-auto", className)}
      {...props}
    >
      {children}
      {showEmptyBlock ? (
        emptyState
      ) : (
        <div className="overflow-x-auto rounded-md border w-full">
          <Table
            style={{ width: '100%', minWidth: 'max-content' }}
          >
            <TableHeader className="bg-muted">
              {table.getHeaderGroups().map((headerGroup) => {
                const total = headerGroup.headers.reduce(
                  (sum, h) => sum + h.getSize(),
                  0
                );
                return (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const size = header.getSize();
                    const widthPct = total > 0 ? `${(size / total) * 100}%` : undefined;
                    return (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      style={widthPct ? { width: widthPct, minWidth: `${size}px` } : undefined}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                    </TableHead>
                  );
                  })}
                </TableRow>
              );
              })}
            </TableHeader>
            <TableBody>
              {hasRows ? (
                table.getPaginationRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="even:bg-muted/20"
                  >
                    {row.getVisibleCells().map((cell) => {
                      const total = table.getHeaderGroups()[0]?.headers.reduce(
                        (sum, h) => sum + h.getSize(),
                        0
                      );
                      const size = cell.column.getSize();
                      const widthPct = total ? `${(size / total) * 100}%` : undefined;
                      return (
                      <TableCell
                        key={cell.id}
                        style={widthPct ? { width: widthPct, minWidth: `${size}px` } : undefined}
                        className="min-w-0 truncate"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    );
                    })}
                  </TableRow>
                ))
              ) : (
                <TableRow>
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
        </div>
      )}
      <div className="flex flex-col gap-2.5">
        <TablePagination table={table} />
        {actionBar &&
          table.getFilteredSelectedRowModel().rows.length > 0 &&
          actionBar}
      </div>
    </div>
  );
}

