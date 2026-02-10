# LicensesDataTable – Fix Plan

**File:** `src/presentation/components/molecules/domain/license-management/licenses-data-table.tsx`  
**Scope:** Linter/React Compiler issues only (no behavior change).

---

## Current issues (3)

| # | Line | Severity | Issue |
|---|------|----------|--------|
| 1 | 106 | WARNING | `setTableManualFilters` is destructured from `useDataTableStore()` but never used. |
| 2 | 197/241 | ERROR | React Compiler: `handleSearchChange` useCallback – inferred dependency `setPage` not in deps; memoization could not be preserved. |
| 3 | 241 | WARNING | React Hook useCallback missing dependency: `setPage`. |

---

## Fix plan

### 1. Remove unused `setTableManualFilters` (L106)

- **Action:** Remove `setTableManualFilters` from the destructuring so the store is only used for the actions that are actually called: `setTableSearch`, `updateTableManualFilter`, `clearTableFilters`.
- **Reason:** Satisfies ESLint `no-unused-vars` and keeps the file clear.

### 2. Add `setPage` to `handleSearchChange` dependency array (L241)

- **Action:** Add `setPage` to the dependency array of `useCallback` for `handleSearchChange`:
  - Before: `[table, onQueryChange, manualFilterValues, tableId, setTableSearch, searchField]`
  - After: `[table, onQueryChange, manualFilterValues, tableId, setTableSearch, searchField, setPage]`
- **Reason:** The callback uses `setPage(1)` (L212). Exhaustive-deps and React Compiler expect every used value to be listed so the callback is stable and correct when deps change.

---

## Verification

- Run `npm run build` (or `npx tsc --noEmit`) and ensure no errors.
- Run ESLint on this file and confirm the 3 issues above are resolved.
- Manually: type in search, change filters, reset – confirm no regressions.

---

## Out of scope (for later)

- React Compiler “Compilation Skipped” may still appear if other manual memoization in the file doesn’t match inferred deps; fixing the `setPage` dep is the main fix for `handleSearchChange`.
- Any refactors to reduce refs/effects (e.g. deriving values instead of syncing in effects) are separate improvements.
