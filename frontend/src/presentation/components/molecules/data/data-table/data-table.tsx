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
import { cn } from "@/shared/helpers";

interface DataTableProps<TData> extends React.ComponentProps<"div"> {
  table: TanstackTable<TData>;
  actionBar?: React.ReactNode;
  /** Custom content when table has no rows (toolbar remains visible). */
  emptyState?: React.ReactNode;
  /**
   * When true (default): table width matches the sum of column sizes (no extra horizontal stretch
   * into the viewport — avoids empty space inside narrow columns). Scrolls when the container is narrower.
   * Centered when the container is wider.
   */
  stretch?: boolean;
  /** Extra classes on the table wrapper (horizontal overflow; height follows row content). */
  tableWrapperClassName?: string;
}

export function DataTable<TData>({
  table,
  actionBar,
  emptyState,
  stretch = true,
  tableWrapperClassName,
  children,
  className,
  ...props
}: DataTableProps<TData>) {
  const rows = table.getPaginationRowModel().rows;
  const hasRows = (rows?.length ?? 0) > 0;
  const showEmptyBlock = !hasRows && emptyState != null;

  const headerGroup = table.getHeaderGroups()[0];
  const totalSize = headerGroup?.headers.reduce((sum, h) => sum + h.getSize(), 0) ?? 0;

  // Stretch: fixed width = sum of column sizes so the browser does not distribute extra viewport
  // width across columns (which caused large gaps next to short values). Horizontal scroll when needed.
  const stretchTableStyle =
    stretch && totalSize > 0
      ? {
          width: totalSize,
          minWidth: totalSize,
          marginLeft: "auto",
          marginRight: "auto",
          tableLayout: "fixed" as const,
        }
      : totalSize && !stretch
        ? { width: totalSize, minWidth: totalSize, tableLayout: "auto" as const }
        : undefined;

  const tableContent = (
    <Table className="min-w-0 overflow-x-visible" style={stretchTableStyle}>
      {stretch && totalSize > 0 && (
        <colgroup>
          {headerGroup?.headers.map((header) => (
            <col key={header.id} style={{ width: header.getSize() }} />
          ))}
        </colgroup>
      )}
      <TableHeader className="bg-muted">
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => {
              const size = header.getSize();
              const minFromDef = header.column.columnDef.minSize;
              const floor = typeof minFromDef === "number" ? Math.max(size, minFromDef) : size;
              const widthStyle =
                stretch && totalSize > 0
                  ? { minWidth: `${floor}px` }
                  : { minWidth: `${size}px`, width: `${size}px` };
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
                    <div
                      className={cn(
                        "flex w-full items-center align-middle",
                        align === "end" && "justify-end",
                        align === "center" && "justify-center",
                        align === "start" && "justify-start",
                      )}
                    >
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
                const cellMinDef = cell.column.columnDef.minSize;
                const cellFloor =
                  typeof cellMinDef === "number" ? Math.max(cellSize, cellMinDef) : cellSize;
                const cellWidthStyle =
                  stretch && totalSize > 0
                    ? { minWidth: `${cellFloor}px` }
                    : { minWidth: `${cellSize}px` };
                const align = (cell.column.columnDef.meta as { headerAlign?: "start" | "end" | "center" } | undefined)?.headerAlign ?? "start";
                const alignClass = align === "end" ? "text-right" : align === "center" ? "text-center" : "text-left";
                return (
                  <TableCell
                    key={cell.id}
                    style={cellWidthStyle}
                    className={cn("align-middle whitespace-nowrap", alignClass)}
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
        <div
          className={cn(
            "w-full min-h-0 overflow-x-auto rounded-md border",
            tableWrapperClassName,
            stretch && "w-full",
          )}
        >
          {tableContent}
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
