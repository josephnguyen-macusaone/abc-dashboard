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

type ColumnChromeMeta = {
  headerAlign?: "start" | "end" | "center";
  stickyEnd?: boolean;
  absorbTableSlack?: boolean;
};

function columnChromeMeta(column: { columnDef: { meta?: unknown } }): ColumnChromeMeta | undefined {
  return column.columnDef.meta as ColumnChromeMeta | undefined;
}

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
  /**
   * When true with `stretch`: table spans 100% of the scroll container (`minWidth` stays column sum).
   * Use on compact dashboards (e.g. agent) so the card is not flanked by empty margins.
   */
  fillContainer?: boolean;
  /** Extra classes on the table wrapper (horizontal overflow; height follows row content). */
  tableWrapperClassName?: string;
}

export function DataTable<TData>({
  table,
  actionBar,
  emptyState,
  stretch = true,
  fillContainer = false,
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

  // Stretch: min width = sum of column sizes; optional fill uses 100% width so the table spans the card.
  const stretchTableStyle =
    stretch && totalSize > 0
      ? fillContainer
        ? {
            width: "100%",
            minWidth: totalSize,
            tableLayout: "fixed" as const,
          }
        : {
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
          {headerGroup?.headers.map((header) => {
            const w = header.getSize();
            const meta = columnChromeMeta(header.column);
            const stickyEnd = Boolean(meta?.stickyEnd);
            const absorbSlack = Boolean(fillContainer && meta?.absorbTableSlack);
            if (stickyEnd) {
              return (
                <col
                  key={header.id}
                  style={{ width: w, minWidth: w, maxWidth: w }}
                />
              );
            }
            if (absorbSlack) {
              return (
                <col
                  key={header.id}
                  style={{ minWidth: w, width: "100%" }}
                />
              );
            }
            return <col key={header.id} style={{ width: w }} />;
          })}
        </colgroup>
      )}
      <TableHeader className="bg-muted">
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => {
              const size = header.getSize();
              const minFromDef = header.column.columnDef.minSize;
              const floor = typeof minFromDef === "number" ? Math.max(size, minFromDef) : size;
              const meta = columnChromeMeta(header.column);
              const stickyEnd = Boolean(meta?.stickyEnd);
              const widthStyle = stickyEnd
                ? { width: `${size}px`, minWidth: `${size}px`, maxWidth: `${size}px` }
                : stretch && totalSize > 0
                  ? { minWidth: `${floor}px` }
                  : { minWidth: `${size}px`, width: `${size}px` };
              const align = meta?.headerAlign ?? "start";
              const alignClass = align === "end" ? "text-right" : align === "center" ? "text-center" : "text-left";
              return (
                <TableHead
                  key={header.id}
                  colSpan={header.colSpan}
                  style={widthStyle}
                  className={cn(
                    "!p-0",
                    alignClass,
                    stickyEnd &&
                      "sticky end-0 z-30 bg-muted shadow-[inset_1px_0_0_0_var(--border)]",
                  )}
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
              className="group/row even:bg-muted/20"
            >
              {row.getVisibleCells().map((cell) => {
                const cellSize = cell.column.getSize();
                const cellMinDef = cell.column.columnDef.minSize;
                const cellFloor =
                  typeof cellMinDef === "number" ? Math.max(cellSize, cellMinDef) : cellSize;
                const cellMeta = columnChromeMeta(cell.column);
                const stickyEnd = Boolean(cellMeta?.stickyEnd);
                const cellWidthStyle = stickyEnd
                  ? { width: `${cellSize}px`, minWidth: `${cellSize}px`, maxWidth: `${cellSize}px` }
                  : stretch && totalSize > 0
                    ? { minWidth: `${cellFloor}px` }
                    : { minWidth: `${cellSize}px` };
                const align = cellMeta?.headerAlign ?? "start";
                const alignClass = align === "end" ? "text-right" : align === "center" ? "text-center" : "text-left";
                const isSelected = row.getIsSelected();
                const stickyEndBg = isSelected
                  ? "bg-muted group-hover/row:bg-muted"
                  : row.index % 2 === 1
                    ? "bg-muted/20 group-hover/row:bg-muted/50"
                    : "bg-background group-hover/row:bg-muted/50";
                return (
                  <TableCell
                    key={cell.id}
                    style={cellWidthStyle}
                    className={cn(
                      "align-middle whitespace-nowrap",
                      alignClass,
                      stickyEnd &&
                      cn(
                        "sticky end-0 z-20 shadow-[inset_1px_0_0_0_var(--border)]",
                        stickyEndBg,
                      ),
                    )}
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
            "app-scrollbar-x-slim w-full min-h-0 overflow-x-auto rounded-md border",
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
