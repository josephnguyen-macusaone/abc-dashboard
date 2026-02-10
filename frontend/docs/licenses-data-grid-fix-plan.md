# LicensesDataGrid – Fix Plan

**File:** `src/presentation/components/molecules/domain/license-management/licenses-data-grid.tsx`  
**Related:** `search-bar-with-prefix.tsx`, `licenses-data-table.tsx`

---

## 1. Linter / code quality (data grid)

- **Status:** No linter errors in `licenses-data-grid.tsx` currently.
- **Action:** None required unless new issues appear; keep dependencies and patterns consistent with `licenses-data-table.tsx` (e.g. include any callback deps the linter reports).

---

## 2. Remove “All” filter and default to “DBA”

**Goal:** Search filter has only **DBA** and **Agents Name**. Default is **DBA** (no “All” option).

### 2.1 SearchBarWithPrefix (`search-bar-with-prefix.tsx`)

| Change | Detail |
|--------|--------|
| Remove `'all'` from type | `SearchPrefixValue = 'dba' \| 'agentsName'` |
| Remove “All” from options | `PREFIX_OPTIONS`: only DBA and Agents Name |
| Default when `searchField` undefined | Use `'dba'` instead of `'all'` (`effectiveField = searchField ?? 'dba'`) |
| Select `onValueChange` | No `'all'` branch; pass through `v` as `'dba' \| 'agentsName'` |

### 2.2 LicensesDataGrid (`licenses-data-grid.tsx`)

| Change | Detail |
|--------|--------|
| Default `searchField` state | `useState<'dba' \| 'agentsName'>('dba')` (no `undefined`) |
| Pass to SearchBarWithPrefix | `searchField={searchField}` (or keep `?? "dba"` if prop stays optional) |
| onSearchFieldChange | `setSearchField(v as 'dba' \| 'agentsName')` (no `"all"` handling) |
| API params | When there is search, always send `searchField` (always `'dba'` or `'agentsName'`) |
| onClearFilters | `setSearchField('dba')` instead of `undefined` (reset to DBA) |

### 2.3 LicensesDataTable (`licenses-data-table.tsx`)

| Change | Detail |
|--------|--------|
| Default `searchField` state | `useState<'dba' \| 'agentsName'>('dba')` |
| SearchBarWithPrefix | `searchField={searchField}`, `onSearchFieldChange` without `"all"` handling |
| Reset / clear handlers | `setSearchField('dba')` instead of `undefined` |

### 2.4 Backend

- No change. `searchField=dba` and `searchField=agentsName` already behave correctly; omitting `searchField` (multi-field) is no longer used from this UI.

---

## 3. Verification

- TypeScript build passes.
- Lint passes for modified files.
- UI: dropdown shows only “DBA” and “Agents Name”; default is “DBA”.
- Search with DBA selected filters by DBA; with Agents Name, by agents name.
- Clear/Reset restores dropdown to “DBA” and clears search/filters as before.
