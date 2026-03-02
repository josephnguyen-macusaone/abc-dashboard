import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface DataTableFilters {
  search: string;
  manualFilters: Record<string, string[]>;
}

/** Column visibility state: column id -> visible (true/false) */
export type ColumnVisibilityState = Record<string, boolean>;

interface DataTableState {
  tableStates: Record<string, DataTableFilters>;
  /** Per-table column visibility (keyed by tableId / columnVisibilityStorageKey). */
  columnVisibilityByTable: Record<string, ColumnVisibilityState>;

  setTableSearch: (tableId: string, search: string) => void;
  setTableManualFilters: (tableId: string, filters: Record<string, string[]>) => void;
  updateTableManualFilter: (tableId: string, key: string, values: string[]) => void;
  clearTableFilters: (tableId: string) => void;
  getTableState: (tableId: string) => DataTableFilters;
  resetTableState: (tableId: string) => void;

  setColumnVisibility: (tableId: string, updater: ColumnVisibilityState | ((prev: ColumnVisibilityState) => ColumnVisibilityState)) => void;
  getColumnVisibility: (tableId: string) => ColumnVisibilityState;
}

const initialTableState: DataTableFilters = {
  search: '',
  manualFilters: {},
};

export const useDataTableStore = create<DataTableState>()(
  devtools(
    (set, get) => ({
      tableStates: {},
      columnVisibilityByTable: {},

      setColumnVisibility: (tableId, updater) => {
        set((state) => {
          const prev = state.columnVisibilityByTable[tableId] ?? {};
          const next = typeof updater === "function" ? updater(prev) : updater;
          return {
            columnVisibilityByTable: {
              ...state.columnVisibilityByTable,
              [tableId]: next,
            },
          };
        });
      },

      getColumnVisibility: (tableId) => {
        return get().columnVisibilityByTable[tableId] ?? {};
      },

      // Actions
      setTableSearch: (tableId: string, search: string) => {
        set((state) => ({
          tableStates: {
            ...state.tableStates,
            [tableId]: {
              ...state.tableStates[tableId] || initialTableState,
              search,
            },
          },
        }));
      },

      setTableManualFilters: (tableId: string, filters: Record<string, string[]>) => {
        set((state) => ({
          tableStates: {
            ...state.tableStates,
            [tableId]: {
              ...state.tableStates[tableId] || initialTableState,
              manualFilters: filters,
            },
          },
        }));
      },

      updateTableManualFilter: (tableId: string, key: string, values: string[]) => {
        set((state) => {
          const currentState = state.tableStates[tableId] || initialTableState;
          const newFilters = { ...currentState.manualFilters };

          if (values.length === 0) {
            delete newFilters[key];
          } else {
            newFilters[key] = values;
          }

          return {
            tableStates: {
              ...state.tableStates,
              [tableId]: {
                ...currentState,
                manualFilters: newFilters,
              },
            },
          };
        });
      },

      clearTableFilters: (tableId: string) => {
        set((state) => ({
          tableStates: {
            ...state.tableStates,
            [tableId]: {
              ...state.tableStates[tableId] || initialTableState,
              search: '',
              manualFilters: {},
            },
          },
        }));
      },

      getTableState: (tableId: string) => {
        return get().tableStates[tableId] || initialTableState;
      },

      resetTableState: (tableId: string) => {
        set((state) => {
          const newTableStates = { ...state.tableStates };
          delete newTableStates[tableId];
          return { tableStates: newTableStates };
        });
      },
    }),
    {
      name: 'data-table-store',
    }
  )
);
