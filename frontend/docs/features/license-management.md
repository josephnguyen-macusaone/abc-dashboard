# License Management (Frontend)

This doc covers the license list UI: **DataTable** (read-only) vs **DataGrid** (Excel-like editing), filter alignment, styling, and where to find things in the codebase.

---

## 1. Overview

| Component | Used on | Behavior |
|-----------|---------|----------|
| **LicensesDataTable** | Dashboard (license section) | Read-only: sort, filter, paginate. Shadcn-style table. |
| **LicensesDataGrid** | License Management page | Excel-like: focus, selection, inline editing, copy/paste, keyboard nav. Virtualized grid. |

- **Data source:** Backend `/api/v1/licenses` (Postgres); optional mock for dev.
- **Filters:** Both views use the same filter set: **Status**, **Plan**, **Term** (plus a single search bar for DBA/agent name).
- **Pagination / sort / filter:** Server-side when used with the dashboard or license management page that pass `onQueryChange`.

---

## 2. DataGrid vs DataTable

### 2.1 Architecture

| | DataTable | DataGrid |
|--|-----------|----------|
| **Stack** | `@tanstack/react-table` + Shadcn `Table` | `@tanstack/react-table` + `@tanstack/react-virtual` + custom DataGrid |
| **Editing** | Read-only cells | Focus, selection, inline edit, copy/paste |
| **Layout** | Semantic `<table>` | CSS grid + virtualized rows |

TanStack Table is **headless**: it does not provide editing, cell focus, or copy/paste. Excel-like behavior in the app is implemented in the **DataGrid** layer (state, cell variants, keyboard handling).

### 2.2 What the DataGrid implements

- **State** (`use-data-grid` / `TableMeta`): `focusedCell`, `editingCell`, selection, clipboard, navigation (arrows, Tab, Enter, etc.).
- **TableMeta:** `onDataUpdate`, `onCellEditingStart` / `onCellEditingStop`, cell click/double-click/mouse/context menu, `cellMapRef`, `readOnly`.
- **Cell variants** (`data-grid-cell-variants.tsx`): short-text, number, checkbox, select, multi-select, date — each with display vs edit mode and `DataGridCellWrapper` for focus and keyboard.

So **Excel-like editing lives in the DataGrid**; the **DataTable is intentionally read-only**.

### 2.3 Style alignment

The DataGrid reuses **Shadcn table styling** via shared class names from `presentation/components/atoms/primitives/table.tsx` (`tableHeadCellClass`, `tableRowClass`, `tableCellClass`, `tableFooterClass`). The DataTable uses the actual `<Table>`, `<TableHead>`, `<TableRow>`, `<TableCell>` components. Both share the same look for header, row hover/stripe, cell padding, and pagination area.

**Intentional differences:**

- Grid: column resize, pin, virtualization, focus/selection/editing styles (ring, bg-primary/10); optional vertical borders.
- Table: semantic table, no cell focus, no pin in header menu.

### 2.4 References (codebase)

- **Grid (editing):** `presentation/components/molecules/data/data-grid/`, `presentation/hooks/use-data-grid.ts`, `shared/types/data-grid.ts`, `presentation/components/molecules/domain/license-management/licenses-data-grid.tsx`
- **Table (read-only):** `presentation/components/molecules/data/data-table/`, `presentation/components/molecules/domain/license-management/licenses-data-table.tsx`
- **TanStack:** `@tanstack/react-table`, `@tanstack/react-virtual` (grid only)

To get Excel-like editing on the **dashboard** license view, use **LicensesDataGrid** there (or a shared grid), not the current DataTable.

---

## 3. Filters (Status, Plan, Term)

Both the **DataTable** and **DataGrid** toolbars expose the same three filters: **Status**, **Plan**, **Term**. DBA/agent filtering is done only via the **search bar** (backend matches DBA and agent names).

### 3.1 DataTable

- **Toolbar:** `DataTableToolbar` renders one filter control per column where `column.getCanFilter()` is true.
- **Columns:** In `license-table-columns.tsx`, only **status**, **plan**, and **term** have `enableColumnFilter: true` (multiSelect). DBA has `enableColumnFilter: false`.

### 3.2 DataGrid

- **Toolbar:** Search bar + **three filter buttons** (Status, Plan, Term) implemented with `DataTableFacetedFilter`, plus a Reset button when any filter is active. No single “Filter” menu.
- **Columns:** In `license-grid-columns.tsx`, **dba** has `enableColumnFilter: false` so it does not appear as a filter; **status**, **plan**, **term** have `enableColumnFilter: true` and use the same options as the table (`STATUS_OPTIONS`, `PLAN_OPTIONS`, `TERM_OPTIONS` from `license-table-columns.tsx`).

### 3.3 Verification

- License Management (grid): toolbar shows Search, Status, Plan, Term, Reset (when filters active), Row height, View.
- Dashboard (table): toolbar shows Search, Status, Plan, Term, Reset (when filters active), View options.
- Search bar in both cases filters by DBA/agent name only; no separate DBA column filter.

---

## 4. Cell tooltip (DataGrid)

Truncated text in grid cells (e.g. DBA, Agents Name) shows the full value in a **tooltip** on hover:

- **Delay:** 400 ms to avoid flashing on quick moves.
- **Style:** Popover-like (border, shadow, `bg-popover`), `text-sm`, padding, `max-w-[min(40rem,90vw)]`, word break. Arrow fill matches tooltip background.

Defined in `data-grid-cell-variants.tsx` (ShortTextCell) and uses `Tooltip` / `TooltipContent` from `presentation/components/atoms/primitives/tooltip.tsx`.

---

## 5. Files of interest

| Area | Path |
|------|------|
| License management page | `presentation/components/organisms/license-management/license-management.tsx` |
| Grid (editable) | `presentation/components/molecules/domain/license-management/licenses-data-grid.tsx` |
| Table (read-only) | `presentation/components/molecules/domain/license-management/licenses-data-table.tsx` |
| Grid columns | `presentation/components/molecules/domain/license-management/license-grid-columns.tsx` |
| Table columns | `presentation/components/molecules/domain/license-management/license-table-columns.tsx` |
| DataGrid components | `presentation/components/molecules/data/data-grid/` |
| DataTable components | `presentation/components/molecules/data/data-table/` |
| Table primitives (shared styles) | `presentation/components/atoms/primitives/table.tsx` |
