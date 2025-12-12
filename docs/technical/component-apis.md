# Component APIs Documentation

> **Last Updated**: December 12, 2024  
> **Status**: Documentation Complete

---

## Overview

This document provides a comprehensive analysis of the current DataTable and DataGrid component APIs, their features, and limitations.

---

## DataTable Component

**File**: `frontend/src/presentation/components/molecules/data/data-table/data-table.tsx`

### Purpose
Server-side paginated table component with advanced filtering, sorting, and column controls.

### Props Interface

```typescript
interface DataTableProps<TData> {
  table: TanstackTable<TData>;  // TanStack Table instance
  actionBar?: React.ReactNode;   // Optional action bar for bulk operations
  children?: React.ReactNode;     // Toolbar and other components
  className?: string;
}
```

### Key Features

✅ **Server-Side Pagination**
- Manual pagination control
- Server-managed page count
- Efficient for large datasets (1000+ rows)

✅ **Advanced Filtering**
- Faceted filters (multi-select dropdowns)
- Column-specific filters
- Manual filter mode for server-side queries
- Filter state tracking

✅ **Sorting**
- Multi-column sorting
- Server-side sort integration
- Sort state persistence

✅ **Column Management**
- Column visibility controls
- Column resizing
- Column ordering

✅ **Search**
- Single search bar
- Debounced input (300ms)
- Server-side search integration

✅ **Row Selection**
- Single/multi-row selection
- Action bar appears when rows selected
- Selection state management

### Usage Pattern

```typescript
import { DataTable, DataTableToolbar } from "@/components/molecules/data/data-table";
import { useDataTable } from "@/hooks";

function MyTable({ data, pageCount, totalCount }) {
  const { table } = useDataTable({
    data,
    columns,
    pageCount,
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    onQueryChange: handleQueryChange,
  });

  return (
    <DataTable table={table}>
      <DataTableToolbar
        table={table}
        searchBar={<SearchBar ... />}
        onReset={handleReset}
      />
    </DataTable>
  );
}
```

### Limitations

❌ **Search**
- Only single field search (typically email)
- No multi-field search dropdown
- No advanced search options

❌ **Filtering**
- No date range filters
- No numeric range filters
- Limited to dropdown/multi-select only
- No saved filter presets

❌ **State Persistence**
- No URL state management
- No localStorage persistence
- Filter state lost on page refresh

❌ **Bulk Operations**
- Basic row selection only
- No built-in bulk operation controls
- Manual implementation required

---

## DataGrid Component

**File**: `frontend/src/presentation/components/molecules/data/data-grid/data-grid.tsx`

### Purpose
Excel-like editable grid with keyboard navigation, copy/paste, and inline editing.

### Props Interface

```typescript
interface DataGridProps<TData> {
  dataGridRef: React.RefObject<HTMLDivElement>;
  headerRef: React.RefObject<HTMLDivElement>;
  rowMapRef: React.RefObject<Map<string, HTMLDivElement>>;
  footerRef: React.RefObject<HTMLDivElement>;
  dir?: Direction;
  table: TanstackTable<TData>;
  tableMeta: TableMeta;
  rowVirtualizer: Virtualizer<HTMLDivElement, Element>;
  columns: ColumnDef<TData>[];
  columnSizeVars: Record<string, number>;
  cellSelectionMap: Map<string, boolean>;
  focusedCell: CellPosition | null;
  editingCell: CellPosition | null;
  rowHeight: RowHeightValue;
  contextMenu: ContextMenuState;
  pasteDialog: PasteDialogState;
  searchState: SearchState;
  onRowAdd?: () => Promise<{ rowIndex: number; columnId: string }>;
  height?: number;
  stretchColumns?: boolean;
  className?: string;
}
```

### Key Features

✅ **Excel-like Editing**
- Inline cell editing
- Cell-level validation
- Enter/Escape to confirm/cancel

✅ **Keyboard Navigation**
- Arrow keys for navigation
- Tab/Shift+Tab for cell traversal
- Home/End for row navigation
- Ctrl+Home/End for grid navigation

✅ **Copy/Paste Operations**
- Copy selected cells (Ctrl+C)
- Paste data (Ctrl+V)
- Multi-cell paste support
- Paste dialog for large data

✅ **Virtualized Rendering**
- Virtual scrolling for performance
- Renders only visible rows
- Smooth scrolling for 500+ rows

✅ **Advanced Toolbar**
- Search (single field)
- Filter menu (client-side)
- Sort menu
- Row height controls
- View options (column visibility)

✅ **Row Operations**
- Add row (with callback)
- Delete rows (bulk)
- Row selection
- Context menu actions

✅ **Cell Types**
- Text input
- Number input
- Select dropdown
- Date picker
- Checkbox
- File upload

### Usage Pattern

```typescript
import { DataGrid } from "@/components/molecules/data/data-grid";
import { useDataGrid } from "@/hooks/use-data-grid";

function MyGrid({ data, onSave, onAddRow, onDeleteRows }) {
  const gridState = useDataGrid({
    data,
    columns,
    onDataChange: handleDataChange,
    onRowAdd: handleRowAdd,
    onRowsDelete: handleDeleteRows,
    rowHeight: "short",
    enableSearch: true,
    enablePaste: true,
  });

  return <DataGrid {...gridState} height={600} />;
}
```

### Limitations

❌ **Server Integration**
- Primarily client-side data management
- Limited server pagination support
- No server-side filtering
- All data loaded in memory

❌ **Search & Filtering**
- Single field search only (usually 'dba')
- Client-side filtering only
- No advanced filter options
- No date/numeric range filters

❌ **Data Size**
- Struggles with 1000+ rows + editing
- Memory intensive for large datasets
- Complex state management

❌ **State Persistence**
- No URL state management
- No localStorage persistence
- Unsaved changes lost on refresh warning

---

## Hook APIs

### useDataTable

**File**: `frontend/src/presentation/hooks/use-data-table.ts`

```typescript
interface UseDataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
  pageCount: number;
  initialState?: Partial<TableState>;
  queryKeys?: Partial<QueryKeys>;
  history?: "push" | "replace";
  debounceMs?: number;
  throttleMs?: number;
  clearOnDefault?: boolean;
  enableAdvancedFilter?: boolean;
  scroll?: boolean;
  shallow?: boolean;
  startTransition?: React.TransitionStartFunction;
  manualPagination?: boolean;
  manualSorting?: boolean;
  manualFiltering?: boolean;
  totalRows?: number;
}

interface UseDataTableReturn<TData> {
  table: TanstackTable<TData>;
}
```

**Features**:
- ✅ URL state management (with nuqs)
- ✅ Manual pagination/sorting/filtering modes
- ✅ Debounced state updates
- ✅ Query parameter sync
- ✅ Server-side integration support

**Limitations**:
- ❌ Complex configuration required
- ❌ Limited filter type support
- ❌ No built-in saved presets

### useDataGrid

**File**: `frontend/src/presentation/hooks/use-data-grid.ts`

```typescript
interface UseDataGridProps<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
  onDataChange?: (data: TData[]) => void;
  onRowAdd?: () => Promise<TData | { rowIndex: number; columnId: string }>;
  onRowsDelete?: (rows: TData[], indices: number[]) => Promise<void>;
  rowHeight?: RowHeightValue;
  enableSearch?: boolean;
  enablePaste?: boolean;
  autoFocus?: boolean;
  pageCount?: number;
  totalRows?: number;
  manualPagination?: boolean;
  manualSorting?: boolean;
  manualFiltering?: boolean;
  onQueryChange?: (params: QueryParams) => void;
}

interface UseDataGridReturn<TData> {
  dataGridRef: React.RefObject<HTMLDivElement>;
  headerRef: React.RefObject<HTMLDivElement>;
  rowMapRef: React.RefObject<Map<string, HTMLDivElement>>;
  footerRef: React.RefObject<HTMLDivElement>;
  table: TanstackTable<TData>;
  tableMeta: TableMeta;
  rowVirtualizer: Virtualizer;
  columns: ColumnDef<TData>[];
  columnSizeVars: Record<string, number>;
  cellSelectionMap: Map<string, boolean>;
  focusedCell: CellPosition | null;
  editingCell: CellPosition | null;
  rowHeight: RowHeightValue;
  contextMenu: ContextMenuState;
  pasteDialog: PasteDialogState;
  searchState: SearchState;
}
```

**Features**:
- ✅ Complete grid state management
- ✅ Cell selection tracking
- ✅ Editing state management
- ✅ Virtual scrolling integration
- ✅ Keyboard navigation
- ✅ Copy/paste functionality

**Limitations**:
- ❌ Complex API with 15+ return values
- ❌ Difficult to extend
- ❌ Limited server-side support
- ❌ No filter persistence

---

## Current Usage Patterns

### User Management (DataTable)

```typescript
// frontend/src/presentation/components/organisms/user-management/user-management.tsx

<UsersDataTable
  data={users}
  pageCount={pageCount}
  totalCount={totalCount}
  currentUser={currentUser}
  canEdit={canEdit}
  canDelete={canDelete}
  onEdit={handleEdit}
  onDelete={handleDelete}
  onCreateUser={handleCreateUser}
  isLoading={isLoading}
  onQueryChange={onQueryChange}
/>
```

**Integration**:
- ✅ Server-side pagination via `onQueryChange`
- ✅ Manual filtering for role, status
- ✅ Single search (email)
- ❌ No advanced filters
- ❌ No state persistence

### License Management (DataGrid)

```typescript
// frontend/src/presentation/components/organisms/license-management/license-management.tsx

<LicensesDataGrid
  data={filteredLicenses}
  isLoading={isLoading}
  onSave={handleSave}
  onAddRow={handleAddRow}
  onDeleteRows={handleDeleteRows}
  pageCount={pageCount}
  totalCount={totalCount}
  onQueryChange={onQueryChange}
  onLoadLicenses={handleLoadLicenses}
/>
```

**Integration**:
- ✅ Client-side editing
- ✅ Inline row add/delete
- ✅ Excel-like experience
- ❌ Limited server integration
- ❌ Client-side filtering only
- ❌ No URL state

---

## Component Architecture Comparison

| Feature | DataTable | DataGrid |
|---------|-----------|----------|
| **Primary Use Case** | Server-paginated lists | Excel-like editing |
| **Pagination** | Server-side ✅ | Client-side (limited server) |
| **Filtering** | Server-side ✅ | Client-side only |
| **Sorting** | Server-side ✅ | Client/server hybrid |
| **Search** | Single field ⚠️ | Single field ⚠️ |
| **Editing** | External forms | Inline editing ✅ |
| **Performance** | Excellent (1000+) | Good (~500 rows) |
| **State Persistence** | None ❌ | None ❌ |
| **Bulk Operations** | Basic ⚠️ | Row selection ✅ |
| **Virtual Scrolling** | No | Yes ✅ |
| **Copy/Paste** | No | Yes ✅ |
| **Keyboard Nav** | No | Yes ✅ |
| **API Complexity** | Low ✅ | High ❌ |

---

## Key Pain Points

### 1. **Inconsistent APIs**
- DataTable and DataGrid have completely different prop interfaces
- Difficult to switch between components
- No unified abstraction layer

### 2. **Limited Search**
- Both components only support single-field search
- No multi-field search dropdown
- No fuzzy matching or advanced queries

### 3. **Basic Filtering**
- No date range filters
- No numeric range filters
- No complex filter combinations
- No saved filter presets

### 4. **No State Persistence**
- Filters lost on page refresh
- No URL sharing capability
- Poor user experience for returning users

### 5. **Server Integration Gaps**
- DataGrid has limited server-side support
- Manual state synchronization required
- Complex pagination logic for mixed mode

### 6. **Bulk Operations**
- No standardized bulk operation UI
- Manual implementation for each use case
- No filter-aware bulk selection

---

## Recommendations

### High Priority
1. ✅ Create unified API interface
2. ✅ Add multi-field search component
3. ✅ Implement date/numeric range filters
4. ✅ Add filter state persistence (URL + localStorage)

### Medium Priority
5. ✅ Standardize bulk operations UI
6. ✅ Improve DataGrid server integration
7. ✅ Add saved filter presets

### Low Priority
8. ✅ Optimize DataGrid for 1000+ rows
9. ✅ Add export functionality
10. ✅ Implement advanced search panel

---

## Next Steps

See `IMPLEMENTATION_PLAN.md` for detailed implementation phases.


