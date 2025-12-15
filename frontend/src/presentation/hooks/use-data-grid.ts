"use client";

import { useDirection } from "@radix-ui/react-direction";
import {
  type ColumnDef,
  type ColumnFiltersState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type RowSelectionState,
  type SortingState,
  type TableMeta,
  type TableOptions,
  type TableState,
  type Updater,
  useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer, type Virtualizer } from "@tanstack/react-virtual";
import * as React from "react";
import { toast } from "sonner";
import {
  getCellKey,
  getIsFileCellData,
  getIsInPopover,
  getRowHeightValue,
  getScrollDirection,
  matchSelectOption,
  parseCellKey,
  scrollCellIntoView,
} from "@/shared/lib/data-grid";
import type {
  CellPosition,
  ContextMenuState,
  Direction,
  FileCellData,
  NavigationDirection,
  PasteDialogState,
  RowHeightValue,
  SearchState,
  SelectionState,
  UpdateCell,
} from "@/shared/types/data-grid";

const DEFAULT_ROW_HEIGHT = "short";
const OVERSCAN = 6;
const VIEWPORT_OFFSET = 1;
const HORIZONTAL_PAGE_SIZE = 5;

const MIN_COLUMN_SIZE = 60;
const MAX_COLUMN_SIZE = 800;
const SEARCH_SHORTCUT_KEY = "f";
const NON_NAVIGABLE_COLUMN_IDS = ["select", "actions"];

const DOMAIN_REGEX = /^[\w.-]+\.[a-z]{2,}(\/\S*)?$/i;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}.*)?$/;
const TRUTHY_BOOLEANS = new Set(["true", "1", "yes", "checked"]);
const VALID_BOOLEANS = new Set([
  "true",
  "false",
  "1",
  "0",
  "yes",
  "no",
  "checked",
  "unchecked",
]);

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

function useLazyRef<T>(fn: () => T): React.RefObject<T> {
  const ref = React.useRef<T | null>(null);
  if (ref.current === null) {
    ref.current = fn();
  }
  return ref as React.RefObject<T>;
}

function useAsRef<T>(data: T) {
  const ref = React.useRef<T>(data);

  useIsomorphicLayoutEffect(() => {
    ref.current = data;
  });

  return ref;
}

interface DataGridState {
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  rowHeight: RowHeightValue;
  rowSelection: RowSelectionState;
  selectionState: SelectionState;
  focusedCell: CellPosition | null;
  editingCell: CellPosition | null;
  cutCells: Set<string>;
  contextMenu: ContextMenuState;
  searchQuery: string;
  searchMatches: CellPosition[];
  matchIndex: number;
  searchOpen: boolean;
  lastClickedRowIndex: number | null;
  pasteDialog: PasteDialogState;
  isProcessingDataUpdate: boolean;
  pagination: {
    pageIndex: number;
    pageSize: number;
  };
}

interface DataGridStore {
  subscribe: (callback: () => void) => () => void;
  getState: () => DataGridState;
  setState: <K extends keyof DataGridState>(
    key: K,
    value: DataGridState[K],
  ) => void;
  notify: () => void;
  batch: (fn: () => void) => void;
}

function useStore<T>(
  store: DataGridStore,
  selector: (state: DataGridState) => T,
): T {
  const getSnapshot = React.useCallback(
    () => selector(store.getState()),
    [store, selector],
  );

  return React.useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}

interface UseDataGridProps<TData>
  extends Omit<TableOptions<TData>, "pageCount" | "getCoreRowModel"> {
  onDataChange?: (data: TData[]) => void;
  onRowAdd?: (event?: React.MouseEvent<HTMLDivElement>) =>
    | Partial<CellPosition>
    | Promise<Partial<CellPosition>>
    | null
    | void;
  onRowsAdd?: (count: number) => void | Promise<void>;
  onRowsDelete?: (rows: TData[], rowIndices: number[]) => void | Promise<void>;
  onPaste?: (updates: Array<UpdateCell>) => void | Promise<void>;
  onFilesUpload?: (params: {
    files: File[];
    rowIndex: number;
    columnId: string;
  }) => Promise<FileCellData[]>;
  onFilesDelete?: (params: {
    fileIds: string[];
    rowIndex: number;
    columnId: string;
  }) => void | Promise<void>;
  overscan?: number;
  rowHeight?: RowHeightValue;
  dir?: Direction;
  autoFocus?: boolean | Partial<CellPosition>;
  enableColumnSelection?: boolean;
  enableSearch?: boolean;
  enablePaste?: boolean;
  readOnly?: boolean;
  pageCount?: number;
  manualPagination?: boolean;
  manualSorting?: boolean;
  manualFiltering?: boolean;
  totalRows?: number;
  onQueryChange?: (params: {
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    filters?: Record<string, unknown>;
    search?: string;
  }) => void;
}

function useDataGrid<TData>({
  data,
  columns,
  overscan = OVERSCAN,
  rowHeight: rowHeightProp = DEFAULT_ROW_HEIGHT,
  dir: dirProp,
  initialState,
  pageCount = -1,
  manualPagination = false,
  manualSorting = false,
  manualFiltering = false,
  totalRows,
  onQueryChange,
  ...props
}: UseDataGridProps<TData>) {
  const dir = useDirection(dirProp);
  const dataGridRef = React.useRef<HTMLDivElement>(null);
  const tableRef = React.useRef<ReturnType<typeof useReactTable<TData>>>(null);
  const rowVirtualizerRef =
    React.useRef<Virtualizer<HTMLDivElement, Element>>(null);
  const headerRef = React.useRef<HTMLDivElement>(null);
  const rowMapRef = React.useRef<Map<number, HTMLDivElement>>(new Map());
  const cellMapRef = React.useRef<Map<string, HTMLDivElement>>(new Map());
  const footerRef = React.useRef<HTMLDivElement>(null);

  const propsRef = useAsRef({
    ...props,
    data,
    columns,
    initialState,
  });
  const listenersRef = useLazyRef(() => new Set<() => void>());

  const stateRef = useLazyRef<DataGridState>(() => {
    return {
      sorting: initialState?.sorting ?? [],
      columnFilters: initialState?.columnFilters ?? [],
      rowHeight: rowHeightProp,
      rowSelection: initialState?.rowSelection ?? {},
      selectionState: {
        selectedCells: new Set(),
        selectionRange: null,
        isSelecting: false,
      },
      focusedCell: null,
      editingCell: null,
      cutCells: new Set(),
      contextMenu: {
        open: false,
        x: 0,
        y: 0,
      },
      searchQuery: "",
      searchMatches: [],
      matchIndex: -1,
      searchOpen: false,
      lastClickedRowIndex: null,
      isProcessingDataUpdate: false,
      pasteDialog: {
        open: false,
        rowsNeeded: 0,
        clipboardText: "",
      },
      pagination: {
        pageIndex: 0,
        pageSize: 20,
      },
    };
  });

  const store = React.useMemo<DataGridStore>(() => {
    let isBatching = false;
    let pendingNotification = false;

    return {
      subscribe: (callback) => {
        listenersRef.current.add(callback);
        return () => listenersRef.current.delete(callback);
      },
      getState: () => stateRef.current,
      setState: (key, value) => {
        if (Object.is(stateRef.current[key], value)) return;
        stateRef.current[key] = value;

        if (isBatching) {
          pendingNotification = true;
        } else {
          if (!pendingNotification) {
            pendingNotification = true;
            queueMicrotask(() => {
              pendingNotification = false;
              store.notify();
            });
          }
        }
      },
      notify: () => {
        for (const listener of listenersRef.current) {
          listener();
        }
      },
      batch: (fn) => {
        if (isBatching) {
          fn();
          return;
        }

        isBatching = true;
        const wasPending = pendingNotification;
        pendingNotification = false;

        try {
          fn();
        } finally {
          isBatching = false;
          if (pendingNotification || wasPending) {
            pendingNotification = false;
            store.notify();
          }
        }
      },
    };
  }, [listenersRef, stateRef]);

  const focusedCell = useStore(store, (state) => state.focusedCell);
  const editingCell = useStore(store, (state) => state.editingCell);
  const selectionState = useStore(store, (state) => state.selectionState);
  const searchQuery = useStore(store, (state) => state.searchQuery);
  const searchMatches = useStore(store, (state) => state.searchMatches);
  const matchIndex = useStore(store, (state) => state.matchIndex);
  const searchOpen = useStore(store, (state) => state.searchOpen);
  const sorting = useStore(store, (state) => state.sorting);
  const columnFilters = useStore(store, (state) => state.columnFilters);
  const rowSelection = useStore(store, (state) => state.rowSelection);
  const rowHeight = useStore(store, (state) => state.rowHeight);
  const contextMenu = useStore(store, (state) => state.contextMenu);
  const pasteDialog = useStore(store, (state) => state.pasteDialog);
  const pagination = useStore(store, (state) => state.pagination);

  const rowHeightValue = getRowHeightValue(rowHeight);

  const prevCellSelectionMapRef = useLazyRef(
    () => new Map<number, Set<string>>(),
  );

  const cellSelectionMap = React.useMemo(() => {
    const selectedCells = selectionState.selectedCells;

    if (selectedCells.size === 0) {
      prevCellSelectionMapRef.current.clear();
      return null;
    }

    const newRowCells = new Map<number, Set<string>>();
    for (const cellKey of selectedCells) {
      const { rowIndex } = parseCellKey(cellKey);
      let rowSet = newRowCells.get(rowIndex);
      if (!rowSet) {
        rowSet = new Set<string>();
        newRowCells.set(rowIndex, rowSet);
      }
      rowSet.add(cellKey);
    }

    const stableMap = new Map<number, Set<string>>();
    for (const [rowIndex, newSet] of newRowCells) {
      const prevSet = prevCellSelectionMapRef.current.get(rowIndex);
      if (
        prevSet &&
        prevSet.size === newSet.size &&
        [...newSet].every((key) => prevSet.has(key))
      ) {
        stableMap.set(rowIndex, prevSet);
      } else {
        stableMap.set(rowIndex, newSet);
      }
    }

    prevCellSelectionMapRef.current = stableMap;
    return stableMap;
  }, [selectionState.selectedCells, prevCellSelectionMapRef]);

  const columnIds = React.useMemo(() => {
    return columns
      .map((c) => {
        if (c.id) return c.id;
        if ("accessorKey" in c) return c.accessorKey as string;
        return undefined;
      })
      .filter((id): id is string => Boolean(id));
  }, [columns]);

  const navigableColumnIds = React.useMemo(() => {
    return columnIds.filter((c) => !NON_NAVIGABLE_COLUMN_IDS.includes(c));
  }, [columnIds]);

  const onDataUpdate = React.useCallback(
    (updates: UpdateCell | Array<UpdateCell>) => {
      if (propsRef.current.readOnly) return;

      const updateArray = Array.isArray(updates) ? updates : [updates];

      if (updateArray.length === 0) return;

      // Set flag to indicate we're processing a data update
      store.setState("isProcessingDataUpdate", true);

      const currentTable = tableRef.current;
      const currentData = propsRef.current.data;
      const rows = currentTable?.getRowModel().rows;

      const rowUpdatesMap = new Map<
        number,
        Array<Omit<UpdateCell, "rowIndex">>
      >();

      for (const update of updateArray) {
        if (!rows || !currentTable) {
          const existingUpdates = rowUpdatesMap.get(update.rowIndex) ?? [];
          existingUpdates.push({
            columnId: update.columnId,
            value: update.value,
          });
          rowUpdatesMap.set(update.rowIndex, existingUpdates);
        } else {
          const row = rows[update.rowIndex];
          if (!row) continue;

          const originalData = row.original;
          const originalRowIndex = currentData.indexOf(originalData);

          const targetIndex =
            originalRowIndex !== -1 ? originalRowIndex : update.rowIndex;

          const existingUpdates = rowUpdatesMap.get(targetIndex) ?? [];
          existingUpdates.push({
            columnId: update.columnId,
            value: update.value,
          });
          rowUpdatesMap.set(targetIndex, existingUpdates);
        }
      }

      const tableRowCount = rows?.length ?? currentData.length;
      const newData: TData[] = new Array(tableRowCount);

      for (let i = 0; i < tableRowCount; i++) {
        const updates = rowUpdatesMap.get(i);
        const existingRow = currentData[i];
        const tableRow = rows?.[i];

        if (updates) {
          const baseRow = existingRow ?? tableRow?.original ?? ({} as TData);
          const updatedRow = { ...baseRow } as Record<string, unknown>;
          for (const { columnId, value } of updates) {
            updatedRow[columnId] = value;
          }
          newData[i] = updatedRow as TData;
        } else {
          newData[i] = existingRow ?? tableRow?.original ?? ({} as TData);
        }
      }

      propsRef.current.onDataChange?.(newData);

      // Reset flag after data change is processed
      requestAnimationFrame(() => {
        store.setState("isProcessingDataUpdate", false);
      });
    },
    [propsRef, store],
  );

  const getIsCellSelected = React.useCallback(
    (rowIndex: number, columnId: string) => {
      return selectionState.selectedCells.has(getCellKey(rowIndex, columnId));
    },
    [selectionState.selectedCells],
  );

  const clearSelection = React.useCallback(() => {
    store.batch(() => {
      store.setState("selectionState", {
        selectedCells: new Set(),
        selectionRange: null,
        isSelecting: false,
      });
      store.setState("rowSelection", {});
    });
  }, [store]);

  const selectAll = React.useCallback(() => {
    const allCells = new Set<string>();
    const currentTable = tableRef.current;
    const rows = currentTable?.getRowModel().rows ?? [];
    const rowCount = rows.length ?? propsRef.current.data.length;

    for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
      for (const columnId of columnIds) {
        allCells.add(getCellKey(rowIndex, columnId));
      }
    }

    const firstColumnId = columnIds[0];
    const lastColumnId = columnIds[columnIds.length - 1];

    store.setState("selectionState", {
      selectedCells: allCells,
      selectionRange:
        columnIds.length > 0 && rowCount > 0 && firstColumnId && lastColumnId
          ? {
              start: { rowIndex: 0, columnId: firstColumnId },
              end: { rowIndex: rowCount - 1, columnId: lastColumnId },
            }
          : null,
      isSelecting: false,
    });
  }, [columnIds, propsRef, store]);

  const selectColumn = React.useCallback(
    (columnId: string) => {
      const currentTable = tableRef.current;
      const rows = currentTable?.getRowModel().rows ?? [];
      const rowCount = rows.length ?? propsRef.current.data.length;

      if (rowCount === 0) return;

      const selectedCells = new Set<string>();

      for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
        selectedCells.add(getCellKey(rowIndex, columnId));
      }

      store.setState("selectionState", {
        selectedCells,
        selectionRange: {
          start: { rowIndex: 0, columnId },
          end: { rowIndex: rowCount - 1, columnId },
        },
        isSelecting: false,
      });
    },
    [propsRef, store],
  );

  const selectRange = React.useCallback(
    (start: CellPosition, end: CellPosition, isSelecting = false) => {
      const startColIndex = columnIds.indexOf(start.columnId);
      const endColIndex = columnIds.indexOf(end.columnId);

      const minRow = Math.min(start.rowIndex, end.rowIndex);
      const maxRow = Math.max(start.rowIndex, end.rowIndex);
      const minCol = Math.min(startColIndex, endColIndex);
      const maxCol = Math.max(startColIndex, endColIndex);

      const selectedCells = new Set<string>();

      for (let rowIndex = minRow; rowIndex <= maxRow; rowIndex++) {
        for (let colIndex = minCol; colIndex <= maxCol; colIndex++) {
          const columnId = columnIds[colIndex];
          if (columnId) {
            selectedCells.add(getCellKey(rowIndex, columnId));
          }
        }
      }

      store.setState("selectionState", {
        selectedCells,
        selectionRange: { start, end },
        isSelecting,
      });
    },
    [columnIds, store],
  );

  const onCellsCopy = React.useCallback(async () => {
    const currentState = store.getState();

    let selectedCellsArray: string[];
    if (!currentState.selectionState.selectedCells.size) {
      if (!currentState.focusedCell) return;
      const focusedCellKey = getCellKey(
        currentState.focusedCell.rowIndex,
        currentState.focusedCell.columnId,
      );
      selectedCellsArray = [focusedCellKey];
    } else {
      selectedCellsArray = Array.from(
        currentState.selectionState.selectedCells,
      );
    }

    const currentTable = tableRef.current;
    const rows = currentTable?.getRowModel().rows;
    if (!rows) return;

    const selectedColumnIds: string[] = [];

    for (const cellKey of selectedCellsArray) {
      const { columnId } = parseCellKey(cellKey);
      if (columnId && !selectedColumnIds.includes(columnId)) {
        selectedColumnIds.push(columnId);
      }
    }

    const cellData = new Map<string, string>();
    for (const cellKey of selectedCellsArray) {
      const { rowIndex, columnId } = parseCellKey(cellKey);
      const row = rows[rowIndex];
      if (row) {
        const cell = row
          .getVisibleCells()
          .find((c) => c.column.id === columnId);
        if (cell) {
          const value = cell.getValue();
          const cellVariant = cell.column.columnDef?.meta?.cell?.variant;

          let serializedValue = "";
          if (cellVariant === "file" || cellVariant === "multi-select") {
            serializedValue = value ? JSON.stringify(value) : "";
          } else if (value instanceof Date) {
            serializedValue = value.toISOString();
          } else {
            serializedValue = String(value ?? "");
          }

          cellData.set(cellKey, serializedValue);
        }
      }
    }

    const rowIndices = new Set<number>();
    const colIndices = new Set<number>();

    for (const cellKey of selectedCellsArray) {
      const { rowIndex, columnId } = parseCellKey(cellKey);
      rowIndices.add(rowIndex);
      const colIndex = selectedColumnIds.indexOf(columnId);
      if (colIndex >= 0) {
        colIndices.add(colIndex);
      }
    }

    const sortedRowIndices = Array.from(rowIndices).sort((a, b) => a - b);
    const sortedColIndices = Array.from(colIndices).sort((a, b) => a - b);
    const sortedColumnIds = sortedColIndices.map((i) => selectedColumnIds[i]);

    const tsvData = sortedRowIndices
      .map((rowIndex) =>
        sortedColumnIds
          .map((columnId) => {
            const cellKey = `${rowIndex}:${columnId}`;
            return cellData.get(cellKey) ?? "";
          })
          .join("\t"),
      )
      .join("\n");

    try {
      await navigator.clipboard.writeText(tsvData);

      const currentState = store.getState();
      if (currentState.cutCells.size > 0) {
        store.setState("cutCells", new Set());
      }

      toast.success(
        `${selectedCellsArray.length} cell${
          selectedCellsArray.length !== 1 ? "s" : ""
        } copied`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to copy to clipboard",
      );
    }
  }, [store]);

  const onCellsCut = React.useCallback(async () => {
    if (propsRef.current.readOnly) return;

    const currentState = store.getState();

    let selectedCellsArray: string[];
    if (!currentState.selectionState.selectedCells.size) {
      if (!currentState.focusedCell) return;
      const focusedCellKey = getCellKey(
        currentState.focusedCell.rowIndex,
        currentState.focusedCell.columnId,
      );
      selectedCellsArray = [focusedCellKey];
    } else {
      selectedCellsArray = Array.from(
        currentState.selectionState.selectedCells,
      );
    }

    const currentTable = tableRef.current;
    const rows = currentTable?.getRowModel().rows;
    if (!rows) return;

    const selectedColumnIds: string[] = [];

    for (const cellKey of selectedCellsArray) {
      const { columnId } = parseCellKey(cellKey);
      if (columnId && !selectedColumnIds.includes(columnId)) {
        selectedColumnIds.push(columnId);
      }
    }

    const cellData = new Map<string, string>();
    for (const cellKey of selectedCellsArray) {
      const { rowIndex, columnId } = parseCellKey(cellKey);
      const row = rows[rowIndex];
      if (row) {
        const cell = row
          .getVisibleCells()
          .find((c) => c.column.id === columnId);
        if (cell) {
          const value = cell.getValue();
          const cellVariant = cell.column.columnDef?.meta?.cell?.variant;

          let serializedValue = "";
          if (cellVariant === "file" || cellVariant === "multi-select") {
            serializedValue = value ? JSON.stringify(value) : "";
          } else if (value instanceof Date) {
            serializedValue = value.toISOString();
          } else {
            serializedValue = String(value ?? "");
          }

          cellData.set(cellKey, serializedValue);
        }
      }
    }

    const rowIndices = new Set<number>();
    const colIndices = new Set<number>();

    for (const cellKey of selectedCellsArray) {
      const { rowIndex, columnId } = parseCellKey(cellKey);
      rowIndices.add(rowIndex);
      const colIndex = selectedColumnIds.indexOf(columnId);
      if (colIndex >= 0) {
        colIndices.add(colIndex);
      }
    }

    const sortedRowIndices = Array.from(rowIndices).sort((a, b) => a - b);
    const sortedColIndices = Array.from(colIndices).sort((a, b) => a - b);
    const sortedColumnIds = sortedColIndices.map((i) => selectedColumnIds[i]);

    const tsvData = sortedRowIndices
      .map((rowIndex) =>
        sortedColumnIds
          .map((columnId) => {
            const cellKey = `${rowIndex}:${columnId}`;
            return cellData.get(cellKey) ?? "";
          })
          .join("\t"),
      )
      .join("\n");

    try {
      await navigator.clipboard.writeText(tsvData);

      store.setState("cutCells", new Set(selectedCellsArray));

      toast.success(
        `${selectedCellsArray.length} cell${
          selectedCellsArray.length !== 1 ? "s" : ""
        } cut`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to cut to clipboard",
      );
    }
  }, [store, propsRef]);

  const focusCellWrapper = React.useCallback(
    (rowIndex: number, columnId: string) => {
      requestAnimationFrame(() => {
        const cellKey = getCellKey(rowIndex, columnId);
        const cellWrapperElement = cellMapRef.current.get(cellKey);

        if (!cellWrapperElement) {
          const container = dataGridRef.current;
          if (container) {
            container.focus();
          }
          return;
        }

        cellWrapperElement.focus();
      });
    },
    [],
  );

  const focusCell = React.useCallback(
    (rowIndex: number, columnId: string) => {
      store.batch(() => {
        store.setState("focusedCell", { rowIndex, columnId });
        store.setState("editingCell", null);
      });

      const currentState = store.getState();

      if (currentState.searchOpen) return;

      focusCellWrapper(rowIndex, columnId);
    },
    [store, focusCellWrapper],
  );

  const restoreFocus = React.useCallback((element: HTMLDivElement | null) => {
    if (element && document.activeElement !== element) {
      requestAnimationFrame(() => {
        element.focus();
      });
    }
  }, []);

  const onRowsDelete = React.useCallback(
    async (rowIndices: number[]) => {
      if (
        propsRef.current.readOnly ||
        !propsRef.current.onRowsDelete ||
        rowIndices.length === 0
      )
        return;

      const currentTable = tableRef.current;
      const rows = currentTable?.getRowModel().rows;

      if (!rows || rows.length === 0) return;

      const currentState = store.getState();
      const currentFocusedColumn =
        currentState.focusedCell?.columnId ?? navigableColumnIds[0];

      const minDeletedRowIndex = Math.min(...rowIndices);

      const rowsToDelete: TData[] = [];
      for (const rowIndex of rowIndices) {
        const row = rows[rowIndex];
        if (row) {
          rowsToDelete.push(row.original);
        }
      }

      await propsRef.current.onRowsDelete(rowsToDelete, rowIndices);

      store.batch(() => {
        store.setState("selectionState", {
          selectedCells: new Set(),
          selectionRange: null,
          isSelecting: false,
        });
        store.setState("rowSelection", {});
        store.setState("editingCell", null);
      });

      requestAnimationFrame(() => {
        const currentTable = tableRef.current;
        const currentRows = currentTable?.getRowModel().rows ?? [];
        const newRowCount = currentRows.length ?? propsRef.current.data.length;

        if (newRowCount > 0 && currentFocusedColumn) {
          const targetRowIndex = Math.min(minDeletedRowIndex, newRowCount - 1);
          focusCell(targetRowIndex, currentFocusedColumn);
        }
      });
    },
    [propsRef, store, navigableColumnIds, focusCell],
  );

  const navigateCell = React.useCallback(
    (direction: NavigationDirection) => {
      const currentState = store.getState();
      if (!currentState.focusedCell) return;

      const { rowIndex, columnId } = currentState.focusedCell;
      const currentColIndex = navigableColumnIds.indexOf(columnId);
      const rowVirtualizer = rowVirtualizerRef.current;
      const currentTable = tableRef.current;
      const rows = currentTable?.getRowModel().rows ?? [];
      const rowCount = rows.length ?? propsRef.current.data.length;

      let newRowIndex = rowIndex;
      let newColumnId = columnId;

      const isRtl = dir === "rtl";

      switch (direction) {
        case "up":
          newRowIndex = Math.max(0, rowIndex - 1);
          break;
        case "down":
          newRowIndex = Math.min(rowCount - 1, rowIndex + 1);
          break;
        case "left":
          if (isRtl) {
            if (currentColIndex < navigableColumnIds.length - 1) {
              const nextColumnId = navigableColumnIds[currentColIndex + 1];
              if (nextColumnId) newColumnId = nextColumnId;
            }
          } else {
            if (currentColIndex > 0) {
              const prevColumnId = navigableColumnIds[currentColIndex - 1];
              if (prevColumnId) newColumnId = prevColumnId;
            }
          }
          break;
        case "right":
          if (isRtl) {
            if (currentColIndex > 0) {
              const prevColumnId = navigableColumnIds[currentColIndex - 1];
              if (prevColumnId) newColumnId = prevColumnId;
            }
          } else {
            if (currentColIndex < navigableColumnIds.length - 1) {
              const nextColumnId = navigableColumnIds[currentColIndex + 1];
              if (nextColumnId) newColumnId = nextColumnId;
            }
          }
          break;
        case "home":
          if (navigableColumnIds.length > 0) {
            newColumnId = navigableColumnIds[0] ?? columnId;
          }
          break;
        case "end":
          if (navigableColumnIds.length > 0) {
            newColumnId =
              navigableColumnIds[navigableColumnIds.length - 1] ?? columnId;
          }
          break;
        case "ctrl+home":
          newRowIndex = 0;
          if (navigableColumnIds.length > 0) {
            newColumnId = navigableColumnIds[0] ?? columnId;
          }
          break;
        case "ctrl+end":
          newRowIndex = Math.max(0, rowCount - 1);
          if (navigableColumnIds.length > 0) {
            newColumnId =
              navigableColumnIds[navigableColumnIds.length - 1] ?? columnId;
          }
          break;
        case "ctrl+up":
          newRowIndex = 0;
          break;
        case "ctrl+down":
          newRowIndex = Math.max(0, rowCount - 1);
          break;
        case "pageup":
          if (rowVirtualizer) {
            const visibleRange = rowVirtualizer.getVirtualItems();
            const pageSize = visibleRange.length ?? 10;
            newRowIndex = Math.max(0, rowIndex - pageSize);
          } else {
            newRowIndex = Math.max(0, rowIndex - 10);
          }
          break;
        case "pagedown":
          if (rowVirtualizer) {
            const visibleRange = rowVirtualizer.getVirtualItems();
            const pageSize = visibleRange.length ?? 10;
            newRowIndex = Math.min(rowCount - 1, rowIndex + pageSize);
          } else {
            newRowIndex = Math.min(rowCount - 1, rowIndex + 10);
          }
          break;
        case "pageleft":
          if (currentColIndex > 0) {
            const targetIndex = Math.max(
              0,
              currentColIndex - HORIZONTAL_PAGE_SIZE,
            );
            const targetColumnId = navigableColumnIds[targetIndex];
            if (targetColumnId) newColumnId = targetColumnId;
          }
          break;
        case "pageright":
          if (currentColIndex < navigableColumnIds.length - 1) {
            const targetIndex = Math.min(
              navigableColumnIds.length - 1,
              currentColIndex + HORIZONTAL_PAGE_SIZE,
            );
            const targetColumnId = navigableColumnIds[targetIndex];
            if (targetColumnId) newColumnId = targetColumnId;
          }
          break;
      }

      if (newRowIndex !== rowIndex || newColumnId !== columnId) {
        focusCell(newRowIndex, newColumnId);

        const container = dataGridRef.current;
        if (!container) return;

        const targetRow = rowMapRef.current.get(newRowIndex);
        const cellKey = getCellKey(newRowIndex, newColumnId);
        const targetCell = cellMapRef.current.get(cellKey);

        if (!targetRow) {
          if (rowVirtualizer) {
            const align =
              direction === "up" ||
              direction === "pageup" ||
              direction === "ctrl+up" ||
              direction === "ctrl+home"
                ? "start"
                : direction === "down" ||
                    direction === "pagedown" ||
                    direction === "ctrl+down" ||
                    direction === "ctrl+end"
                  ? "end"
                  : "center";

            rowVirtualizer.scrollToIndex(newRowIndex, { align });

            if (newColumnId !== columnId) {
              requestAnimationFrame(() => {
                const cellKeyRetry = getCellKey(newRowIndex, newColumnId);
                const targetCellRetry = cellMapRef.current.get(cellKeyRetry);

                if (targetCellRetry) {
                  const scrollDirection = getScrollDirection(direction);

                  scrollCellIntoView({
                    container,
                    targetCell: targetCellRetry,
                    tableRef,
                    viewportOffset: VIEWPORT_OFFSET,
                    direction: scrollDirection,
                    isRtl: dir === "rtl",
                  });
                }
              });
            }
          } else {
            const rowHeightValue = getRowHeightValue(rowHeight);
            const estimatedScrollTop = newRowIndex * rowHeightValue;
            container.scrollTop = estimatedScrollTop;
          }

          return;
        }

        if (newRowIndex !== rowIndex && targetRow) {
          requestAnimationFrame(() => {
            const containerRect = container.getBoundingClientRect();
            const headerHeight =
              headerRef.current?.getBoundingClientRect().height ?? 0;
            const footerHeight =
              footerRef.current?.getBoundingClientRect().height ?? 0;
            const viewportTop =
              containerRect.top + headerHeight + VIEWPORT_OFFSET;
            const viewportBottom =
              containerRect.bottom - footerHeight - VIEWPORT_OFFSET;

            const rowRect = targetRow.getBoundingClientRect();
            const isFullyVisible =
              rowRect.top >= viewportTop && rowRect.bottom <= viewportBottom;

            if (!isFullyVisible) {
              const isVerticalNavigation =
                direction === "up" ||
                direction === "down" ||
                direction === "pageup" ||
                direction === "pagedown" ||
                direction === "ctrl+up" ||
                direction === "ctrl+down" ||
                direction === "ctrl+home" ||
                direction === "ctrl+end";

              if (isVerticalNavigation) {
                if (
                  direction === "down" ||
                  direction === "pagedown" ||
                  direction === "ctrl+down" ||
                  direction === "ctrl+end"
                ) {
                  container.scrollTop += rowRect.bottom - viewportBottom;
                } else {
                  container.scrollTop -= viewportTop - rowRect.top;
                }
              }
            }
          });
        }

        if (newColumnId !== columnId && targetCell) {
          requestAnimationFrame(() => {
            const scrollDirection = getScrollDirection(direction);

            scrollCellIntoView({
              container,
              targetCell,
              tableRef,
              viewportOffset: VIEWPORT_OFFSET,
              direction: scrollDirection,
              isRtl: dir === "rtl",
            });
          });
        }
      }
    },
    [dir, store, navigableColumnIds, focusCell, propsRef, rowHeight],
  );

  const onCellEditingStart = React.useCallback(
    (rowIndex: number, columnId: string) => {
      if (propsRef.current.readOnly) return;

      store.batch(() => {
        store.setState("focusedCell", { rowIndex, columnId });
        store.setState("editingCell", { rowIndex, columnId });
      });
    },
    [store, propsRef],
  );

  const onCellEditingStop = React.useCallback(
    (opts?: { moveToNextRow?: boolean; direction?: NavigationDirection }) => {
      const currentState = store.getState();
      const currentEditing = currentState.editingCell;

      store.setState("editingCell", null);

      if (opts?.moveToNextRow && currentEditing) {
        const { rowIndex, columnId } = currentEditing;
        const currentTable = tableRef.current;
        const rows = currentTable?.getRowModel().rows ?? [];
        const rowCount = rows.length ?? propsRef.current.data.length;

        const nextRowIndex = rowIndex + 1;
        if (nextRowIndex < rowCount) {
          requestAnimationFrame(() => {
            focusCell(nextRowIndex, columnId);
          });
        }
      } else if (opts?.direction && currentEditing) {
        const { rowIndex, columnId } = currentEditing;
        focusCell(rowIndex, columnId);
        requestAnimationFrame(() => {
          navigateCell(opts.direction ?? "right");
        });
      } else if (currentEditing) {
        const { rowIndex, columnId } = currentEditing;
        focusCellWrapper(rowIndex, columnId);
      }
    },
    [store, propsRef, focusCell, navigateCell, focusCellWrapper],
  );

  const onSearchOpenChange = React.useCallback(
    (open: boolean) => {
      if (open) {
        store.setState("searchOpen", true);
        return;
      }

      const currentState = store.getState();
      const currentMatch =
        currentState.matchIndex >= 0 &&
        currentState.searchMatches[currentState.matchIndex];

      store.batch(() => {
        store.setState("searchOpen", false);
        store.setState("searchQuery", "");
        store.setState("searchMatches", []);
        store.setState("matchIndex", -1);

        if (currentMatch) {
          store.setState("focusedCell", {
            rowIndex: currentMatch.rowIndex,
            columnId: currentMatch.columnId,
          });
        }
      });

      if (
        dataGridRef.current &&
        document.activeElement !== dataGridRef.current
      ) {
        dataGridRef.current.focus();
      }
    },
    [store],
  );

  const onSearch = React.useCallback(
    (query: string) => {
      if (!query.trim()) {
        store.batch(() => {
          store.setState("searchMatches", []);
          store.setState("matchIndex", -1);
        });
        return;
      }

      const matches: CellPosition[] = [];
      const currentTable = tableRef.current;
      const rows = currentTable?.getRowModel().rows ?? [];

      const lowerQuery = query.toLowerCase();

      for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        const row = rows[rowIndex];
        if (!row) continue;

        for (const columnId of columnIds) {
          const cell = row
            .getVisibleCells()
            .find((c) => c.column.id === columnId);
          if (!cell) continue;

          const value = cell.getValue();
          const stringValue = String(value ?? "").toLowerCase();

          if (stringValue.includes(lowerQuery)) {
            matches.push({ rowIndex, columnId });
          }
        }
      }

      store.batch(() => {
        store.setState("searchMatches", matches);
        store.setState("matchIndex", matches.length > 0 ? 0 : -1);
      });

      if (matches.length > 0 && matches[0]) {
        const firstMatch = matches[0];
        rowVirtualizerRef.current?.scrollToIndex(firstMatch.rowIndex, {
          align: "center",
        });
      }
    },
    [columnIds, store],
  );

  const onSearchQueryChange = React.useCallback(
    (query: string) => store.setState("searchQuery", query),
    [store],
  );

  const onNavigateToPrevMatch = React.useCallback(() => {
    const currentState = store.getState();
    if (currentState.searchMatches.length === 0) return;

    const prevIndex =
      currentState.matchIndex - 1 < 0
        ? currentState.searchMatches.length - 1
        : currentState.matchIndex - 1;
    const match = currentState.searchMatches[prevIndex];

    if (match) {
      rowVirtualizerRef.current?.scrollToIndex(match.rowIndex, {
        align: "center",
      });

      requestAnimationFrame(() => {
        store.setState("matchIndex", prevIndex);
        requestAnimationFrame(() => {
          focusCell(match.rowIndex, match.columnId);
        });
      });
    }
  }, [store, focusCell]);

  const onNavigateToNextMatch = React.useCallback(() => {
    const currentState = store.getState();
    if (currentState.searchMatches.length === 0) return;

    const nextIndex =
      (currentState.matchIndex + 1) % currentState.searchMatches.length;
    const match = currentState.searchMatches[nextIndex];

    if (match) {
      rowVirtualizerRef.current?.scrollToIndex(match.rowIndex, {
        align: "center",
      });

      requestAnimationFrame(() => {
        store.setState("matchIndex", nextIndex);
        requestAnimationFrame(() => {
          focusCell(match.rowIndex, match.columnId);
        });
      });
    }
  }, [store, focusCell]);

  const getIsSearchMatch = React.useCallback(
    (rowIndex: number, columnId: string) => {
      return searchMatches.some(
        (match) => match.rowIndex === rowIndex && match.columnId === columnId,
      );
    },
    [searchMatches],
  );

  const getIsActiveSearchMatch = React.useCallback(
    (rowIndex: number, columnId: string) => {
      if (matchIndex < 0) return false;
      const currentMatch = searchMatches[matchIndex];
      return (
        currentMatch?.rowIndex === rowIndex &&
        currentMatch?.columnId === columnId
      );
    },
    [searchMatches, matchIndex],
  );

  const blurCell = React.useCallback(() => {
    const currentState = store.getState();
    if (
      currentState.editingCell &&
      document.activeElement instanceof HTMLElement
    ) {
      document.activeElement.blur();
    }

    store.batch(() => {
      store.setState("focusedCell", null);
      store.setState("editingCell", null);
    });
  }, [store]);

  const onCellClick = React.useCallback(
    (rowIndex: number, columnId: string, event?: React.MouseEvent) => {
      if (event?.button === 2) {
        return;
      }

      const currentState = store.getState();
      const currentFocused = currentState.focusedCell;

      function scrollToCell() {
        requestAnimationFrame(() => {
          const container = dataGridRef.current;
          const cellKey = getCellKey(rowIndex, columnId);
          const targetCell = cellMapRef.current.get(cellKey);

          if (container && targetCell) {
            scrollCellIntoView({
              container,
              targetCell,
              tableRef,
              viewportOffset: VIEWPORT_OFFSET,
              isRtl: dir === "rtl",
            });
          }
        });
      }

      if (event) {
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          const cellKey = getCellKey(rowIndex, columnId);
          const newSelectedCells = new Set(
            currentState.selectionState.selectedCells,
          );

          if (newSelectedCells.has(cellKey)) {
            newSelectedCells.delete(cellKey);
          } else {
            newSelectedCells.add(cellKey);
          }

          store.setState("selectionState", {
            selectedCells: newSelectedCells,
            selectionRange: null,
            isSelecting: false,
          });
          focusCell(rowIndex, columnId);
          scrollToCell();
          return;
        }

        if (event.shiftKey && currentState.focusedCell) {
          event.preventDefault();
          selectRange(currentState.focusedCell, { rowIndex, columnId });
          scrollToCell();
          return;
        }
      }

      const hasSelectedCells =
        currentState.selectionState.selectedCells.size > 0;
      const hasSelectedRows = Object.keys(currentState.rowSelection).length > 0;

      if (hasSelectedCells && !currentState.selectionState.isSelecting) {
        const cellKey = getCellKey(rowIndex, columnId);
        const isClickingSelectedCell =
          currentState.selectionState.selectedCells.has(cellKey);

        if (!isClickingSelectedCell) {
          clearSelection();
        } else {
          focusCell(rowIndex, columnId);
          scrollToCell();
          return;
        }
      } else if (hasSelectedRows && columnId !== "select") {
        clearSelection();
      }

      if (
        currentFocused?.rowIndex === rowIndex &&
        currentFocused?.columnId === columnId
      ) {
        onCellEditingStart(rowIndex, columnId);
      } else {
        focusCell(rowIndex, columnId);
        scrollToCell();
      }
    },
    [store, focusCell, onCellEditingStart, selectRange, clearSelection, dir],
  );

  const onCellDoubleClick = React.useCallback(
    (rowIndex: number, columnId: string, event?: React.MouseEvent) => {
      if (event?.defaultPrevented) return;

      onCellEditingStart(rowIndex, columnId);
    },
    [onCellEditingStart],
  );

  const onCellMouseDown = React.useCallback(
    (rowIndex: number, columnId: string, event: React.MouseEvent) => {
      if (event.button === 2) {
        return;
      }

      event.preventDefault();

      if (!event.ctrlKey && !event.metaKey && !event.shiftKey) {
        store.batch(() => {
          store.setState("selectionState", {
            selectedCells: new Set(),
            selectionRange: {
              start: { rowIndex, columnId },
              end: { rowIndex, columnId },
            },
            isSelecting: true,
          });
          store.setState("rowSelection", {});
        });
      }
    },
    [store],
  );

  const onCellMouseEnter = React.useCallback(
    (rowIndex: number, columnId: string, _event: React.MouseEvent) => {
      const currentState = store.getState();
      if (
        currentState.selectionState.isSelecting &&
        currentState.selectionState.selectionRange
      ) {
        const start = currentState.selectionState.selectionRange.start;
        const end = { rowIndex, columnId };

        if (
          currentState.focusedCell?.rowIndex !== start.rowIndex ||
          currentState.focusedCell?.columnId !== start.columnId
        ) {
          focusCell(start.rowIndex, start.columnId);
        }

        selectRange(start, end, true);
      }
    },
    [store, selectRange, focusCell],
  );

  const onCellMouseUp = React.useCallback(() => {
    const currentState = store.getState();
    store.setState("selectionState", {
      ...currentState.selectionState,
      isSelecting: false,
    });
  }, [store]);

  const onCellContextMenu = React.useCallback(
    (rowIndex: number, columnId: string, event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const currentState = store.getState();
      const cellKey = getCellKey(rowIndex, columnId);
      const isTargetCellSelected =
        currentState.selectionState.selectedCells.has(cellKey);

      if (!isTargetCellSelected) {
        store.batch(() => {
          store.setState("selectionState", {
            selectedCells: new Set([cellKey]),
            selectionRange: {
              start: { rowIndex, columnId },
              end: { rowIndex, columnId },
            },
            isSelecting: false,
          });
          store.setState("focusedCell", { rowIndex, columnId });
        });
      }

      store.setState("contextMenu", {
        open: true,
        x: event.clientX,
        y: event.clientY,
      });
    },
    [store],
  );

  const onContextMenuOpenChange = React.useCallback(
    (open: boolean) => {
      if (!open) {
        const currentMenu = store.getState().contextMenu;
        store.setState("contextMenu", {
          open: false,
          x: currentMenu.x,
          y: currentMenu.y,
        });
      }
    },
    [store],
  );

  const onSortingChange = React.useCallback(
    (updater: Updater<SortingState>) => {
      const currentState = store.getState();
      const newSorting =
        typeof updater === "function" ? updater(currentState.sorting) : updater;
      store.setState("sorting", newSorting);
    },
    [store],
  );

  const onColumnFiltersChange = React.useCallback(
    (updater: Updater<ColumnFiltersState>) => {
      const currentState = store.getState();
      const newColumnFilters =
        typeof updater === "function"
          ? updater(currentState.columnFilters)
          : updater;
      store.setState("columnFilters", newColumnFilters);
    },
    [store],
  );

  const onRowSelectionChange = React.useCallback(
    (updater: Updater<RowSelectionState>) => {
      const currentState = store.getState();
      const newRowSelection =
        typeof updater === "function"
          ? updater(currentState.rowSelection)
          : updater;

      const selectedRows = Object.keys(newRowSelection).filter(
        (key) => newRowSelection[key],
      );

      const selectedCells = new Set<string>();
      const rows = tableRef.current?.getRowModel().rows ?? [];

      for (const rowId of selectedRows) {
        const rowIndex = rows.findIndex((r) => r.id === rowId);
        if (rowIndex === -1) continue;

        for (const columnId of columnIds) {
          selectedCells.add(getCellKey(rowIndex, columnId));
        }
      }

      store.batch(() => {
        store.setState("rowSelection", newRowSelection);
        store.setState("selectionState", {
          selectedCells,
          selectionRange: null,
          isSelecting: false,
        });
        store.setState("focusedCell", null);
        store.setState("editingCell", null);
      });
    },
    [store, columnIds],
  );

  const onPaginationChange = React.useCallback(
    (updater: Updater<{ pageIndex: number; pageSize: number }>) => {
      const currentState = store.getState();
      const newPagination =
        typeof updater === "function"
          ? updater(currentState.pagination)
          : updater;
      store.setState("pagination", newPagination);
    },
    [store],
  );

  const onRowSelect = React.useCallback(
    (rowIndex: number, selected: boolean, shiftKey: boolean) => {
      const currentState = store.getState();
      const rows = tableRef.current?.getRowModel().rows ?? [];
      const currentRow = rows[rowIndex];
      if (!currentRow) return;

      if (shiftKey && currentState.lastClickedRowIndex !== null) {
        const startIndex = Math.min(currentState.lastClickedRowIndex, rowIndex);
        const endIndex = Math.max(currentState.lastClickedRowIndex, rowIndex);

        const newRowSelection: RowSelectionState = {
          ...currentState.rowSelection,
        };

        for (let i = startIndex; i <= endIndex; i++) {
          const row = rows[i];
          if (row) {
            newRowSelection[row.id] = selected;
          }
        }

        onRowSelectionChange(newRowSelection);
      } else {
        onRowSelectionChange({
          ...currentState.rowSelection,
          [currentRow.id]: selected,
        });
      }

      store.setState("lastClickedRowIndex", rowIndex);
    },
    [store, onRowSelectionChange],
  );

  const onRowHeightChange = React.useCallback(
    (updater: Updater<RowHeightValue>) => {
      const currentState = store.getState();
      const newRowHeight =
        typeof updater === "function"
          ? updater(currentState.rowHeight)
          : updater;
      store.setState("rowHeight", newRowHeight);
    },
    [store],
  );

  const onColumnClick = React.useCallback(
    (columnId: string) => {
      if (!propsRef.current.enableColumnSelection) {
        clearSelection();
        return;
      }

      selectColumn(columnId);
    },
    [propsRef, selectColumn, clearSelection],
  );

  const onPasteDialogOpenChange = React.useCallback(
    (open: boolean) => {
      if (!open) {
        store.setState("pasteDialog", {
          open: false,
          rowsNeeded: 0,
          clipboardText: "",
        });
      }
    },
    [store],
  );

  const defaultColumn: Partial<ColumnDef<TData>> = React.useMemo(
    () => ({
      minSize: MIN_COLUMN_SIZE,
      maxSize: MAX_COLUMN_SIZE,
    }),
    [],
  );

  const tableMeta = React.useMemo<TableMeta<TData>>(() => {
    return {
      ...propsRef.current.meta,
      dataGridRef,
      cellMapRef,
      get focusedCell() {
        return store.getState().focusedCell;
      },
      get editingCell() {
        return store.getState().editingCell;
      },
      get selectionState() {
        return store.getState().selectionState;
      },
      get searchOpen() {
        return store.getState().searchOpen;
      },
      get contextMenu() {
        return store.getState().contextMenu;
      },
      get pasteDialog() {
        return store.getState().pasteDialog;
      },
      get rowHeight() {
        return store.getState().rowHeight;
      },
      get readOnly() {
        return propsRef.current.readOnly;
      },
      getIsCellSelected,
      getIsSearchMatch,
      getIsActiveSearchMatch,
      onRowHeightChange,
      onRowSelect,
      onDataUpdate,
      onRowsDelete: propsRef.current.onRowsDelete ? onRowsDelete : undefined,
      onColumnClick,
      onCellClick,
      onCellDoubleClick,
      onCellMouseDown,
      onCellMouseEnter,
      onCellMouseUp,
      onCellContextMenu,
      onCellEditingStart,
      onCellEditingStop,
      onCellsCopy,
      onCellsCut,
      onFilesUpload: propsRef.current.onFilesUpload
        ? propsRef.current.onFilesUpload
        : undefined,
      onFilesDelete: propsRef.current.onFilesDelete
        ? propsRef.current.onFilesDelete
        : undefined,
      onContextMenuOpenChange,
      onPasteDialogOpenChange,
    };
  }, [
    propsRef,
    store,
    getIsCellSelected,
    getIsSearchMatch,
    getIsActiveSearchMatch,
    onRowHeightChange,
    onRowSelect,
    onDataUpdate,
    onRowsDelete,
    onColumnClick,
    onCellClick,
    onCellDoubleClick,
    onCellMouseDown,
    onCellMouseEnter,
    onCellMouseUp,
    onCellContextMenu,
    onCellEditingStart,
    onCellEditingStop,
    onCellsCopy,
    onCellsCut,
    onContextMenuOpenChange,
    onPasteDialogOpenChange,
  ]);

  const getMemoizedCoreRowModel = React.useMemo(() => getCoreRowModel(), []);
  const getMemoizedFilteredRowModel = React.useMemo(
    () => getFilteredRowModel(),
    [],
  );
  const getMemoizedSortedRowModel = React.useMemo(
    () => getSortedRowModel(),
    [],
  );
  const getMemoizedPaginationRowModel = React.useMemo(
    () => getPaginationRowModel(),
    [],
  );

  const tableState = React.useMemo<Partial<TableState>>(
    () => ({
      ...propsRef.current.state,
      sorting,
      columnFilters,
      rowSelection,
      pagination,
    }),
    [propsRef, sorting, columnFilters, rowSelection, pagination],
  );

  const tableOptions = React.useMemo<TableOptions<TData>>(() => {
    return {
      ...propsRef.current,
      data,
      columns,
      defaultColumn,
      initialState: propsRef.current.initialState,
      state: tableState,
      onRowSelectionChange,
      onSortingChange,
      onColumnFiltersChange,
      onPaginationChange,
      columnResizeMode: "onChange",
      getCoreRowModel: getMemoizedCoreRowModel,
      getFilteredRowModel: getMemoizedFilteredRowModel,
      getSortedRowModel: getMemoizedSortedRowModel,
      getPaginationRowModel: getMemoizedPaginationRowModel,
      pageCount,
      manualPagination,
      manualSorting,
      manualFiltering,
      meta: {
        ...tableMeta,
        totalRows,
      },
    };
  }, [
    propsRef,
    data,
    columns,
    defaultColumn,
    tableState,
    onRowSelectionChange,
    onSortingChange,
    onColumnFiltersChange,
    onPaginationChange,
    getMemoizedCoreRowModel,
    getMemoizedFilteredRowModel,
    getMemoizedSortedRowModel,
    getMemoizedPaginationRowModel,
    tableMeta,
    pageCount,
    manualPagination,
    manualSorting,
    manualFiltering,
    totalRows,
  ]);

  const table = useReactTable(tableOptions);

  if (!tableRef.current) {
    tableRef.current = table;
  }

  const columnSizeVars = React.useMemo(() => {
    const headers = table.getFlatHeaders();
    const colSizes: { [key: string]: number } = {};
    for (const header of headers) {
      colSizes[`--header-${header.id}-size`] = header.getSize();
      colSizes[`--col-${header.column.id}-size`] = header.column.getSize();
    }
    return colSizes;
  }, [table.getState().columnSizingInfo, table.getState().columnSizing]);

  const rowVirtualizer = useVirtualizer({
    count: table.getPaginationRowModel().rows.length,
    getScrollElement: () => dataGridRef.current,
    estimateSize: () => rowHeightValue,
    overscan,
    isScrollingResetDelay: 150,
    measureElement:
      typeof window !== "undefined" &&
      navigator.userAgent.indexOf("Firefox") === -1
        ? (element: Element) => element?.getBoundingClientRect().height
        : undefined,
  });

  if (!rowVirtualizerRef.current) {
    rowVirtualizerRef.current = rowVirtualizer;
  }

  // Use separate refs to track state changes without depending on table object
  const pageIndexRef = React.useRef<number | undefined>(undefined);
  const pageSizeRef = React.useRef<number | undefined>(undefined);
  const sortIdRef = React.useRef<string | undefined>(undefined);
  const sortDescRef = React.useRef<boolean | undefined>(undefined);
  const searchQueryRef = React.useRef<string | undefined>(undefined);
  const isInitializedRef = React.useRef(false);

  // Notify parent of query changes when manual modes are enabled
  React.useEffect(() => {
    if (!onQueryChange) return;

    const state = table.getState();
    const { pagination: pg, sorting: sort, columnFilters: filters } = state;
    const activeSort = sort?.[0];
    const filterMap = filters?.reduce<Record<string, unknown>>((acc, curr) => {
      acc[curr.id] = curr.value;
      return acc;
    }, {});

    // On first mount, just initialize refs without calling onQueryChange
    if (!isInitializedRef.current) {
      pageIndexRef.current = pg?.pageIndex ?? 0;
      pageSizeRef.current = pg?.pageSize ?? 10;
      sortIdRef.current = activeSort?.id;
      sortDescRef.current = activeSort?.desc;
      searchQueryRef.current = searchQuery;
      isInitializedRef.current = true;
      return;
    }

    // Check if any relevant state changed
    const pageIndexChanged = pageIndexRef.current !== pg?.pageIndex;
    const pageSizeChanged = pageSizeRef.current !== pg?.pageSize;
    const sortIdChanged = sortIdRef.current !== activeSort?.id;
    const sortDescChanged = sortDescRef.current !== activeSort?.desc;
    const searchChanged = searchQueryRef.current !== searchQuery;

    if (pageIndexChanged || pageSizeChanged || sortIdChanged || sortDescChanged || searchChanged) {
      // Update refs
      pageIndexRef.current = pg?.pageIndex ?? 0;
      pageSizeRef.current = pg?.pageSize ?? 10;
      sortIdRef.current = activeSort?.id;
      sortDescRef.current = activeSort?.desc;
      searchQueryRef.current = searchQuery;

      // Call onQueryChange asynchronously to avoid setState during render
      const queryParams = {
        page: (pg?.pageIndex ?? 0) + 1,
        limit: pg?.pageSize ?? 10,
        sortBy: activeSort?.id,
        sortOrder: (activeSort?.desc ? "desc" : "asc") as "asc" | "desc",
        filters: filterMap,
        search: searchQuery,
      };

      // Use setTimeout to ensure this runs after render completes
      setTimeout(() => {
        onQueryChange(queryParams);
      }, 0);
    }
  }, [onQueryChange, table, searchQuery]);

  const onScrollToRow = React.useCallback(
    async (opts: Partial<CellPosition>) => {
      const rowIndex = opts?.rowIndex ?? 0;
      const columnId = opts?.columnId;

      rowVirtualizer.scrollToIndex(rowIndex, {
        align: "center",
      });

      const navigableIds = propsRef.current.columns
        .map((c) => {
          if (c.id) return c.id;
          if ("accessorKey" in c) return c.accessorKey as string;
          return undefined;
        })
        .filter((id): id is string => Boolean(id))
        .filter((c) => !NON_NAVIGABLE_COLUMN_IDS.includes(c));

      const targetColumnId = columnId ?? navigableIds[0];

      if (!targetColumnId) return;

      requestAnimationFrame(() => {
        store.batch(() => {
          store.setState("focusedCell", {
            rowIndex,
            columnId: targetColumnId,
          });
          store.setState("editingCell", null);
        });

        focusCellWrapper(rowIndex, targetColumnId);
      });
    },
    [rowVirtualizer, propsRef, store, focusCellWrapper],
  );

  const onRowAdd = React.useCallback(
    async (event?: React.MouseEvent<HTMLDivElement>) => {
      if (propsRef.current.readOnly || !propsRef.current.onRowAdd) return;

      const result = await propsRef.current.onRowAdd(event);

      if (event?.defaultPrevented || result === null) return;

      const currentTable = tableRef.current;
      const rows = currentTable?.getRowModel().rows ?? [];

      if (result) {
        const adjustedRowIndex =
          (result.rowIndex ?? 0) >= rows.length ? rows.length : result.rowIndex;

        onScrollToRow({
          rowIndex: adjustedRowIndex,
          columnId: result.columnId,
        });
        return;
      }

      onScrollToRow({ rowIndex: rows.length });
    },
    [propsRef, onScrollToRow],
  );

  const searchState = React.useMemo<SearchState | undefined>(() => {
    if (!propsRef.current.enableSearch) return undefined;

    return {
      searchMatches,
      matchIndex,
      searchOpen,
      onSearchOpenChange,
      searchQuery,
      onSearchQueryChange,
      onSearch,
      onNavigateToNextMatch,
      onNavigateToPrevMatch,
    };
  }, [
    propsRef,
    searchMatches,
    matchIndex,
    searchOpen,
    onSearchOpenChange,
    searchQuery,
    onSearchQueryChange,
    onSearch,
    onNavigateToNextMatch,
    onNavigateToPrevMatch,
  ]);

  React.useEffect(() => {
    const currentState = store.getState();
    const autoFocus = propsRef.current.autoFocus;

    // Don't auto-focus if we're processing a data update (e.g., after editing)
    if (currentState.isProcessingDataUpdate) {
      return;
    }

    if (
      autoFocus &&
      data.length > 0 &&
      columns.length > 0 &&
      !currentState.focusedCell
    ) {
      if (navigableColumnIds.length > 0) {
        const rafId = requestAnimationFrame(() => {
          if (typeof autoFocus === "object") {
            const { rowIndex, columnId } = autoFocus;
            if (columnId) {
              focusCell(rowIndex ?? 0, columnId);
            }
            return;
          }

          const firstColumnId = navigableColumnIds[0];
          if (firstColumnId) {
            focusCell(0, firstColumnId);
          }
        });
        return () => cancelAnimationFrame(rafId);
      }
    }
  }, [store, propsRef, data, columns, navigableColumnIds, focusCell]);

  React.useEffect(() => {
    const container = dataGridRef.current;
    if (!container) return;

    function onFocusOut(event: FocusEvent) {
      const currentContainer = dataGridRef.current;
      if (!currentContainer) return;

      const currentState = store.getState();

      if (!currentState.focusedCell || currentState.editingCell) return;

      const relatedTarget = event.relatedTarget;

      const isFocusMovingOutsideGrid =
        !relatedTarget || !currentContainer.contains(relatedTarget as Node);

      const isFocusMovingToPopover = getIsInPopover(relatedTarget);

      if (isFocusMovingOutsideGrid && !isFocusMovingToPopover) {
        requestAnimationFrame(() => {
          currentContainer.focus();
        });
      }
    }

    container.addEventListener("focusout", onFocusOut);

    return () => {
      container.removeEventListener("focusout", onFocusOut);
    };
  }, [store]);

  React.useEffect(() => {
    function onOutsideClick(event: MouseEvent) {
      if (event.button === 2) {
        return;
      }

      if (
        dataGridRef.current &&
        !dataGridRef.current.contains(event.target as Node)
      ) {
        const target = event.target;
        const isInsidePopover = getIsInPopover(target);

        if (!isInsidePopover) {
          blurCell();
          const currentState = store.getState();
          if (
            currentState.selectionState.selectedCells.size > 0 ||
            Object.keys(currentState.rowSelection).length > 0
          ) {
            clearSelection();
          }
        }
      }
    }

    document.addEventListener("mousedown", onOutsideClick);
    return () => {
      document.removeEventListener("mousedown", onOutsideClick);
    };
  }, [store, blurCell, clearSelection]);

  useIsomorphicLayoutEffect(() => {
    const rafId = requestAnimationFrame(() => {
      rowVirtualizer.measure();
    });
    return () => cancelAnimationFrame(rafId);
  }, [
    rowHeight,
    table.getState().columnFilters,
    table.getState().columnOrder,
    table.getState().columnPinning,
    table.getState().columnSizing,
    table.getState().columnVisibility,
    table.getState().expanded,
    table.getState().globalFilter,
    table.getState().grouping,
    table.getState().rowSelection,
    table.getState().sorting,
  ]);

  return React.useMemo(
    () => ({
      dataGridRef,
      headerRef,
      rowMapRef,
      footerRef,
      dir,
      table,
      tableMeta,
      rowVirtualizer,
      columns,
      searchState,
      columnSizeVars,
      cellSelectionMap,
      focusedCell,
      editingCell,
      rowHeight,
      contextMenu,
      pasteDialog,
      onRowAdd: propsRef.current.onRowAdd ? onRowAdd : undefined,
    }),
    [
      propsRef,
      dir,
      table,
      tableMeta,
      rowVirtualizer,
      columns,
      searchState,
      columnSizeVars,
      cellSelectionMap,
      focusedCell,
      editingCell,
      rowHeight,
      contextMenu,
      pasteDialog,
      onRowAdd,
    ],
  );
}

export {
  useDataGrid,
  type UseDataGridProps,
};

