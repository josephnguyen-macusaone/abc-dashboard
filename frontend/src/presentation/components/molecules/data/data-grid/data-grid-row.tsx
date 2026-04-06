"use client";

import type {
  ColumnPinningState,
  Row,
  TableMeta,
  VisibilityState,
} from "@tanstack/react-table";
import type { VirtualItem, Virtualizer } from "@tanstack/react-virtual";
import * as React from "react";
import { DataGridCell } from "./data-grid-cell";
import { tableRowClass } from "@/presentation/components/atoms/primitives/table";
import { useComposedRefs } from "@/shared/lib/compose-refs";
import {
  flexRender,
  getCellKey,
  getRowHeightValue,
} from "@/shared/lib/data-grid";
import { cn } from "@/shared/helpers";
import {
  dataGridColumnShouldGrow,
  sameStretchColumnIds,
} from "./data-grid-column-flex";
import type {
  CellPosition,
  Direction,
  RowHeightValue,
} from "@/types/data-grid";

interface DataGridRowProps<TData> extends React.ComponentProps<"div"> {
  row: Row<TData>;
  tableMeta: TableMeta<TData>;
  rowVirtualizer: Virtualizer<HTMLDivElement, Element>;
  virtualItem: VirtualItem;
  rowMapRef: React.RefObject<Map<number, HTMLDivElement>>;
  rowHeight: RowHeightValue;
  focusedCell: CellPosition | null;
  editingCell: CellPosition | null;
  cellSelectionKeys?: Set<string>;
  columnVisibility?: VisibilityState;
  columnPinning?: ColumnPinningState;
  dir: Direction;
  readOnly: boolean;
  stretchColumns?: boolean;
  stretchColumnIds?: readonly string[];
}

export const DataGridRow = React.memo(DataGridRowImpl, (prev, next) => {
  if (prev.row.id !== next.row.id) {
    return false;
  }

  if (prev.row.original !== next.row.original) {
    return false;
  }

  if (prev.virtualItem.start !== next.virtualItem.start) {
    return false;
  }

  const prevRowIndex = prev.virtualItem.index;
  const nextRowIndex = next.virtualItem.index;

  const prevHasFocus = prev.focusedCell?.rowIndex === prevRowIndex;
  const nextHasFocus = next.focusedCell?.rowIndex === nextRowIndex;

  if (prevHasFocus !== nextHasFocus) {
    return false;
  }

  if (nextHasFocus && prevHasFocus) {
    if (prev.focusedCell?.columnId !== next.focusedCell?.columnId) {
      return false;
    }
  }

  const prevHasEditing = prev.editingCell?.rowIndex === prevRowIndex;
  const nextHasEditing = next.editingCell?.rowIndex === nextRowIndex;

  if (prevHasEditing !== nextHasEditing) {
    return false;
  }

  if (nextHasEditing && prevHasEditing) {
    if (prev.editingCell?.columnId !== next.editingCell?.columnId) {
      return false;
    }
  }

  if (prev.cellSelectionKeys !== next.cellSelectionKeys) {
    return false;
  }

  if (prev.columnVisibility !== next.columnVisibility) {
    return false;
  }

  if (prev.rowHeight !== next.rowHeight) {
    return false;
  }

  if (prev.columnPinning !== next.columnPinning) {
    return false;
  }

  if (prev.readOnly !== next.readOnly) {
    return false;
  }

  if (prev.stretchColumns !== next.stretchColumns) {
    return false;
  }

  if (!sameStretchColumnIds(prev.stretchColumnIds, next.stretchColumnIds)) {
    return false;
  }

  return true;
}) as typeof DataGridRowImpl;

function DataGridRowImpl<TData>({
  row,
  tableMeta,
  virtualItem,
  rowVirtualizer,
  rowMapRef,
  rowHeight,
  focusedCell,
  editingCell,
  cellSelectionKeys,
  columnVisibility: _columnVisibility,
  columnPinning: _columnPinning,
  readOnly,
  stretchColumns,
  stretchColumnIds,
  className,
  style,
  ref,
  ...props
}: DataGridRowProps<TData>) {
  void _columnVisibility;
  void _columnPinning;
  const virtualRowIndex = virtualItem.index;

  const onRowChange = React.useCallback(
    (node: HTMLDivElement | null) => {
      if (typeof virtualRowIndex === "undefined") return;

      if (node) {
        rowVirtualizer.measureElement(node);
        rowMapRef.current?.set(virtualRowIndex, node);
      } else {
        rowMapRef.current?.delete(virtualRowIndex);
      }
    },
    [virtualRowIndex, rowVirtualizer, rowMapRef],
  );

  const rowRef = useComposedRefs(ref, onRowChange);

  const isRowSelected = row.getIsSelected();

  const visibleCells = React.useMemo(() => row.getVisibleCells(), [row]);

  return (
    <div
      key={row.id}
      role="row"
      aria-rowindex={virtualRowIndex + 2}
      aria-selected={isRowSelected}
      data-index={virtualRowIndex}
      data-slot="grid-row"
      tabIndex={-1}
      {...props}
      ref={rowRef}
      className={cn(
        "absolute flex w-full will-change-transform",
        tableRowClass,
        "even:bg-muted/20",
        className,
      )}
      style={{
        height: `${getRowHeightValue(rowHeight)}px`,
        transform: `translateY(${virtualItem.start}px)`,
        ...style,
      }}
    >
      {visibleCells.map((cell, colIndex) => {
        const columnId = cell.column.id;
        const stickyEnd = cell.column.columnDef.meta?.stickyEnd;
        const rowStripeClass =
          virtualRowIndex % 2 === 1 ? "bg-muted/20" : "bg-background";
        const stickyEndBg = isRowSelected ? "bg-muted/50" : rowStripeClass;
        const isCellFocused =
          focusedCell?.rowIndex === virtualRowIndex &&
          focusedCell?.columnId === columnId;
        const isCellEditing =
          editingCell?.rowIndex === virtualRowIndex &&
          editingCell?.columnId === columnId;
        const isCellSelected =
          cellSelectionKeys?.has(getCellKey(virtualRowIndex, columnId)) ??
          false;

        return (
          <div
            key={cell.id}
            role="gridcell"
            aria-colindex={colIndex + 1}
            data-highlighted={isCellFocused ? "" : undefined}
            data-slot="grid-cell"
            tabIndex={-1}
            className={cn(
              "shrink-0",
              {
                grow: dataGridColumnShouldGrow(
                  columnId,
                  stretchColumns ?? false,
                  stretchColumnIds,
                ),
              },
              stickyEnd &&
                cn(
                  "sticky end-0 z-20 border-s border-border",
                  stickyEndBg,
                ),
            )}
            style={{
              width: `calc(var(--col-${columnId}-size) * 1px)`,
              minWidth: `calc(var(--col-${columnId}-size) * 1px)`,
            }}
          >
            {typeof cell.column.columnDef.header === "function" ? (
              <div
                className={cn("flex size-full items-center px-4", {
                  "bg-primary/10": isRowSelected,
                })}
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </div>
            ) : (
              <DataGridCell
                cell={cell}
                tableMeta={tableMeta}
                rowIndex={virtualRowIndex}
                columnId={columnId}
                isFocused={isCellFocused}
                isEditing={isCellEditing}
                isSelected={isCellSelected}
                readOnly={readOnly}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

