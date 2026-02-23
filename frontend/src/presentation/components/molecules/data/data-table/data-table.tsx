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
  /** When true, table stretches to fill container width (e.g. user management). Default false. */
  stretch?: boolean;
}

export function DataTable<TData>({
  table,
  actionBar,
  emptyState,
  stretch = false,
  children,
  className,
  ...props
}: DataTableProps<TData>) {
  const hasRows = (table.getPaginationRowModel().rows?.length ?? 0) > 0;
  const showEmptyBlock = !hasRows && emptyState != null;

  const headerGroup = table.getHeaderGroups()[0];
  const totalSize = headerGroup?.headers.reduce((sum, h) => sum + h.getSize(), 0) ?? 0;

  return (
    <div
      className={cn("flex w-full flex-col gap-4 overflow-auto", className)}
      {...props}
    >
      {children}
      {showEmptyBlock ? (
        emptyState
      ) : (
        <div className={cn("overflow-x-auto rounded-md border", stretch && "w-full")}>
          <Table
            style={
              stretch
                ? { width: "100%" }
                : totalSize
                  ? { width: totalSize }
                  : undefined
            }
          >
            {stretch && totalSize > 0 && (
              <colgroup>
                {headerGroup?.headers.map((header) => (
                  <col
                    key={header.id}
                    style={{ width: `${(header.getSize() / totalSize) * 100}%` }}
                  />
                ))}
              </colgroup>
            )}
            <TableHeader className="bg-muted">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const size = header.getSize();
                    const widthStyle = stretch && totalSize > 0
                      ? undefined
                      : { width: `${size}px` };
                    return (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      style={widthStyle}
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
              ))}
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
                      const cellSize = cell.column.getSize();
                      const cellWidthStyle = stretch && totalSize > 0
                        ? undefined
                        : { width: `${cellSize}px` };
                      return (
                      <TableCell
                        key={cell.id}
                        style={cellWidthStyle}
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

