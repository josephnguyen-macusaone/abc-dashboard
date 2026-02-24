# Performance Improvement Plan

Analysis of backend and frontend with prioritized recommendations.

---

## Executive Summary

| Area | Current State | Priority Improvements |
|------|---------------|------------------------|
| **Backend** | Response cache skips auth'd requests; no DB query optimization | Auth-scoped caching, DB indexes, compression |
| **Frontend** | Link prefetch done; pages not code-split; redundant fetches | Dynamic imports, skip redundant fetch |
| **Network** | Sequential API calls on page load | Parallel fetches, HTTP/2 |

---

## 1. Backend Analysis

### 1.1 Response Caching

**Current:** `responseCachingMiddleware` skips caching when `req.user` is set. Auth runs at route level, so for `/api/v1/licenses` and `/api/v1/users` the flow is:

- App-level middleware runs before routes → `req.user` not set yet
- Cache key: `api:GET:path:query` (no user scope)
- Licenses/users may be cached without user isolation

**Risk:** If data is user-scoped, cached responses could be shared across users.

**Recommendation:** Add user-scoped caching for authenticated GET endpoints:

- Cache key: `api:GET:path:query:userId` (when `req.user` exists)
- Short TTL (e.g. 30–60s) for licenses/users
- Invalidate on write (POST/PUT/DELETE) – already partially implemented

**Files:** `backend/src/infrastructure/api/v1/middleware/metrics.middleware.js`, `backend/src/infrastructure/config/redis.js`

---

### 1.2 Database

**Current:**

- Knex with PostgreSQL
- License list: paginated queries with filters
- `findLicenses` and related queries use `where`, `orderBy`, `limit`, `offset`

**Recommendations:**

1. **Indexes:** Ensure indexes on:
   - `licenses(starts_at, status)` for date/status filters
   - `licenses(dba)`, `licenses(agents_name)` for search
   - `users(created_at)`, `users(role)` for user list
2. **Avoid N+1:** Check license/user list queries for per-row lookups; use joins or batch loads.
3. **Connection pool:** Verify Knex pool size for expected concurrency.

**Files:** `backend/src/infrastructure/database/migrations/`, `backend/src/infrastructure/repositories/`

---

### 1.3 Compression

**Current:** No explicit response compression.

**Recommendation:** Add `compression` middleware for JSON responses (often 70–90% size reduction).

```js
import compression from 'compression';
app.use(compression());
```

**Files:** `backend/server.js`, `backend/package.json`

---

### 1.4 External API (License Sync)

**Current:** `external-license-api-service.js` fetches from external API; sync can be slow.

**Recommendations:**

- Use connection pooling / keep-alive for external HTTP
- Consider background sync with cached results for reads
- Add timeouts and circuit breaker (partially present)

---

## 2. Frontend Analysis

### 2.1 Page Loading (Dashboard → Licenses / Users)

**Done:**

- Link-based prefetching (`NavigationLink` with Next.js `Link`)
- Sync progress animation

**Done:**

| Task | Impact | Effort | Files |
|------|--------|--------|-------|
| Skip redundant license fetch | Medium | Low | `use-initial-license-filters.ts`, `license-management-page.tsx` |
| Dynamic import pages | Medium | Low | `licenses/page.tsx`, `users/page.tsx` |
| Parallel API calls on dashboard load | Medium | Low | `admin-dashboard.tsx`, `license-metrics-section.tsx` |

---

### 2.2 Skip Redundant License Fetch

**Current:** `useInitialLicenseFilters` always fetches on mount. When navigating Dashboard → Licenses, the license store may already have data from AdminDashboard.

**Recommendation:** Skip fetch if `lastFetchedAt` is within last 30–60 seconds and filters match.

```ts
// use-initial-license-filters.ts
const FRESH_THRESHOLD_MS = 30_000;
if (lastFetchedAt && Date.now() - lastFetchedAt < FRESH_THRESHOLD_MS && filtersMatch) {
  return; // Use cached data
}
```

**Files:** `use-initial-license-filters.ts`, `license-store.ts` (expose `lastFetchedAt`, `selectLicenseLastFetchedAt`)

---

### 2.3 Dynamic Import Heavy Pages

**Current:** `LicenseManagementPage` and `UserManagementPage` are statically imported in page files.

**Recommendation:** Use `next/dynamic` for code splitting:

```tsx
// licenses/page.tsx
const LicenseManagementPage = dynamic(
  () => import('@/presentation/components/pages/dashboard/license-management-page').then(m => ({ default: m.LicenseManagementPage }))
);
```

**Files:** `licenses/page.tsx`, `users/page.tsx`

---

### 2.4 Bundle Size

**Current:**

- Layout uses many `dynamic()` imports (AuthInitializer, ToastProvider, etc.)
- AdminDashboard uses dynamic imports for LicenseMetricsSection, LicenseTableSection
- LicensesDataGrid is dynamically imported

**Recommendations:**

- Run `npm run build:analyze` to find large chunks (uses `--webpack` for Next.js 16; reports in `.next/analyze/`)
- Lazy-load heavy libs (e.g. recharts, date pickers) only where needed
- Consider `@tanstack/react-virtual` for large tables if not already used

---

### 2.5 Data Fetching

**Current:** Each page fetches on mount. Dashboard fetches licenses, metrics, attention; Licenses page fetches licenses; Users page fetches users.

**Recommendations:**

- Use `Promise.all` or parallel requests where multiple endpoints are needed
- Consider React Query/SWR for caching and deduplication (optional, larger change)

---

## 3. Implementation Priority

### Phase 1 – Quick Wins (1–2 days)

| # | Task | Impact | Effort |
|---|------|--------|--------|
| 1 | Add `compression` middleware (backend) | High | Low |
| 2 | Skip redundant license fetch (frontend) | Medium | Low |

### Phase 2 – Medium Effort (3–5 days)

| # | Task | Impact | Effort |
|---|------|--------|--------|
| 3 | Auth-scoped response caching (backend) | High | Medium |
| 4 | Dynamic import LicenseManagementPage, UserManagementPage | Medium | Low |
| 5 | DB indexes for common filters | High | Medium |

### Phase 3 – Larger Changes (1–2 weeks)

| # | Task | Impact | Effort |
|---|------|--------|--------|
| 6 | Bundle analysis and optimization | Medium | Medium |
| 7 | Parallel API calls on dashboard load | Medium | Low |
| 8 | Redis for production (CACHE_TYPE=redis) | High | Low (config) |

---

## 4. Metrics to Track

- **Backend:** P95 response time for `/api/v1/licenses`, `/api/v1/users`, `/api/v1/licenses/dashboard-metrics`
- **Frontend:** LCP, TTI, FCP (Lighthouse / Web Vitals)
- **Cache:** Hit ratio (X-Cache-Status: HIT vs MISS)

---

## 5. Architecture Review (WebSocket, Redis, External Sync, Redundancy)

### 5.1 WebSocket

| Item | Status |
|------|--------|
| **Usage** | `useRealtimeSync` in `dashboard-template.tsx` only. Listens for `license:sync_complete`, `license:data_changed`. |
| **When disabled** | `NEXT_PUBLIC_WEBSOCKET_ENABLED !== 'true'` → hook returns early, no socket.io connection. |
| **Redundancy** | None. Single hook, single usage. `socket.io-client` stays in package.json for when WebSocket is enabled. |
| **Recommendation** | Keep as-is. Disabled by default; no redundant connections. |

### 5.2 External License Sync

| Item | Status |
|------|--------|
| **Usage** | `ExternalLicenseApiService`, `SyncExternalLicensesUseCase`, `ExternalLicenseController`. Fetches from external API, syncs to DB. |
| **Required for** | License sync (manual + scheduled). `EXTERNAL_LICENSE_API_URL` and `EXTERNAL_LICENSE_API_KEY` in `.env`. |
| **Redundancy** | None. Single source of truth for external sync. |
| **Recommendation** | Keep. Required for license sync. |

### 5.3 Redundant / Unused Files

| File | Status | Action |
|------|--------|--------|
| **`cache-service.js`** | **Unused.** Exports `cacheService`, `CacheKeys`, `CacheTTL`, `CacheInvalidation` but no runtime code imports them. Actual cache is `redis.js` (metrics.middleware, security.middleware, monitoring). | Consider removing or wiring up. If removed, delete `application/services` export of `CacheService` and `ICacheService` if unused. |
| **`sync-status-icon.tsx`** | Already removed (merged into `LicenseSyncButton`). | — |
| **DEPLOYMENT-GUIDE.md** | Still references "SyncStatusIcon". | ✅ Updated to "LicenseSyncButton" / polling. |
| **SYNC-AND-NAVIGATION-ANALYSIS.md** | References `sync-progress-overlay.tsx`; actual file is `license-sync-progress-overlay.tsx`. | ✅ Updated doc. |

### 5.4 Redis in docker-compose

| Question | Answer |
|----------|--------|
| **Do we need Redis?** | Only when `CACHE_TYPE=redis`. When `CACHE_TYPE=memory` (or unset), `redis.js` uses `OptimizedInMemoryCache` – no Redis server needed. |
| **Can we consolidate Redis inside backend?** | **No.** Redis is a separate server process. You cannot embed it in Node.js. |
| **Can we skip deploying Redis?** | **Yes.** Set `CACHE_TYPE=memory` (or leave default as memory). Backend will use in-memory cache. |
| **Current docker-compose** | Backend `depends_on: redis` with `condition: service_healthy`. So Redis must be up even when `CACHE_TYPE=memory`. |

**Recommendation:** Make Redis optional for deployment:

1. **Option A – Simpler deploy (no Redis):**  
   - Set `CACHE_TYPE=memory` in `.env` (or default in docker-compose).  
   - Remove `redis` service and `redis` from backend `depends_on`.  
   - Remove `redis_data` volume.  
   - Backend uses in-memory cache. Suitable for single-instance, small deployments.

2. **Option B – Keep Redis for production:**  
   - Use `CACHE_TYPE=redis` when you need shared cache across multiple backend instances or persistent cache.  
   - Keep Redis service and `depends_on` as-is.

3. **Option C – Conditional Redis:**  
   - Remove `redis` from backend `depends_on`.  
   - Backend starts without waiting for Redis. If `CACHE_TYPE=redis` and Redis is down, `initRedis` falls back to in-memory.  
   - Redis can be started separately (e.g. via profile) when needed.

---

## 6. Files Reference

| Area | Key Files |
|------|-----------|
| Backend cache | `metrics.middleware.js`, `redis.js` (primary); `cache-service.js` (unused) |
| Backend DB | `license-repository.js`, `user-repository.js`, migrations |
| Frontend fetch | `use-initial-license-filters.ts`, `license-store.ts` |
| Frontend pages | `licenses/page.tsx`, `users/page.tsx` |
| Frontend layout | `app/layout.tsx`, `dashboard-template.tsx` |
