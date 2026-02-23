# Column Visibility Filter - Implementation Plan

## 📋 Overview

This document outlines the implementation plan for a **Column Visibility Filter** component that allows users to show/hide table columns dynamically. The implementation follows **Atomic Design Principles**.

---

## 🎯 Feature Requirements

### Functional Requirements
1. A combo box (multi-select dropdown) containing all available columns
2. Users can select/unselect columns to show/hide them in the table
3. Column visibility state should persist during the session
4. Responsive design for various screen sizes

### User Experience
- Clear visual feedback when columns are toggled
- Smooth transitions when columns appear/disappear
- Column order preserved regardless of visibility state

---

## 📊 Data Structure Analysis

Based on the provided mockup, the table contains the following columns:

| # | Column Name | Field Key | Data Type | Description |
|---|-------------|-----------|-----------|-------------|
| 1 | No. | `id` | number | Row identifier |
| 2 | DB A | `dbA` | string | Database A reference |
| 3 | Zip | `zip` | string | ZIP code |
| 4 | Activate Date | `startsAt` | date | License activation date (maps to ActivateDate from API) |
| 5 | Status | `status` | enum | Current status (Active/Cancel/Pending) |
| 6 | Plan | `plan` | string | Subscription plan type |
| 7 | Term | `term` | enum | Monthly/Yearly term |
| 8 | Last Payment $ | `lastPayment` | number | Last payment amount |
| 9 | Last Active | `lastActive` | date | Last activity date |
| 10 | SMS Purchased | `smsPurchased` | number | SMS credits purchased |
| 11 | SMS Sent | `smsSent` | number | SMS messages sent |
| 12 | SMS Balance | `smsBalance` | number | Remaining SMS credits |
| 13 | Agents | `agents` | number | Number of agents |
| 14 | Agents Name | `agentsName` | string[] | Agent names |
| 15 | Agents Cost | `agentsCost` | number | Agent costs |
| 16 | Notes | `notes` | string | Additional notes |

### Special Business Rules
- When status is "Cancel", a cancel date is required
- Last Payment includes: E-processing + CRM + Accountant tool
- SMS Purchased/Sent display format: `(ABC)` - likely a code reference

---

## 🏗️ Updated Implementation Structure - Generic Table Components

### Generic Components to Create (Reusable)
```
presentation/
├── components/
│   ├── molecules/
│   │   ├── domain/dashboard/
│   │   │   ├── column-visibility-dropdown.tsx # Uses existing DropdownMenuCheckboxItem
│   │   │   └── index.ts                      # UPDATED: Add export
│   │   └── table/
│   │       ├── table-data.tsx                 # NEW: Generic table with sorting & pagination (reusable)
│   │       ├── table-row.tsx                 # NEW: Generic table row component (reusable)
│   │       ├── table-toolbar.tsx             # NEW: Generic toolbar with search + filters (reusable)
│   │       └── index.ts                      # Export table components
│   └── organisms/dashboard/sections/
│       └── license-table-section.tsx         # NEW: Main section component using generic components
└── infrastructure/stores/
    └── table-ui-store.ts                     # ✅ CREATED: Column visibility state management (Zustand)
└── shared/
    ├── constants/ui.ts                       # UPDATED: Add license types here
    └── mock/
        └── license-mock-data.ts               # NEW: Mock data directory
```

---

## 📦 Mock Data Structure

### TypeScript Interfaces

**Types are defined in `shared/constants/ui.ts`** (following existing patterns):

```typescript
// From shared/constants/ui.ts
export interface LicenseRecord {
  id: number;
  dbA: string;
  zip: string;
  startsAt: string;
  status: LicenseStatus;
  cancelDate?: string;
  plan: string;
  term: LicenseTerm;
  lastPayment: number;
  lastActive: string;
  smsPurchased: number;
  smsSent: number;
  smsBalance: number;
  agents: number;
  agentsName: string[];
  agentsCost: number;
  notes: string;
}

export interface ColumnDefinition {
  key: string;
  label: string;
  visible: boolean;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export type LicenseStatus = 'active' | 'cancel' | 'pending' | 'expired';
export type LicenseTerm = 'monthly' | 'yearly';
```

### Sample Mock Data (10 Records)

**Mock data is available in `shared/mock/license-mock-data.ts`**:

```typescript
// From shared/mock/license-mock-data.ts
export const mockLicenses: LicenseRecord[] = [
  {
    id: 1,
    dbA: "ABC Corp",
    zip: "90210",
    startsAt: "2024-01-15",
    status: "active",
    plan: "Premium",
    term: "yearly",
    lastPayment: 299.99,
    lastActive: "2024-12-01",
    smsPurchased: 1000,
    smsSent: 450,
    smsBalance: 550,
    agents: 3,
    agentsName: ["John Doe", "Jane Smith", "Bob Wilson"],
    agentsCost: 150.00,
    notes: "VIP customer"
  },
  // ... 9 more records with varied data
];

export const licenseColumns: ColumnDefinition[] = [
  // All 16 column definitions with proper configuration
];

export const defaultVisibleColumns = licenseColumns.slice(0, 8).map(col => col.key);
```

---

## 🎨 Component API Design

### ColumnVisibilityDropdown Props

```typescript
interface ColumnVisibilityDropdownProps {
  columns: ColumnDefinition[];
  visibleColumns: string[];
  onColumnToggle: (columnKey: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  className?: string;
}
```

### LicenseDataTable Props

```typescript
interface LicenseDataTableProps {
  data: LicenseRecord[];
  columns: ColumnDefinition[];
  visibleColumns: string[];
  sortConfig?: { field: string; direction: 'asc' | 'desc' };
  onSort?: (field: string) => void;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
}
```

### LicenseTableToolbar Props

```typescript
interface LicenseTableToolbarProps {
  columns: ColumnDefinition[];
  visibleColumns: string[];
  onColumnToggle: (columnKey: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  className?: string;
}
```

### TableUIStore (Zustand)

**Store created in `infrastructure/stores/table-ui-store.ts`**:

```typescript
// Key functions available:
interface TableUIStore {
  // Column visibility
  setColumnVisibility: (tableId: string, visibleColumns: string[]) => void;
  toggleColumnVisibility: (tableId: string, columnKey: string) => void;
  showAllColumns: (tableId: string, allColumns: string[]) => void;
  hideAllColumns: (tableId: string, essentialColumns?: string[]) => void;
  getColumnVisibility: (tableId: string) => string[];

  // Sort state
  setSortState: (tableId: string, field: string, direction: 'asc' | 'desc') => void;
  getSortState: (tableId: string) => { field: string; direction: 'asc' | 'desc' } | null;
}
```

**Usage in components:**
```typescript
import { useTableUIStore } from '@/infrastructure/stores';

const { toggleColumnVisibility, getColumnVisibility } = useTableUIStore();
```

---

## 📁 Updated File Structure (Following Existing Patterns)

```
frontend/src/presentation/
├── components/
│   ├── molecules/
│   │   ├── domain/dashboard/
│   │   │   ├── column-visibility-dropdown.tsx # NEW: Column visibility dropdown
│   │   │   └── index.ts                       # UPDATED: Add export
│   │   └── table/
│   │       ├── table-data.tsx                  # NEW: Generic reusable table component
│   │       ├── table-row.tsx                  # NEW: Generic reusable row component
│   │       ├── table-toolbar.tsx              # NEW: Generic toolbar with search + filters
│   │       └── index.ts                       # Export table components
│   └── organisms/dashboard/sections/
│       └── license-table-section.tsx          # NEW: License section using generic components
├── hooks/
│   └── use-column-visibility.ts               # NEW: Column visibility hook
└── shared/
    ├── constants/ui.ts                        # UPDATED: Add license types
    └── mock/
        └── license-mock-data.ts               # NEW: Mock data directory
```

---

## 🔄 Streamlined Implementation Phases

### Phase 1: Foundation (Types & Mock Data)
- [ ] Create TypeScript interfaces (`license.types.ts`)
- [ ] Create mock data with 10+ realistic records (`license-mock-data.ts`)
- [ ] Define column configuration structure

### Phase 2: Core Logic (Zustand Store) ✅ COMPLETED
- [x] Create `table-ui-store.ts` Zustand store for table UI state management
- [x] Implement column visibility toggle, show all, hide all functions
- [x] Add persistence for user column preferences

### Phase 3: Generic Components (Highly Reusable)
- [ ] Create `TableRow` in `molecules/table/` - Generic row renderer using column definitions
- [ ] Create `TableData` in `molecules/table/` - Generic table with sorting & pagination (abstracted from UserTable)
- [ ] Create `TableToolbar` in `molecules/table/` - Generic toolbar combining `SearchBar` + `ColumnVisibilityDropdown`
- [ ] Create `ColumnVisibilityDropdown` in `molecules/domain/dashboard/` using `DropdownMenuCheckboxItem`

### Phase 4: License Implementation
- [ ] Create `LicenseTableSection` in `organisms/dashboard/sections/` using generic components
- [ ] Configure generic components with license data and column definitions
- [ ] Integrate with existing `Pagination` component
- [ ] Add smooth transitions using existing dropdown animations

### Phase 5: Polish & Testing
- [ ] Add responsive design considerations
- [ ] Ensure accessibility (leverage existing ARIA support)
- [ ] Write unit tests for hook and components
- [ ] Test keyboard navigation (inherited from dropdown components)

---

## 🎯 UI/UX Specifications

### Column Visibility Dropdown
- **Trigger**: Button with `List` icon + "Columns" text (using existing Button component)
- **Dropdown Position**: Below trigger, aligned left (using DropdownMenu positioning)
- **Features**:
  - Search input at top (using existing SearchBar component)
  - "Select All" / "Deselect All" buttons (using DropdownMenuLabel + separator)
  - Scrollable list using DropdownMenuCheckboxItem
  - Column count indicator (e.g., "8/16 columns visible")

### Table
- **Header**: Sticky header with sortable columns (using existing Table components)
- **Cells**: Proper alignment based on data type (using generic TableRow component)
- **Empty State**: Centered message when no data
- **Loading State**: Skeleton rows
- **Section**: LicenseTableSection in organisms/dashboard/sections/ (following license-metrics-section pattern)

### Animations
- Column show: Fade in + slide from left (200ms)
- Column hide: Fade out + slide to left (200ms)
- Dropdown open: Scale + fade (150ms)

---

## ✅ Acceptance Criteria

1. ✅ All 16 columns are available in the dropdown
2. ✅ Clicking a column checkbox toggles visibility immediately
3. ✅ Table updates without page reload
4. ✅ At least one column must remain visible
5. ✅ Column order is preserved when toggling visibility
6. ✅ Works on mobile (responsive)
7. ✅ Keyboard accessible (Tab, Enter, Space)
8. ✅ ARIA labels for screen readers

---

## 🛠️ Tech Stack

- **Framework**: Next.js / React
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (Dropdown, Checkbox)
- **State Management**: Zustand stores (table-ui-store, auth-store, theme-store)
- **Animations**: CSS transitions / Framer Motion (optional)

---

## 🔍 Existing Components to Leverage

Based on comprehensive codebase analysis, we will **maximize reuse** of these existing components:

### From `atoms/primitives/table.tsx`
- `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`
- ✅ Fully styled with Tailwind CSS, hover states, and accessibility
- ✅ Table uses `table-fixed` layout for consistent column widths
- ✅ Includes proper typography classes (MAC USA ONE design system)

### From `atoms/primitives/dropdown-menu.tsx`
- `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`
- `DropdownMenuCheckboxItem` - **Perfect for column visibility toggles!**
- `DropdownMenuLabel`, `DropdownMenuSeparator`
- ✅ Built-in animations, keyboard navigation, and accessibility
- ✅ Uses MAC USA ONE typography (`text-body-s` for items, `text-label-s` for labels)
- ✅ Includes Check icon indicators and proper focus states

### From `atoms/forms/`
- `Checkbox` - Radix UI based with proper styling and accessibility
- `Input` - For search functionality
- `Button` - For dropdown triggers and actions
- `Typography` - For consistent text styling

### From `molecules/ui/`
- `SearchBar` - Complete search component with Search icon
  - ✅ Includes relative positioning, icon placement, and proper styling
  - ✅ Accepts placeholder, value, onChange props
- `Pagination` - Full pagination component with navigation
  - ✅ Shows "Showing X to Y of Z results"
  - ✅ Handles page numbers, previous/next buttons
  - ✅ Smart ellipsis for large page counts
  - ✅ Uses MAC USA ONE typography

### From `molecules/domain/user-management/`
- **Reference Implementation**: `UserTable` component shows how to implement:
  - ✅ Sorting with visual indicators (ChevronUp/ChevronDown icons)
  - ✅ Pagination state management
  - ✅ Sort direction toggling
  - ✅ Items per page handling

---

## 📁 Updated File Structure (Following Existing Patterns)

```
frontend/src/presentation/
├── components/
│   ├── molecules/
│   │   ├── domain/dashboard/
│   │   │   ├── column-visibility-dropdown.tsx # NEW: Column visibility dropdown
│   │   │   └── index.ts                       # UPDATED: Add export
│   │   └── table/
│   │       ├── table-data.tsx                  # NEW: Generic reusable table component
│   │       ├── table-row.tsx                  # NEW: Generic reusable row component
│   │       ├── table-toolbar.tsx              # NEW: Generic toolbar with search + filters
│   │       └── index.ts                       # Export table components
│   └── organisms/dashboard/sections/
│       └── license-table-section.tsx          # NEW: License section using generic components
├── infrastructure/stores/
│   └── table-ui-store.ts                     # ✅ CREATED: Column visibility state management (Zustand)
└── shared/
    ├── constants/ui.ts                        # UPDATED: Add license types here
    └── mock/
        └── license-mock-data.ts               # NEW: Mock data directory
```

---

## 📝 Updated Notes & Decisions

### ✅ **Answered Questions from Analysis:**

1. **Mock Data Count**: ✅ 10 records is perfect for development and testing
2. **Column Accuracy**: ✅ All 16 columns confirmed correct, defer add/remove to future iteration
3. **Domain Name**: ✅ Changed to `license-management` (better reflects business domain based on dashboard metrics)
4. **Additional Features**: ✅ Added search within columns, sorting, and pagination using existing components

### Technical Notes:
- **Maximal Component Reuse**: Leveraged 15+ existing components to minimize new development
- **Dedicated Table Folder**: Created `molecules/table/` for ALL table-related components (TableData, TableRow, TableToolbar)
- **Generic Table Architecture**: Complete reusable table system abstracted from UserTable pattern
- **High Reusability**: Generic components can be used for users, licenses, or any tabular data with column definitions
- **Clear Organization**: Generic table components in dedicated folder, dashboard-specific components in domain/dashboard/
- **State Management**: Using Zustand store following existing pattern (auth-store, theme-store, user-store)
  - ✅ **Persistence**: Column visibility and sort preferences persisted per table
  - ✅ **Type Safety**: Full TypeScript with proper interfaces
  - ✅ **Table-specific**: Each table has its own state (license-table, user-table, etc.)
  - ✅ **Business Rules**: Ensures minimum columns remain visible when toggling
- **Types in Constants**: License types added to `shared/constants/ui.ts` (not separate types file)
- **Mock Data Location**: Created dedicated `shared/mock/` directory for test data
- **No Template Needed**: Section component handles composition directly
- **Reference Implementation**: `UserTable` abstracted into generic components with sorting/pagination
- **Domain Context**: License section uses generic components with license-specific configuration
- **Future-Proof**: Generic table can be easily extended for other dashboard sections

---

## 🔧 Generic Table Architecture

### TableData<T>
- **Purpose**: Reusable table component with sorting and pagination
- **Location**: `molecules/table/table-data.tsx`
- **State Management**: Uses `useTableUIStore` for column visibility
- **Props**:
  - `data: T[]` - Array of any data type
  - `columns: ColumnDefinition[]` - Column configuration
  - `visibleColumns?: string[]` - Which columns to show
  - `sortConfig?: SortConfig` - Current sort state
  - `onSort?: (field: string) => void` - Sort callback
  - `loading?: boolean` - Loading state
  - `emptyMessage?: string` - Empty state message

### TableRow<T>
- **Purpose**: Generic row renderer that automatically handles column visibility and data formatting
- **Location**: `molecules/table/table-row.tsx`
- **Props**:
  - `item: T` - Single data item
  - `columns: ColumnDefinition[]` - Column definitions
  - `visibleColumns: string[]` - Which columns to render

### Benefits of Generic Approach:
- ✅ **DRY Principle**: Single table implementation for all dashboard tables
- ✅ **Consistency**: Same sorting, pagination, and column visibility across all tables
- ✅ **Maintainability**: Bug fixes and features benefit all table implementations
- ✅ **Type Safety**: Full TypeScript support with generic constraints
- ✅ **Extensibility**: Easy to add new data types by providing column definitions

---

## 🚀 Ready for Streamlined Implementation

**Key Advantages of Updated Plan:**
- ⚡ **Faster Development**: Reuse 80% of required functionality from existing components
- 🎯 **Consistent UX**: Inherits accessibility, animations, and styling from established patterns
- 🔧 **Maintainable**: Follows existing architecture and naming conventions
- 📱 **Future-Ready**: Built-in responsive design and keyboard navigation

**Next Steps:** Ready to proceed with implementation using the streamlined 5-phase approach above.

