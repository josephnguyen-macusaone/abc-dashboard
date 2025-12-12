# Unified Data Display Interface Design

> **Last Updated**: December 12, 2024  
> **Status**: Design Complete - Ready for Implementation

---

## Overview

This document outlines the unified interface design that allows DataTable and DataGrid components to share a consistent API, making it easier to switch between components and reducing complexity.

---

## Design Goals

1. ✅ **Consistent API** - Same props interface for both components
2. ✅ **Easy Switching** - Change from table to grid with single prop
3. ✅ **Type Safety** - Full TypeScript support with inference
4. ✅ **Backwards Compatible** - Existing components still work
5. ✅ **Extensible** - Easy to add new features
6. ✅ **Performance** - No overhead from abstraction

---

## Architecture

```
┌─────────────────────────────────────────────┐
│         UnifiedDataDisplay                  │
│    (Wrapper Component - Optional)           │
└─────────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌───────────────┐       ┌───────────────┐
│   DataTable   │       │   DataGrid    │
│  (Enhanced)   │       │  (Enhanced)   │
└───────────────┘       └───────────────┘
        │                       │
        └───────────┬───────────┘
                    ▼
        ┌───────────────────────┐
        │  useDataDisplay Hook  │
        │   (Unified Logic)     │
        └───────────────────────┘
```

---

## Core Interface

### UnifiedDataDisplay Component

```typescript
import { DataDisplayConfig } from '@/shared/types/data-display';

interface UnifiedDataDisplayProps<TData> extends DataDisplayConfig<TData> {
  /** Optional: Override automatic mode selection */
  mode?: 'table' | 'grid' | 'auto';
  
  /** Optional: Custom className */
  className?: string;
  
  /** Optional: Loading state */
  isLoading?: boolean;
}

export function UnifiedDataDisplay<TData>(props: UnifiedDataDisplayProps<TData>) {
  // Automatically select component based on mode
  const component = props.mode === 'grid' ? DataGrid : DataTable;
  
  // Or intelligently choose based on features
  if (props.mode === 'auto') {
    const needsEditing = Boolean(props.callbacks?.onDataChange);
    const hasLargeDataset = props.data.length > 500;
    const useGrid = needsEditing && !hasLargeDataset;
    // ... intelligent selection logic
  }
  
  return component;
}
```

### Usage Example

```typescript
// Simple usage - automatically chooses best component
<UnifiedDataDisplay
  mode="auto"
  data={users}
  columns={columns}
  search={{
    enabled: true,
    mode: 'multi-field',
    fields: [
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'displayName', label: 'Name', type: 'text' },
      { key: 'username', label: 'Username', type: 'text' },
    ]
  }}
  filters={[
    {
      id: 'role',
      label: 'Role',
      type: 'multi-select',
      options: ROLE_OPTIONS,
      serverSide: true
    },
    {
      id: 'createdAt',
      label: 'Created Date',
      type: 'date-range',
      serverSide: true
    }
  ]}
  pagination={{
    enabled: true,
    mode: 'server',
    pageSize: 20,
    pageSizeOptions: [10, 20, 50, 100]
  }}
  actions={{
    create: {
      id: 'create-user',
      label: 'Add User',
      icon: UserPlus,
      action: handleCreateUser
    },
    bulk: [
      {
        id: 'activate',
        label: 'Activate Users',
        icon: CheckCircle,
        action: handleBulkActivate,
        confirmMessage: 'Activate selected users?'
      },
      {
        id: 'delete',
        label: 'Delete Users',
        icon: Trash2,
        action: handleBulkDelete,
        variant: 'destructive',
        confirmMessage: 'Delete selected users?'
      }
    ],
    export: {
      formats: ['csv', 'excel'],
      includeFilters: true,
      filename: 'users-export'
    }
  }}
  persistence={{
    url: true,
    localStorage: true,
    storageKey: 'user-management-state',
    persistState: ['pagination', 'sorting', 'filters', 'search']
  }}
  callbacks={{
    onQueryChange: handleQueryChange,
    onFiltersChange: handleFiltersChange,
    onSearchChange: handleSearchChange
  }}
/>
```

---

## Feature Comparison Matrix

| Feature | Before (DataTable) | Before (DataGrid) | After (Unified) |
|---------|-------------------|-------------------|-----------------|
| **API Complexity** | Medium | High | Low ✅ |
| **Type Safety** | Good | Complex | Excellent ✅ |
| **Multi-field Search** | ❌ No | ❌ No | ✅ Yes |
| **Date Range Filters** | ❌ No | ❌ No | ✅ Yes |
| **Saved Presets** | ❌ No | ❌ No | ✅ Yes |
| **State Persistence** | ❌ No | ❌ No | ✅ Yes |
| **Bulk Operations** | Manual | Manual | ✅ Built-in |
| **Export** | Manual | Manual | ✅ Built-in |
| **Mode Switching** | Manual rewrite | Manual rewrite | ✅ One prop |

---

## Migration Path

### Phase 1: Backwards Compatible Enhancement

Enhance existing components without breaking changes:

```typescript
// Old DataTable usage still works
<DataTable table={table}>
  <DataTableToolbar table={table} />
</DataTable>

// But can now use enhanced version
<DataTable
  data={data}
  columns={columns}
  config={{
    search: { mode: 'multi-field', fields: [...] },
    filters: [...],
    pagination: { mode: 'server' }
  }}
/>
```

### Phase 2: Gradual Adoption

Components can gradually adopt unified interface:

```typescript
// Step 1: Use unified types
import type { DataDisplayConfig } from '@/shared/types/data-display';

// Step 2: Create config object
const config: DataDisplayConfig<User> = {
  // ... configuration
};

// Step 3: Use with existing component
<DataTable {...config} />

// Step 4: Later, switch to unified wrapper
<UnifiedDataDisplay {...config} />
```

### Phase 3: Full Adoption

New features built with unified interface from start:

```typescript
<UnifiedDataDisplay
  mode="auto" // Automatically chooses best component
  data={data}
  columns={columns}
  // ... unified configuration
/>
```

---

## Key Benefits

### 1. **Reduced Complexity**

**Before**:
```typescript
// UserManagement component
const { table } = useDataTable({
  data, columns, pageCount,
  manualPagination: true,
  manualSorting: true,
  manualFiltering: true,
  // ... 15 more configuration options
});

const [searchInput, setSearchInput] = useState("");
const [searchValue, setSearchValue] = useState("");
const [manualFilterValues, setManualFilterValues] = useState({});

// Complex state synchronization logic
useEffect(() => {
  // 50+ lines of state management
}, [/* 10+ dependencies */]);

return (
  <DataTable table={table}>
    <DataTableToolbar
      table={table}
      searchBar={<SearchBar ... />}
      onReset={handleReset}
      onManualFilterChange={handleManualFilterChange}
      initialFilterValues={manualFilterValues}
    >
      {/* Custom buttons */}
    </DataTableToolbar>
  </DataTable>
);
```

**After**:
```typescript
// UserManagement component
<UnifiedDataDisplay
  mode="table"
  data={users}
  columns={columns}
  search={{ mode: 'multi-field', fields: SEARCH_FIELDS }}
  filters={USER_FILTERS}
  pagination={{ mode: 'server', pageSize: 20 }}
  actions={{ create, bulk, export }}
  persistence={{ url: true, localStorage: true }}
  callbacks={{ onQueryChange }}
/>
```

### 2. **Easy Mode Switching**

```typescript
// Change one prop to switch components
<UnifiedDataDisplay
  mode={needsEditing ? 'grid' : 'table'} // ✅ Dynamic switching
  // ... rest of config stays the same
/>
```

### 3. **Type Safety**

```typescript
// Full TypeScript inference
const config: DataDisplayConfig<User> = {
  data: users, // ✅ Type: User[]
  columns: userColumns, // ✅ Type: ColumnDef<User>[]
  actions: {
    bulk: [
      {
        id: 'delete',
        action: (rows) => {
          // ✅ rows is inferred as User[]
          handleDelete(rows);
        }
      }
    ]
  }
};
```

### 4. **Built-in Features**

```typescript
// Features that required manual implementation before

// ✅ Multi-field search - built-in
search: {
  mode: 'multi-field',
  fields: [/* ... */]
}

// ✅ Date range filters - built-in
filters: [{
  type: 'date-range',
  // ...
}]

// ✅ Saved presets - built-in
presets: USER_FILTER_PRESETS

// ✅ URL state - built-in
persistence: { url: true }

// ✅ Bulk operations - built-in
actions: { bulk: [/* ... */] }

// ✅ Export - built-in
actions: { export: { formats: ['csv', 'excel'] } }
```

---

## Implementation Strategy

### Stage 1: Type Definitions ✅
- [x] Create `data-display.ts` with all types
- [x] Document interfaces and usage
- [x] Add JSDoc comments

### Stage 2: Hook Implementation
```typescript
// useDataDisplay hook (shared logic)
export function useDataDisplay<TData>(config: DataDisplayConfig<TData>) {
  // Unified state management
  // Filter state
  // Search state
  // Pagination state
  // Selection state
  
  return {
    // State
    state: {
      filters,
      search,
      pagination,
      sorting,
      selectedRows
    },
    
    // Handlers
    handlers: {
      onFilterChange,
      onSearchChange,
      onPaginationChange,
      onSortingChange,
      onSelectionChange
    },
    
    // Utilities
    utils: {
      resetFilters,
      clearSearch,
      exportData,
      loadPreset
    }
  };
}
```

### Stage 3: Component Enhancement
- Enhance DataTable to accept unified config
- Enhance DataGrid to accept unified config
- Maintain backwards compatibility

### Stage 4: Unified Wrapper (Optional)
- Create `UnifiedDataDisplay` wrapper component
- Implement intelligent mode selection
- Add convenience features

---

## Configuration Examples

### Basic Table
```typescript
<UnifiedDataDisplay
  mode="table"
  data={users}
  columns={columns}
  pagination={{ mode: 'server' }}
  callbacks={{ onQueryChange }}
/>
```

### Advanced Table with All Features
```typescript
<UnifiedDataDisplay
  mode="table"
  data={users}
  columns={columns}
  search={{
    mode: 'multi-field',
    fields: SEARCH_FIELDS,
    fuzzySearch: true
  }}
  filters={[
    { type: 'multi-select', ...ROLE_FILTER },
    { type: 'date-range', ...DATE_FILTER },
    { type: 'boolean', ...STATUS_FILTER }
  ]}
  pagination={{
    mode: 'server',
    pageSize: 20,
    pageSizeOptions: [10, 20, 50, 100]
  }}
  sorting={{
    mode: 'server',
    defaultColumn: 'createdAt',
    defaultOrder: 'desc',
    multiSort: false
  }}
  actions={{
    create: CREATE_ACTION,
    bulk: BULK_ACTIONS,
    export: EXPORT_CONFIG,
    rowActions: ROW_ACTIONS
  }}
  persistence={{
    url: true,
    localStorage: true,
    storageKey: 'users-state',
    persistState: ['pagination', 'sorting', 'filters', 'search']
  }}
  optimization={{
    debounceMs: 300,
    throttleMs: 50,
    memoize: true
  }}
  callbacks={{
    onQueryChange: handleQueryChange,
    onFiltersChange: handleFiltersChange,
    onSearchChange: handleSearchChange,
    onSelectionChange: handleSelectionChange
  }}
/>
```

### Editable Grid
```typescript
<UnifiedDataDisplay
  mode="grid"
  data={licenses}
  columns={columns}
  height={600}
  search={{
    mode: 'single',
    defaultField: 'dba'
  }}
  filters={[
    { type: 'multi-select', ...STATUS_FILTER },
    { type: 'select', ...PLAN_FILTER }
  ]}
  pagination={{
    mode: 'client',
    pageSize: 50
  }}
  actions={{
    bulk: [
      {
        id: 'delete',
        label: 'Delete Rows',
        action: handleDelete,
        variant: 'destructive'
      }
    ]
  }}
  optimization={{
    virtualScrolling: true,
    rowHeight: 'short'
  }}
  callbacks={{
    onDataChange: handleDataChange,
    onRowAdd: handleRowAdd,
    onRowsDelete: handleRowsDelete,
    onSave: handleSave
  }}
/>
```

---

## Next Steps

1. ✅ **Phase 1.1**: Document current APIs - COMPLETE
2. ✅ **Phase 1.2**: Design unified interface - COMPLETE
3. ✅ **Phase 1.3**: Create shared types - COMPLETE
4. ⏭️ **Phase 2**: Implement backend enhancements
5. ⏭️ **Phase 3**: Implement frontend components
6. ⏭️ **Phase 4**: Integration and testing

---

## References

- `component-apis.md` - Current API documentation
- `data-display.ts` - Type definitions
- `IMPLEMENTATION_PLAN.md` - Full implementation roadmap


