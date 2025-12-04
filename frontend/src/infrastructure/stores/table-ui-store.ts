import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export interface TableColumnVisibility {
  tableId: string;
  visibleColumns: string[];
}

export interface TableSortState {
  tableId: string;
  field: string;
  direction: 'asc' | 'desc';
}

interface TableUIState {
  // State
  columnVisibility: Record<string, string[]>; // tableId -> visible column keys
  sortStates: Record<string, { field: string; direction: 'asc' | 'desc' }>; // tableId -> sort state

  // Actions
  setColumnVisibility: (tableId: string, visibleColumns: string[]) => void;
  toggleColumnVisibility: (tableId: string, columnKey: string) => void;
  showAllColumns: (tableId: string, allColumns: string[]) => void;
  hideAllColumns: (tableId: string, essentialColumns?: string[]) => void;
  getColumnVisibility: (tableId: string) => string[];
  hasColumnVisibility: (tableId: string) => boolean;

  setSortState: (tableId: string, field: string, direction: 'asc' | 'desc') => void;
  getSortState: (tableId: string) => { field: string; direction: 'asc' | 'desc' } | null;
}

export const useTableUIStore = create<TableUIState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        columnVisibility: {},
        sortStates: {},

        // Column visibility actions
        setColumnVisibility: (tableId: string, visibleColumns: string[]) => {
          set((state) => ({
            columnVisibility: {
              ...state.columnVisibility,
              [tableId]: visibleColumns,
            },
          }));
        },

        toggleColumnVisibility: (tableId: string, columnKey: string) => {
          set((state) => {
            const current = state.columnVisibility[tableId] || [];
            const isVisible = current.includes(columnKey);
            const newVisible = isVisible
              ? current.filter(key => key !== columnKey)
              : [...current, columnKey];

            // Ensure at least one column remains visible
            const finalVisible = newVisible.length === 0 ? [columnKey] : newVisible;

            return {
              columnVisibility: {
                ...state.columnVisibility,
                [tableId]: finalVisible,
              },
            };
          });
        },

        showAllColumns: (tableId: string, allColumns: string[]) => {
          set((state) => ({
            columnVisibility: {
              ...state.columnVisibility,
              [tableId]: allColumns,
            },
          }));
        },

        hideAllColumns: (tableId: string, essentialColumns: string[] = []) => {
          set((state) => ({
            columnVisibility: {
              ...state.columnVisibility,
              [tableId]: essentialColumns.length > 0 ? essentialColumns : [],
            },
          }));
        },

        getColumnVisibility: (tableId: string) => {
          return get().columnVisibility[tableId] || [];
        },

        hasColumnVisibility: (tableId: string) => {
          return !!get().columnVisibility[tableId];
        },

        // Sort state actions
        setSortState: (tableId: string, field: string, direction: 'asc' | 'desc') => {
          set((state) => ({
            sortStates: {
              ...state.sortStates,
              [tableId]: { field, direction },
            },
          }));
        },

        getSortState: (tableId: string) => {
          return get().sortStates[tableId] || null;
        },
      }),
      {
        name: 'table-ui-storage',
        partialize: (state) => ({
          columnVisibility: state.columnVisibility,
          sortStates: state.sortStates,
        }),
      }
    ),
    {
      name: 'table-ui-store',
    }
  )
);
