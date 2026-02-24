# Sync Progress & Page Loading – Analysis & Plan

## 1. Sync Percentage Animation ("cho nhảy %")

### Current Behavior
- **Location**: `license-sync-progress-overlay.tsx` → `LoadingOverlay` with `hidePercentLabel`
- **Display**: Main text `Syncing license data (X%). Please wait!` + progress bar
- **Indeterminate mode** (when backend has no `syncProgress` yet):
  - `indeterminatePercent` increments 0→1→2→…→15
  - Interval: 500ms per 1%
  - Takes ~7.5s to reach 15%

### Problem
- Percentage stays at 0% for the first 500ms
- Increment is slow (1% every 500ms)
- Users may think the system is stuck instead of actively syncing

### Solution
Make the percentage visibly “jump” so users see active progress:

1. **Faster indeterminate animation**
   - Reduce interval from 500ms → 200ms
   - Increase step from 1% → 2–3% per tick
   - Optional: oscillate 0→1→2→3→2→1→0 for a “pulsing” effect

2. **Show percent label**
   - Remove `hidePercentLabel` so the percent appears below the progress bar
   - Add a subtle CSS animation (e.g. pulse) on the percent number when indeterminate

3. **Files to change**
   - `frontend/src/presentation/components/molecules/domain/dashboard/license-sync-progress-overlay.tsx`

---

## 2. Slow Page Loading (Dashboard → License / User Management)

### Current Flow
1. User clicks “License Management” or “User Management” in sidebar
2. `handleNavigate` → `startTransition` + `router.push(href)`
3. `isTransitioning` → full-screen `LoadingOverlay text="Loading..."`
4. Next.js loads route segment (`licenses/page.tsx` or `users/page.tsx`)
5. Page mounts: `ProtectedRoute` → `DashboardTemplate` → `LicenseManagementPage` / `UserManagementPage`
6. Page fetches data on mount (`fetchLicenses`, `fetchUsers`)

### Root Causes

| Cause | Impact |
|-------|--------|
| **No prefetching** | Sidebar uses `onClick` + `router.push`, not `Link`. No route or data prefetch. |
| **Full re-mount** | Each navigation mounts a new page tree. No shared layout optimization. |
| **Data fetch on mount** | Licenses/users fetched only after page mounts. User waits for route + fetch. |
| **`force-dynamic`** | Both pages use `export const dynamic = 'force-dynamic'` – no static optimization. |
| **Heavy components** | LicenseManagement (DataGrid) and UserManagement are large and not code-split. |

### Recommendations

#### A. Add Link-based prefetching (high impact)
- Replace `onClick` + `router.push` with Next.js `Link` for Dashboard, Licenses, Users
- Next.js will prefetch these routes on hover/viewport
- Keep `startTransition` for non-prefetched routes if needed

#### B. Prefetch data on hover (medium impact)
- On sidebar item hover, optionally prefetch licenses/users into store
- Requires careful handling to avoid duplicate fetches and stale data

#### C. Reuse data when possible (medium impact)
- Dashboard already fetches licenses (AdminDashboard)
- When navigating Dashboard → Licenses, license store may already have data
- `useInitialLicenseFilters` always fetches on mount – consider skipping if data is fresh (e.g. `lastFetchedAt` within last N seconds)

#### D. Dynamic import heavy pages (medium impact)
- Use `next/dynamic` for LicenseManagementPage and UserManagementPage
- Show skeleton while loading
- Reduces initial bundle and improves TTI

#### E. Route-level loading states (low impact, quick win)
- `licenses/loading.tsx` and `users/loading.tsx` already exist
- Ensure they show meaningful content (e.g. skeleton) instead of generic “Loading…”
- Next.js shows these during route segment load

### Implementation Priority
1. **Quick win**: Sync percentage animation (Issue 1) ✅ Done
2. **High impact**: Switch sidebar to `Link` for prefetching ✅ Done
3. **Medium impact**: Skip redundant license fetch when navigating from Dashboard with fresh data ✅ Done
4. **Medium impact**: Dynamic import for LicenseManagement and UserManagement pages ✅ Done

---

## Files Summary

| Task | Files | Status |
|------|-------|--------|
| Sync % animation | `license-sync-progress-overlay.tsx` | ✅ Implemented |
| Link prefetching | `sidebar-navigation.tsx`, `sidebar-navigation-link.tsx` | ✅ Implemented |
| Skip redundant fetch | `use-initial-license-filters.ts`, `license-management-page.tsx` | ✅ Implemented |
| Dynamic imports | `licenses/page.tsx`, `users/page.tsx` | ✅ Implemented |
