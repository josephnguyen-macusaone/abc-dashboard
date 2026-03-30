import { flexRender, type Table as TanstackTable } from "@tanstack/react-table";
import * as React from "react";

import { TablePagination } from "../common/table-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/presentation/components/atoms/primitives/table";
import { ScrollArea } from "@/presentation/components/atoms/primitives/scroll-area";
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
  const rows = table.getPaginationRowModel().rows;
  const hasRows = (rows?.length ?? 0) > 0;
  const showEmptyBlock = !hasRows && emptyState != null;

  const headerGroup = table.getHeaderGroups()[0];
  const totalSize = headerGroup?.headers.reduce((sum, h) => sum + h.getSize(), 0) ?? 0;

  const tableContent = (
    <Table
      style={
        stretch
          ? { width: "100%" }
          : totalSize
            ? { width: totalSize, minWidth: totalSize, tableLayout: "auto" as const }
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
              const widthStyle =
                stretch && totalSize > 0 ? undefined : { minWidth: `${size}px`, width: `${size}px` };
              const align = (header.column.columnDef.meta as { headerAlign?: "start" | "end" | "center" } | undefined)?.headerAlign ?? "start";
              const alignClass = align === "end" ? "text-right" : align === "center" ? "text-center" : "text-left";
              return (
                <TableHead
                  key={header.id}
                  colSpan={header.colSpan}
                  style={widthStyle}
                  className={cn("!p-0", alignClass)}
                >
                  {header.isPlaceholder ? null : (
                    <div className="flex w-full items-center">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                    </div>
                  )}
                </TableHead>
              );
            })}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {!hasRows ? (
          <TableRow>
            <TableCell
              colSpan={table.getAllColumns().length}
              className="h-24 text-center"
            >
              No results.
            </TableCell>
          </TableRow>
        ) : (
          rows.map((row) => (
            <TableRow
              key={row.id}
              data-state={row.getIsSelected() ? "selected" : undefined}
              className="even:bg-muted/20"
            >
              {row.getVisibleCells().map((cell) => {
                const cellSize = cell.column.getSize();
                const cellWidthStyle =
                  stretch && totalSize > 0
                    ? undefined
                    : { minWidth: `${cellSize}px` };
                const align = (cell.column.columnDef.meta as { headerAlign?: "start" | "end" | "center" } | undefined)?.headerAlign ?? "start";
                const alignClass = align === "end" ? "text-right" : align === "center" ? "text-center" : "text-left";
                return (
                  <TableCell
                    key={cell.id}
                    style={cellWidthStyle}
                    className={cn("whitespace-nowrap", alignClass)}
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
        )}
      </TableBody>
    </Table>
  );

  return (
    <div
      className={cn("flex w-full flex-col gap-4", className)}
      {...props}
    >
      {children}
      {showEmptyBlock ? (
        emptyState
      ) : (
        <ScrollArea className={cn("max-h-[min(70vh,36rem)] w-full rounded-md border", stretch && "w-full")}>
          <div className={cn(stretch && "w-full")}>{tableContent}</div>
        </ScrollArea>
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
