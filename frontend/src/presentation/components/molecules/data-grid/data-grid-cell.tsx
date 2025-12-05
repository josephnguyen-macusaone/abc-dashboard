"use client";

import type { Cell, TableMeta } from "@tanstack/react-table";
import * as React from "react";

import {
  CheckboxCell,
  DateCell,
  MultiSelectCell,
  NumberCell,
  SelectCell,
  ShortTextCell,
} from "./data-grid-cell-variants";
import type { CellVariantProps } from "@/shared/types/data-grid";

interface DataGridCellProps<TData> {
  cell: Cell<TData, unknown>;
  tableMeta: TableMeta<TData>;
  rowIndex: number;
  columnId: string;
  isFocused: boolean;
  isEditing: boolean;
  isSelected: boolean;
  readOnly: boolean;
}

export const DataGridCell = React.memo(DataGridCellImpl, (prev, next) => {
  if (prev.isFocused !== next.isFocused) return false;
  if (prev.isEditing !== next.isEditing) return false;
  if (prev.isSelected !== next.isSelected) return false;
  if (prev.readOnly !== next.readOnly) return false;
  if (prev.rowIndex !== next.rowIndex) return false;
  if (prev.columnId !== next.columnId) return false;

  const prevValue = (prev.cell.row.original as Record<string, unknown>)[
    prev.columnId
  ];
  const nextValue = (next.cell.row.original as Record<string, unknown>)[
    next.columnId
  ];
  if (prevValue !== nextValue) {
    return false;
  }

  if (prev.cell.row.id !== next.cell.row.id) return false;

  return true;
}) as typeof DataGridCellImpl;

function DataGridCellImpl<TData>({
  cell,
  tableMeta,
  rowIndex,
  columnId,
  isFocused,
  isEditing,
  isSelected,
  readOnly,
}: DataGridCellProps<TData>) {
  const cellOpts = cell.column.columnDef.meta?.cell;
  const variant = cellOpts?.variant ?? "short-text";

  let Comp: React.ComponentType<CellVariantProps<TData>>;

  switch (variant) {
    case "short-text":
      Comp = ShortTextCell;
      break;
    case "number":
      Comp = NumberCell;
      break;
    case "checkbox":
      Comp = CheckboxCell as React.ComponentType<CellVariantProps<TData>>;
      break;
    case "select":
      Comp = SelectCell;
      break;
    case "multi-select":
      Comp = MultiSelectCell;
      break;
    case "date":
      Comp = DateCell;
      break;
    default:
      Comp = ShortTextCell;
      break;
  }

  return (
    <Comp
      cell={cell}
      tableMeta={tableMeta}
      rowIndex={rowIndex}
      columnId={columnId}
      isEditing={isEditing}
      isFocused={isFocused}
      isSelected={isSelected}
      readOnly={readOnly}
    />
  );
}

