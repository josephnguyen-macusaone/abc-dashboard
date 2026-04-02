"use client";

import { Plus } from "lucide-react";
import * as React from "react";
import { DataGridColumnHeader } from "./data-grid-column-header";
import { DataGridRow } from "./data-grid-row";
import type { useDataGrid } from "@/presentation/hooks/use-data-grid";
import { TablePagination } from "../common/table-pagination";
import {
  tableFooterClass,
  tableHeadCellClass,
} from "@/presentation/components/atoms/primitives/table";
import { ScrollArea } from "@/presentation/components/atoms/primitives/scroll-area";
import { flexRender } from "@/shared/lib/data-grid";
import { cn } from "@/shared/helpers";
import type { Direction } from "@/types/data-grid";

interface DataGridProps<TData>
  extends Omit<ReturnType<typeof useDataGrid<TData>>, "dir">,
  Omit<React.ComponentProps<"div">, "contextMenu"> {
  dir?: Direction;
  height?: number;
  stretchColumns?: boolean;
}

export function DataGrid<TData>({
  dataGridRef,
  headerRef,
  rowMapRef,
  footerRef,
  dir = "ltr",
  table,
  tableMeta,
  rowVirtualizer,
  columns,
  columnSizeVars,
  cellSelectionMap,
  focusedCell,
  editingCell,
  rowHeight,
  onRowAdd,
  height = 600,
  stretchColumns = false,
  className,
  // Destructured so they are not spread onto the div (not valid DOM attributes)
  contextMenu: _contextMenu,
  pasteDialog: _pasteDialog,
  searchState: _searchState,
  ...props
}: DataGridProps<TData>) {
  void _contextMenu;
  void _pasteDialog;
  void _searchState;
  const rows = table.getPaginationRowModel().rows;
  const readOnly = tableMeta?.readOnly ?? false;
  const columnVisibility = table.getState().columnVisibility;
  const columnPinning = table.getState().columnPinning;

  const onGridContextMenu = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
    },
    [],
  );

  const onAddRowKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!onRowAdd) return;

      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onRowAdd();
      }
    },
    [onRowAdd],
  );

  return (
    <div
      data-slot="grid-wrapper"
      dir={dir}
      {...props}
      className={cn("relative flex w-full flex-col", className)}
    >
      <ScrollArea
        type="auto"
        className="w-full rounded-md border text-sm"
        style={{
          height: `${height}px`,
          maxHeight: `${height}px`,
        }}
        viewportRef={dataGridRef}
        viewportClassName="select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        viewportProps={{
          role: "grid",
          "aria-label": "Data grid",
          "aria-rowcount": rows.length + (onRowAdd ? 1 : 0),
          "aria-colcount": columns.length,
          tabIndex: 0,
          onContextMenu: onGridContextMenu,
        }}
      >
        <div
          data-slot="grid"
          className="relative grid select-none"
          style={columnSizeVars}
        >
          <div
            role="rowgroup"
            data-slot="grid-header"
            ref={headerRef}
            className="sticky top-0 z-10 grid border-b bg-muted [&_[role=row]]:border-b"
          >
            {table.getHeaderGroups().map((headerGroup, rowIndex) => (
              <div
                key={headerGroup.id}
                role="row"
                aria-rowindex={rowIndex + 1}
                data-slot="grid-header-row"
                tabIndex={-1}
                className="flex w-full transition-colors"
              >
                {headerGroup.headers.map((header, colIndex) => {
                  const sorting = table.getState().sorting;
                  const currentSort = sorting.find(
                    (sort) => sort.id === header.column.id,
                  );
                  const isSortable = header.column.getCanSort();

                  return (
                    <div
                      key={header.id}
                      role="columnheader"
                      aria-colindex={colIndex + 1}
                      aria-sort={
                        currentSort?.desc === false
                          ? "ascending"
                          : currentSort?.desc === true
                            ? "descending"
                            : isSortable
                              ? "none"
                              : undefined
                      }
                      data-slot="grid-header-cell"
                      tabIndex={-1}
                      className={cn("relative", {
                        grow: stretchColumns && header.column.id !== "select",
                      })}
                      style={{
                        width: `calc(var(--header-${header.id}-size) * 1px)`,
                      }}
                    >
                      {header.isPlaceholder ? null : typeof header.column
                        .columnDef.header === "function" ? (
                        <div className={cn("size-full", tableHeadCellClass)}>
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                        </div>
                      ) : (
                        <DataGridColumnHeader header={header} table={table} />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div
            role="rowgroup"
            data-slot="grid-body"
            className="relative grid"
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              contain: "strict",
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualItem) => {
              const row = rows[virtualItem.index];
              if (!row) return null;

              const cellSelectionKeys =
                cellSelectionMap?.get(virtualItem.index) ?? new Set<string>();

              return (
                <DataGridRow
                  key={row.id}
                  row={row}
                  tableMeta={tableMeta}
                  rowMapRef={rowMapRef}
                  virtualItem={virtualItem}
                  rowVirtualizer={rowVirtualizer}
                  rowHeight={rowHeight}
                  focusedCell={focusedCell}
                  editingCell={editingCell}
                  cellSelectionKeys={cellSelectionKeys}
                  columnVisibility={columnVisibility}
                  columnPinning={columnPinning}
                  dir={dir}
                  readOnly={readOnly}
                  stretchColumns={stretchColumns}
                />
              );
            })}
          </div>

          {onRowAdd && (
            <div
              role="rowgroup"
              data-slot="grid-footer"
              ref={footerRef}
              className={cn("sticky bottom-0 z-10 grid bg-muted", tableFooterClass)}
            >
              <div
                role="row"
                aria-rowindex={rows.length + 2}
                data-slot="grid-add-row"
                tabIndex={-1}
                className="flex w-full"
              >
                <div
                  role="gridcell"
                  tabIndex={0}
                  className="relative flex h-9 grow items-center bg-muted/30 transition-colors hover:bg-muted/50 focus:bg-muted/50 focus:outline-none"
                  style={{
                    width: table.getTotalSize(),
                    minWidth: table.getTotalSize(),
                  }}
                  onClick={onRowAdd}
                  onKeyDown={onAddRowKeyDown}
                >
                  <div className="sticky start-0 flex items-center gap-2 px-3 text-muted-foreground">
                    <Plus className="size-3.5" />
                    <span className="text-sm">Add row</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      <div className="mt-4 flex flex-col gap-2.5">
        <TablePagination table={table} />
      </div>
    </div>
  );
}

