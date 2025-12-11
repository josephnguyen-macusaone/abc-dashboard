# tablecn Integration Documentation

> **Reference**: [tablecn GitHub Repository](https://github.com/sadmann7/tablecn) - A production-ready shadcn table with server-side sorting, filtering, and pagination.

## 📋 Executive Summary

This document outlines the plan to fully adopt **tablecn** into our frontend application, replacing the current custom table implementation with the battle-tested tablecn pattern.

---

## 🏗️ tablecn Architecture Overview

### Core Components

```
src/components/data-table/
├── data-table.tsx              # Main table wrapper component
├── data-table-toolbar.tsx      # Toolbar with filters, search, view options
├── data/table-common/table-pagination.tsx   # Shared pagination controls (re-exported as DataTablePagination)
├── data-table-column-header.tsx # Sortable/hideable column headers
├── data-table-view-options.tsx  # Column visibility toggle (View menu)
├── data-table-faceted-filter.tsx # Multi-select filter with badges
├── data-table-date-filter.tsx   # Date range filter
├── data-table-slider-filter.tsx # Range slider filter
├── data-table-action-bar.tsx    # Floating action bar on row selection
├── data-table-skeleton.tsx      # Loading skeleton
└── data-table-filter-list.tsx   # Advanced filter UI
```

### Supporting Files

```
src/hooks/
├── use-data-table.ts           # Main hook - manages all table state
├── use-debounced-callback.ts   # Debounce utility for filters
└── use-callback-ref.ts         # Callback ref utility

src/lib/
├── data-table.ts               # Utility functions (pinning styles, filter operators)
├── parsers.ts                  # URL state parsers (nuqs)
└── filter-columns.ts           # Column filter utilities

src/types/
└── data-table.ts               # TypeScript types and TanStack Table extensions

src/config/
└── data-table.ts               # Filter operators and configuration
```

---

## 🎯 Key Features

### 1. **TanStack Table Integration**
- Uses `@tanstack/react-table` for powerful table functionality
- Supports row selection, sorting, filtering, pagination, column visibility
- Column pinning support

### 2. **URL State Synchronization (nuqs)**
- Pagination, sorting, and filters are synced to URL
- Enables shareable table states
- Browser back/forward navigation works

### 3. **Filter Variants**
| Variant | Description | UI Component |
|---------|-------------|--------------|
| `text` | Text search | Input field |
| `number` | Numeric filter | Input with unit |
| `range` | Range slider | Slider component |
| `date` | Single date | Calendar picker |
| `dateRange` | Date range | Dual calendar picker |
| `select` | Single select | Dropdown with options |
| `multiSelect` | Multi-select | Checkbox list with badges |
| `boolean` | True/false | Toggle |

### 4. **Filter Operators**
```typescript
// Text operators
'iLike' | 'notILike' | 'eq' | 'ne' | 'isEmpty' | 'isNotEmpty'

// Numeric operators
'eq' | 'ne' | 'lt' | 'lte' | 'gt' | 'gte' | 'isBetween' | 'isEmpty' | 'isNotEmpty'

// Date operators
'eq' | 'ne' | 'lt' | 'gt' | 'lte' | 'gte' | 'isBetween' | 'isRelativeToToday' | 'isEmpty' | 'isNotEmpty'

// Select operators
'inArray' | 'notInArray' | 'isEmpty' | 'isNotEmpty'
```

### 5. **Action Bar on Selection**
- Floating toolbar appears when rows are selected
- Supports batch actions (delete, export, etc.)
- Escape key clears selection

---

## 📊 Comparison: Current vs tablecn

| Feature | Current Implementation | tablecn |
|---------|----------------------|---------|
| **Table Library** | Custom implementation | TanStack React Table |
| **State Management** | Zustand store | URL state (nuqs) |
| **Filtering** | Basic dropdown filters | Advanced multi-variant filters |
| **Sorting** | Manual implementation | Built-in TanStack sorting |
| **Pagination** | Client-side only | Server-side ready |
| **Column Visibility** | Custom dropdown | Searchable command menu |
| **Row Selection** | Not implemented | Full checkbox support |
| **URL Sync** | Not implemented | Full URL synchronization |
| **Loading States** | Basic spinner | Skeleton component |
| **Action Bar** | Not implemented | Floating selection bar |

---

## 📁 Files to Create

### Components (in `src/presentation/components/data-table/`)

1. **`data-table.tsx`** - Main table component
2. **`data-table-toolbar.tsx`** - Filter toolbar
3. **`data/table-common/table-pagination.tsx`** - Shared pagination controls (re-exported as `DataTablePagination`)
4. **`data-table-column-header.tsx`** - Column header with sort/hide
5. **`data-table-view-options.tsx`** - Column visibility popover
6. **`data-table-faceted-filter.tsx`** - Multi-select filter
7. **`data-table-date-filter.tsx`** - Date picker filter
8. **`data-table-slider-filter.tsx`** - Range slider filter
9. **`data-table-action-bar.tsx`** - Selection action bar
10. **`data-table-skeleton.tsx`** - Loading skeleton
11. **`index.ts`** - Exports

### Hooks (in `src/presentation/hooks/`)

1. **`use-data-table.ts`** - Main table state hook
2. **`use-debounced-callback.ts`** - Debounce utility

### Types (in `src/shared/types/`)

1. **`data-table.ts`** - Table type definitions

### Config (in `src/shared/config/`)

1. **`data-table.ts`** - Filter operators configuration

### Lib (in `src/shared/lib/`)

1. **`data-table.ts`** - Utility functions
2. **`parsers.ts`** - URL state parsers

---

## 📦 Dependencies to Add

```json
{
  "dependencies": {
    "@tanstack/react-table": "^8.21.2",
    "nuqs": "^2.4.1",
    "motion": "^12.0.6"
  }
}
```

---

## 🔄 Migration Strategy

### Phase 1: Setup Infrastructure
1. Install dependencies
2. Create directory structure
3. Copy and adapt tablecn components
4. Adapt styling to match existing design system

### Phase 2: Create Core Components
1. Implement `useDataTable` hook (adapted for our needs)
2. Create data-table components
3. Add TypeScript types

### Phase 3: Migrate UserTable
1. Create column definitions for users
2. Replace current `UserTable` with new implementation
3. Update `UserManagement` to use new table

### Phase 4: Migrate Other Tables
1. Update `LicenseTableSection`
2. Update any other table implementations

---

## 🎨 Styling Adaptations

tablecn uses shadcn/ui components. Our adaptations:

| tablecn Component | Our Equivalent |
|-------------------|----------------|
| `@/components/ui/table` | `@/presentation/components/atoms/primitives/table` |
| `@/components/ui/button` | `@/presentation/components/atoms/primitives/button` |
| `@/components/ui/badge` | `@/presentation/components/atoms/primitives/badge` |
| `@/components/ui/input` | `@/presentation/components/atoms/primitives/input` |
| `@/components/ui/select` | `@/presentation/components/atoms/primitives/select` |
| `@/components/ui/command` | Need to add |
| `@/components/ui/popover` | Need to add |
| `@/components/ui/calendar` | Need to add |
| `@/components/ui/slider` | Need to add |

---

## 📝 Column Definition Example

```typescript
// src/presentation/components/domain/user-management/user-table-columns.tsx
import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/presentation/components/data-table";
import type { User } from "@/domain/entities/user-entity";

export function getUserTableColumns(): ColumnDef<User>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: "displayName",
      accessorKey: "displayName",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Name" />
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Avatar />
          <span>{row.getValue("displayName")}</span>
        </div>
      ),
      meta: {
        label: "Name",
        variant: "text",
        placeholder: "Search names...",
      },
      enableColumnFilter: true,
    },
    {
      id: "role",
      accessorKey: "role",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Role" />
      ),
      cell: ({ row }) => <RoleBadge role={row.getValue("role")} />,
      meta: {
        label: "Role",
        variant: "multiSelect",
        options: [
          { label: "Admin", value: "admin" },
          { label: "Manager", value: "manager" },
          { label: "Staff", value: "staff" },
        ],
      },
      enableColumnFilter: true,
    },
    {
      id: "isActive",
      accessorKey: "isActive",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Status" />
      ),
      cell: ({ row }) => <StatusBadge isActive={row.getValue("isActive")} />,
      meta: {
        label: "Status",
        variant: "select",
        options: [
          { label: "Active", value: "true" },
          { label: "Inactive", value: "false" },
        ],
      },
      enableColumnFilter: true,
    },
    {
      id: "createdAt",
      accessorKey: "createdAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Created" />
      ),
      cell: ({ row }) => formatDate(row.getValue("createdAt")),
      meta: {
        label: "Created At",
        variant: "dateRange",
      },
      enableColumnFilter: true,
    },
    {
      id: "actions",
      cell: ({ row }) => <UserRowActions user={row.original} />,
      enableSorting: false,
      enableHiding: false,
    },
  ];
}
```

---

## 🚀 Usage Example

```tsx
// src/presentation/components/domain/user-management/users-table.tsx
"use client";

import { useDataTable } from "@/presentation/hooks/use-data-table";
import { DataTable, DataTableToolbar } from "@/presentation/components/data-table";
import { getUserTableColumns } from "./user-table-columns";

interface UsersTableProps {
  data: User[];
  pageCount: number;
}

export function UsersTable({ data, pageCount }: UsersTableProps) {
  const columns = getUserTableColumns();

  const { table } = useDataTable({
    data,
    columns,
    pageCount,
    initialState: {
      pagination: { pageSize: 10, pageIndex: 0 },
      sorting: [{ id: "createdAt", desc: true }],
    },
  });

  return (
    <DataTable table={table}>
      <DataTableToolbar table={table}>
        {/* Additional toolbar actions */}
        <Button onClick={handleCreateUser}>
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </DataTableToolbar>
    </DataTable>
  );
}
```

---

## ✅ Implementation Checklist

- [ ] Install `@tanstack/react-table`, `nuqs`, `motion`
- [ ] Add missing shadcn components (command, popover, calendar, slider)
- [ ] Create data-table component directory
- [ ] Implement `useDataTable` hook
- [ ] Create `DataTable` component
- [ ] Create `DataTableToolbar` component
- [ ] Create `DataTablePagination` component
- [ ] Create `DataTableColumnHeader` component
- [ ] Create `DataTableViewOptions` component
- [ ] Create `DataTableFacetedFilter` component
- [ ] Create `DataTableSkeleton` component
- [ ] Create `DataTableActionBar` component
- [ ] Add data-table types
- [ ] Add data-table config
- [ ] Add URL parsers
- [ ] Create user table columns definition
- [ ] Migrate UserTable to new implementation
- [ ] Migrate LicenseTableSection
- [ ] Remove old table components
- [ ] Update documentation

---

## 🎯 Benefits After Migration

1. **Better UX**: URL-synced state, shareable filters, keyboard navigation
2. **Less Code**: TanStack handles sorting/filtering/pagination logic
3. **Type Safety**: Full TypeScript support with column definitions
4. **Performance**: Built-in virtualization support, optimized re-renders
5. **Extensibility**: Easy to add new filter types, column features
6. **Maintainability**: Well-documented, community-supported patterns

---

## 📚 References

- [tablecn Documentation](https://tablecn.com)
- [TanStack Table Documentation](https://tanstack.com/table/latest)
- [nuqs Documentation](https://nuqs.47ng.com)
- [shadcn/ui Data Table](https://ui.shadcn.com/docs/components/data-table)

---

*Document created for ABC Dashboard Frontend - tablecn Integration Project*

