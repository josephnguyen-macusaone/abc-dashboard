# ABC Dashboard Backend — Master Improvement Plan

> Full audit: Security · Clean Architecture · Performance · Maintainability · Memory · Partner API Sync · DB Queries · CI/CD  
> Last reviewed: 2026-03-06 · Status: Phases 1–4 complete · Phase 5 planned

---

## Health Scorecard

| Category | Score | Top Issue |
|---|---|---|
| **Security** | 7/10 | In-memory rate limiter (not distributed), `cors: {origin: true}`, no refresh token revocation |
| **Clean Architecture** | 7/10 | Domain imports infra logger; use-case calls private repo methods |
| **Performance** | 6/10 | Dashboard loads 40k rows; 5-count stats queries |
| **Maintainability** | 6/10 | Dead code in `_toLicenseEntity`; 400-line manual DI container |
| **Memory / Space** | 7/10 | Dashboard request spike; 100k-row count-only fetch |
| **Partner API Sync** | 7/10 | N+1 on mark-synced; no delta/incremental sync |
| **DB Queries** | 6/10 | Silent `findLicensesNeedingReminders` bug; no trgm ILIKE index |
| **CI/CD** | 6/10 | No test gate, no rollback, mutable action tags |

---

## Part 1 — Security Audit

### What's solid ✓
- `helmet()` applied globally; custom `securityHeaders` adds CSP, X-Frame-Options, HSTS in production.
- `bcryptjs` with configurable `BCRYPT_ROUNDS` (default 12); proper `crypto.randomBytes` for temp passwords.
- JWT with issuer, audience, short-lived access tokens (1h), longer refresh (7d).
- HttpOnly cookies for token storage (`cookie-parser`, `COOKIE_SECURE`, `COOKIE_SAME_SITE`).
- Account lockout after 5 failed attempts (15-min window, cache-backed).
- `express-rate-limit` + custom in-memory rate limiter.
- `express-validator` + `express-sanitizer` on body/query/params.
- Correlation IDs on all requests; structured error responses without stack leaks in production.
- Single-flight user load in `AuthMiddleware` prevents thundering-herd on cache miss.

### Security Issues Found ✗

| ID | Severity | Issue | Location | Fix |
|---|---|---|---|---|
| **SEC-1** | High | `cors: { origin: true }` allows any origin | `server.js` | Use `config.CLIENT_URL` as allowed origin |
| **SEC-2** | High | In-memory rate limiter (`createRateLimit`) doesn't survive restarts or work across multiple processes/replicas | `security.middleware.js` | Replace with `express-rate-limit` + Redis store (`rate-limit-redis`) |
| **SEC-3** | Medium | Duplicate rate limiting: both `express-rate-limit` (`server.js`) and custom in-memory `createRateLimit` (same file) run in parallel — different stores, different windows, confusing | `server.js`, `security.middleware.js` | Pick one: prefer `express-rate-limit` + Redis; remove the custom one |
| **SEC-4** | Medium | Refresh tokens share the same `JWT_SECRET` as access tokens and are not stored/revocable — a stolen refresh token is valid forever until it expires (7 days) | `token-service.js` | Store refresh token hash in DB on issue; delete on logout/refresh; verify on use |
| **SEC-5** | Medium | `injectionProtection` blocks requests containing SQL keywords (`SELECT`, `UPDATE`, etc.) but this will false-positive on legitimate notes/DBA fields containing those words | `security.middleware.js` | Only scan headers + path, not `req.body`; rely on Knex parameterized queries (already safe) instead |
| **SEC-6** | Medium | Account lockout keyed by IP only — shared NAT/proxy users can be locked out together; also "fail open" if cache is down | `security.middleware.js` | Key by `IP + email` combo; add explicit fallback behavior on cache failure |
| **SEC-7** | Low | `optionalAuth` calls `this.userRepository.findById()` without cache — every request with an optional token hits the DB | `auth-middleware.js` | Apply same cache + single-flight pattern as `authenticate` |
| **SEC-8** | Low | `JWT_SECRET` defaults to `'abc_dashboard'` if env var not set | `config.js` | Throw at startup if `JWT_SECRET` is absent or shorter than 32 chars |
| **SEC-9** | Low | `generateTemporaryPassword` fallback uses `Math.random()` (not cryptographically secure) | `auth-service.js` | Remove the fallback; throw if `crypto.randomBytes` fails |
| **SEC-10** | Low | `req.connection.remoteAddress` is deprecated; `req.socket.remoteAddress` should be used instead | `security.middleware.js`, `rate-limiting-middleware.js` | Replace with `req.socket.remoteAddress` or trust `req.ip` (set by Express when `trust proxy` is enabled) |

---

## Part 2 — Clean Architecture

### Violations

| ID | Issue | Location | Fix |
|---|---|---|---|
| **CA-1** | Domain entity imports `infrastructure/config/logger.js` | `license-entity.js` line 1 | Remove import; lift logging to service/use-case layer |
| **CA-2** | Use-case imports `infrastructure/config/license-sync-config.js` | `sync-external-licenses-use-case.js` | Inject config via constructor; define interface in `application/` |
| **CA-3** | Use-case imports `infrastructure/monitoring/license-sync-monitor.js` | `sync-external-licenses-use-case.js` | Inject a `ISyncMonitor` port via constructor |
| **CA-4** | Use-case calls `repo._createExternalUpdateData()` (private method) | `sync-external-licenses-use-case.js` | Expose as public method on the interface |
| **CA-5** | Use-case calls `repo._externalToInternalFormat()` (private method) | `sync-external-licenses-use-case.js` | Move transform to an application service / expose public method |
| **CA-6** | `_getLastSyncTimestamp()` hits `repo.db('external_licenses')` raw SQL in use-case | `sync-external-licenses-use-case.js` | Add `getLastSyncTimestamp(): Promise<Date>` to `IExternalLicenseRepository` |
| **CA-7** | Singleton `externalLicenseApiService` exported at bottom of service file | `external-license-api-service.js` | Remove export; resolve only through container |
| **CA-8** | `cors: { origin: true }` allows all origins | `server.js` | Use `config.CLIENT_URL` (same as SEC-1) |

---

## Part 3 — Performance

### P1 · Dashboard metrics: 4 × `findLicenses(limit:10000)` → 2 aggregate queries *(CRITICAL)*

**File**: `application/use-cases/licenses/get-license-dashboard-metrics-use-case.js`

**Current**: 4 separate `findLicenses({ page:1, limit:10000 })` calls loading full entity rows, computing all metrics in JS. Up to ~40k rows in memory per request.

**Fix**:
1. Add `getDashboardAggregates(filters, periodStart, periodEnd)` to `ILicenseRepository`.
2. Implement with a single SQL aggregate query (COUNT FILTER, SUM, etc.).
3. Use two calls (target period + comparison period) instead of four full scans.

**Impact**: Latency ~5s → <200ms; memory per request ~40MB → ~1KB.

### P2 · `getLicenseStatsWithFilters`: 5 COUNT queries → 1 *(CRITICAL)*

**File**: `infrastructure/repositories/license-repository.js`

**Fix**:
```js
const row = await query.select(
  this.db.raw('COUNT(*)::int as total'),
  this.db.raw("COUNT(*) FILTER (WHERE status = 'active')::int as active"),
  this.db.raw("COUNT(*) FILTER (WHERE status = 'expired')::int as expired"),
  this.db.raw("COUNT(*) FILTER (WHERE status = 'pending')::int as pending"),
  this.db.raw("COUNT(*) FILTER (WHERE status = 'cancel')::int as cancel")
).first();
return { total: row.total, active: row.active, expired: row.expired, pending: row.pending, cancel: row.cancel };
```

### P3 · Sync mark-synced: N+1 per batch

**File**: `sync-external-licenses-use-case.js` → `_processBatch`

After `bulkUpsert`, calls `findByAppId(appid)` for every successful item to get IDs before `bulkMarkSynced`. **Fix**: Return `{ id, appid }` pairs from `bulkUpsert` using `RETURNING id, appid`.

### P4 · Response cache: broken contract

**File**: `redis.js` + `metrics.middleware.js`

Redis `cache.get` returns a parsed object; in-memory returns a string. `responseCachingMiddleware` calls `JSON.parse` on both → throws when Redis returns an object.

**Fix**: Standardize `cache.get` to always return the raw stored string; parse once in the consumer.

### P5 · Cache metrics tracking never fires

**File**: `metrics.middleware.js` → `cacheTrackingMiddleware`

`req.app.locals.cache` is never set in `server.js`. **Fix**: `app.locals.cache = cache` after imports.

### P6 · Hard 2s sleep in external API fetch

**File**: `external-license-api-service.js` → `_fetchRemainingPages`

`setTimeout(r, 2000)` between every page-batch. **Fix**: Configurable `licenseSyncConfig.sync.pageBatchDelayMs` defaulting to `0`; only delay on errors.

---

## Part 4 — Maintainability

### M1 · Dead code in `_toLicenseEntity` *(QUICK WIN)*

Two `return new License(...)` paths exist. The second (with `entityData` block) is unreachable.
**Fix**: Delete the unreachable block.

### M2 · DI container boilerplate (400 lines of repetitive getters)

**Fix**: Add `_singleton(key, factory)` / `_asyncSingleton(key, factory)` helpers to collapse every getter from ~8 lines to ~3.

### M3 · Correlation ID mutation on singletons (concurrency bug)

`setCorrelationId()` mutates singleton repo/service instances. Under concurrent requests, one request overwrites another's ID.
**Fix**: Use `AsyncLocalStorage` (Node built-in) to store correlation ID per async context.

### M4 · Commented-out validation guards

Three `appid`/`countid` guards are commented out in `external-license-api-service.js` allowing `undefined` to reach the API.
**Fix**: Restore or replace with explicit null-guard + warning log.

### M5 · Config: flat object, all concerns mixed

`config.js` exports one flat object for DB, JWT, email, cache, sync.
**Fix**: Group by concern (`db`, `auth`, `cache`, `email`, `sync`) for easier injection and testing.

---

## Part 5 — Memory / Space

### S1 · Dashboard memory spike → resolved by P1

### S2 · `getAllAgentNames` full-table JS loop

**Fix**: Replace with SQL `unnest(string_to_array(...))` — pure DB aggregation.

### S3 · `_runSyncToInternalOnly` loads 100k rows for a count

```js
const externalLicenses = await this.externalLicenseRepository.findAll({ limit: 100000 });
syncResults.totalFetched = externalLicenses.length; // Only the count is needed
```
**Fix**: Add `count(filters)` to `IExternalLicenseRepository`; call that instead.

### S4 · Log rotation

Winston writes to `./logs` unbounded. **Fix**: Add `winston-daily-rotate-file` (`maxSize: '20m'`, `maxFiles: '14d'`).

### S5 · Docker layer caching commented out

`cache_from` lines in `docker-compose.yml` are commented. Uncomment to speed up CI builds.

---

## Part 6 — Partner API Sync

### A1 · `bulkUpsert` should return `{ id, appid }` to eliminate N+1 → resolves P3

### A2 · Incremental/delta sync (major feature)

**Current**: Full sync every run (potentially 1000+ API pages).
**Plan**:
1. Track `last_successful_sync_at` in a `sync_state` table.
2. Pass `?updatedAfter=<timestamp>` (or equivalent) to the partner API.
3. Full sync only on `forceFullSync` or first run.
**Impact**: API call volume drops from O(all records) to O(changed records).

### A3 · Webhook / push model

Register `POST /api/v1/external-license/webhook` for real-time push from partner.
Scheduler becomes a catch-up safety net only.

### A4 · Respect `Retry-After` header on 429

Parse the `Retry-After` response header and delay the retry accordingly.

### A5 · Dead-letter queue for failed sync records

Write failed `appid`s to a `sync_failures` table; `syncPendingLicenses` retries them.
The full-sync path currently logs failures but doesn't persist them.

---

## Part 7 — DB Query Issues

### D1 · `findLicensesNeedingReminders` spread bug *(SILENT BUG — FIX NOW)*

```js
// Current — broken: Knex .where() takes 2-3 args, not a spread of 7
query.where(...expiryCondition); // silently ignores extra args

// Fix: chain separate .where() calls
query.where('expires_at', '<=', thirtyDaysFromNow).where('expires_at', '>', sevenDaysFromNow);
```
This means **renewal reminders are never sent** to correct licenses.

### D2 · `bulkCreate` partial-failure inside transaction

Items fail individually inside a transaction but the transaction still commits. This is intentional but should be explicit in code/docs since callers expecting atomicity will be surprised.

### D3 · ILIKE without trgm index (full-table scans on search)

`WHERE dba ILIKE '%term%'` can't use a B-tree index when the pattern starts with `%`.
**Fix**:
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_licenses_dba_trgm     ON licenses USING gin (dba gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_licenses_key_trgm     ON licenses USING gin (key gin_trgm_ops);
```

### D4 · Missing index on `agents_name` for non-null lookups

**Fix**:
```sql
CREATE INDEX IF NOT EXISTS idx_licenses_agents_name_notnull
  ON licenses(agents_name) WHERE agents_name IS NOT NULL AND agents_name <> '';
```

---

## Part 8 — CI/CD

### C1 · No test/lint gate before deploy *(HIGH)*

**Current**: Single job: checkout → build → deploy. Code ships untested.
**Fix**: Add a `test` job that runs on every push/PR; `build-and-deploy` requires it to pass.

### C2 · No rollback strategy *(HIGH)*

**Fix**: Tag current image as `:rollback` before loading new; re-tag on health-check failure.

### C3 · Migration runs at server startup (race condition risk)

**Fix**: Add `docker compose run --rm backend node src/infrastructure/scripts/migrate.js` step in the deploy pipeline before `docker compose up -d`.

### C4 · .env generated on CI runner

All secrets flow through CI runner filesystem. **Fix**: Maintain permanent `.env` on server; CI only sends the built images.

### C5 · Mutable GitHub Action tags

**Fix**: Pin to SHA digests (`actions/checkout@<sha>`).

### C6 · Resource limits may cause sync timeouts

`cpus: '0.5'` on 512M container can starve the sync job. Make configurable via env.

---

## Implementation Plan

### ✅ Phase 1 — Critical fixes (1–2 days)

These are bugs or correctness issues that affect production today.

| # | Task | File | Done |
|---|---|---|---|
| 1.1 | Fix `getLicenseStatsWithFilters`: single COUNT query | `license-repository.js` | ✅ |
| 1.2 | Fix `findLicensesNeedingReminders` spread bug (silent, reminders broken) | `license-repository.js` | ✅ |
| 1.3 | Fix response cache contract: standardize to raw string | `redis.js` | ✅ |
| 1.4 | Wire `app.locals.cache` so cache metrics track real hits | `server.js` | ✅ |
| 1.5 | Fix `_runSyncToInternalOnly`: add `countAll()` to repo; use it | `external-license-repository.js`, use-case | ✅ |
| 1.6 | Remove dead code in `_toLicenseEntity` | `license-repository.js` | ✅ |

### Phase 2 — Security + Architecture (2–3 days)

| # | Task | File | Done |
|---|---|---|---|
| 2.1 | Fix CORS: use `config.CLIENT_URL` (SEC-1) | `server.js` | ✅ |
| 2.2 | Restore commented-out appid validation (CA-4) | `external-license-api-service.js` | ✅ |
| 2.3 | Domain entity: import logger via `shared/utils/logger.js` (CA-1) | `license-entity.js`, new `shared/utils/logger.js` | ✅ |
| 2.4 | Fix `optionalAuth` missing cache (SEC-7) | `auth-middleware.js` | ✅ |
| 2.5 | Replace `req.connection.remoteAddress` → `req.socket?.remoteAddress` (SEC-10) | `security.middleware.js`, `rate-limiting-middleware.js` | ✅ |
| 2.6 | Add CI test+lint gate + migration step + rollback (C1–C3) | `.github/workflows/deploy.yml` | ✅ |

### Phase 3 — Performance & DB (2–3 days)

| # | Task | File | Done |
|---|---|---|---|
| 3.1 | Add `getDashboardAggregates` to repo + rewrite use-case (P1) | `license-repository.js`, use-case | ✅ |
| 3.2 | Fix sync N+1: expose `upsertedIds` from `bulkUpsert` (P3/A1) | `external-license-repository.js`, use-case | ✅ |
| 3.3 | Replace `getAllAgentNames` JS loop with SQL `unnest`/`jsonb_array_elements_text` (S2) | `license-repository.js` | ✅ |
| 3.4 | Add trgm migration for `dba`/`key`/`agents_name` ILIKE search (D3) | `20260306000001_add_trgm_indexes_for_ilike_search.js` | ✅ |
| 3.5 | Replace hard 2s sleep with `licenseSyncConfig.sync.pageBatchDelayMs` (P6) | `external-license-api-service.js`, `license-sync-config.js` | ✅ |

### Phase 4 — Quality & Sync (1 week)

| # | Task | Done |
|---|---|---|
| 4.1 | DI container `_singleton/_asyncSingleton` helpers — 400-line boilerplate collapsed (M2) | ✅ |
| 4.2 | Correlation ID via `AsyncLocalStorage` + auto-inject in logger (M3) | ✅ |
| 4.3 | Refresh token revocation: `refresh_tokens` table, store on login, verify+rotate on refresh, revoke on logout (SEC-4) | ✅ |
| 4.4 | Redis-backed `express-rate-limit` + `rate-limit-redis`; in-memory fallback; old custom limiter removed (SEC-2/3) | ✅ |
| 4.5 | `sync_state` table + `getLastSyncTimestamp` / `updateSyncState` on repo; use-case calls `_persistSyncOutcome` after every sync (A2) | ✅ |
| 4.6 | `sync_failures` dead-letter table + `recordSyncFailures`, `getPendingSyncFailures`, exponential-backoff retry helpers (A5) | ✅ |
| 4.7 | `winston-daily-rotate-file`: 20 MB max, 14-day retention, gzip archives (S4) | ✅ |
| 4.8 | GitHub Actions pinned to SHA digests (C5) | ✅ |

### ✅ Phase 5 — Dead Code Removal (~1,650 lines)

Full dead-code audit completed 2026-03-06. Findings grouped by severity below.

#### 5-A · Entire dead files — safe to delete outright

| # | File | Lines | Why Dead |
|---|---|---|---|
| 5.1 | `infrastructure/repositories/query-optimizer.js` | ~408 | Never imported by any file in the codebase; exports (`applyProjection`, `joinManager`, `executeOptimized`, …) are all unused | ✅ |
| 5.2 | `shared/utils/security/encryption.js` | ~348 | Never imported; `infrastructure/config/resolve-db-password.js` already contains an identical private `decryptFromHex` implementation | ✅ |
| 5.3 | `application/interfaces/i-user-repository.js` | ~108 | Duplicate of `domain/repositories/interfaces/i-user-repository.js`; nothing in `application/` imports it | ✅ |
| 5.4 | `application/interfaces/i-token-service.js` | ~96 | `TokenService` does not extend it; only imported by the dead `application/services/index.js` | ✅ |
| 5.5 | `application/interfaces/i-email-service.js` | ~67 | Same as 5.4 | ✅ |
| 5.6 | `application/interfaces/i-user-profile-repository.js` | ~84 | Duplicate of domain version; no consumer | ✅ |
| 5.7 | `application/interfaces/i-auth-service.js` | ~48 | `AuthService` does not extend it; no consumer | ✅ |
| 5.8 | `application/interfaces/index.js` | ~15 | Only re-exports the dead files above | ✅ |
| 5.9 | `application/services/index.js` | ~23 | No file imports from this path; all consumers go directly to `shared/services/` | ✅ |
| 5.10 | `shared/utils/logger.js` (the re-export shim) | ~10 | **Kept** — confirmed used by `license-entity.js` and `get-license-dashboard-metrics-use-case.js` | — |

**Subtotal: ~1,207 lines across 10 files.**

---

#### 5-B · Dead use-case files — never wired into container

| # | File | Lines | Why Dead |
|---|---|---|---|
| 5.11 | `application/use-cases/auth/verify-email-use-case.js` | ~80 | Not registered in `container.js`; not imported anywhere | ✅ |
| 5.12 | `application/use-cases/profiles/verify-email-use-case.js` | ~30 | Same; overlaps with 5.13 below | ✅ |
| 5.13 | `application/use-cases/profiles/mark-email-verified-use-case.js` | ~40 | Same; if email-verification is ever implemented, keep one, delete both others | ✅ |
| 5.14 | `application/use-cases/users/get-user-stats-use-case.js` | ~30 | Not registered; not imported | ✅ |

**Subtotal: ~180 lines across 4 files.**

---

#### 5-C · Dead exports inside active files — unexport or remove

| # | File | Export(s) | Lines | Action |
|---|---|---|---|---|
| 5.15 | `infrastructure/middleware/license-management.middleware.js` | `checkLicenseAssignmentPermission`, `checkLicenseRevocationPermission`, `canAssignLicense`, `canRevokeLicense` | ~93 | Removed both permission middlewares (no route callers) and their two helper fns | ✅ |
| 5.16 | `infrastructure/middleware/license-management.middleware.js` | `canCreateLicense`, `canUpdateLicense`, `canDeleteLicense`, `canViewLicense` | ~24 | Removed `export` keyword — now private module helpers | ✅ |
| 5.17 | `infrastructure/middleware/auth-middleware.js` | `authorizeSelf`, `authorize`, `requireAdmin` | ~6 | Removed — zero uses in any route file | ✅ |
| 5.18 | `shared/constants/roles.js` | `ROLE_PERMISSIONS`, `hasAnyPermission`, `hasAllPermissions`, `getRolePermissions` | ~30 | Removed `export`; kept as module-private since used internally by `hasPermission` | ✅ |
| 5.19 | `infrastructure/middleware/rate-limiting-middleware.js` | `RateLimiter` (class export), `rateLimiter` (instance export) | ~100 | Removed exports + dead JSDoc + debug logging; class kept private since route exports still use `createRateLimitMiddleware` | ✅ |
| 5.20 | `infrastructure/config/monitoring.js` | `getHealthData`, `getDetailedMetrics` | ~78 | Removed — only `monitorMiddleware` and `getHealthWithMetrics` are imported by `server.js` | ✅ |
| 5.21 | `infrastructure/config/metrics.js` | `systemMetrics`, `databaseMetrics` | ~4 | Removed from named + default export; both remain as private module constants used internally | ✅ |
| 5.22 | `shared/utils/security/crypto.js` | `generateToken`, `generateTokenHash` | ~4 | Removed — only `generateTemporaryPassword` is used | ✅ |
| 5.23 | `application/validators/profile-validator.js` | entire file | ~110 | Deleted — never imported by any controller or route; removed re-export from `validators/index.js` | ✅ |
| 5.24 | `infrastructure/config/monitoring.js` | `APIMonitor.loadPersistedMetrics`, `APIMonitor.persistMetrics` | ~11 | Removed disabled no-op stubs | ✅ |

**Subtotal: ~524 lines.**

---

#### 5-D · Commented-out code & unused variables — quick wins

| # | File | Issue | Action |
|---|---|---|---|
| 5.25 | `infrastructure/controllers/license-controller.js` ~line 170 | `// LicenseValidator.validateCreateInput(req.body)` was skipped — license creates bypassed all input validation | **Restored the call** | ✅ |
| 5.26 | `shared/kernel/register-by-convention.js` ~line 41 | `const _absPath = join(...)` computed every iteration, never read | Deleted the line | ✅ |
| 5.27 | `infrastructure/config/env.js` ~lines 45, 55, 63 | `let _loadedFrom` assigned 3× but never read | Deleted variable and its assignments | ✅ |
| 5.28 | `shared/utils/security/encryption.js` vs `resolve-db-password.js` | Identical `decryptFromHex` logic in two places | `encryption.js` deleted (5.2); `resolve-db-password.js` retains its private inline impl | ✅ |

---

#### ✅ Phase 5 Summary

| Group | Files / Locations | Lines Removed | Status |
|---|---|---|---|
| 5-A: Entire dead files (9 files deleted) | query-optimizer, encryption, 5 app interfaces, app services index, profile-validator | ~1,197 | ✅ |
| 5-B: Dead use-case files (4 files deleted) | verify-email ×2, mark-email-verified, get-user-stats | ~180 | ✅ |
| 5-C: Dead exports in active files | license middleware, auth-middleware, roles, rate-limiter, monitoring, metrics, crypto | ~360 | ✅ |
| 5-D: Comments / dead vars | license-controller (validation restored), register-by-convention, env.js | ~10 | ✅ |
| **Total** | | **~1,747 lines** | ✅ |

> All items completed 2026-03-06. Note: `shared/utils/logger.js` (5.10) was confirmed to have 2 active importers (`license-entity.js`, `get-license-dashboard-metrics-use-case.js`) and was kept.

---

## Expected Net Gains (Phase 1+2)

| Metric | Before | After |
|---|---|---|
| Dashboard API latency | 2–5s | <200ms |
| Dashboard memory/request | ~40MB | ~1KB |
| License list stats round-trips | 5 | 1 |
| Renewal reminders | Broken (silent) | Correct |
| Cache metrics accuracy | 0% (not wired) | 100% |
| Sync mark-synced overhead | N queries/batch | 0 extra |
| CORS exposure | All origins | `CLIENT_URL` only |
| CI test gate | None | lint + unit + integration |
| Deploy rollback | Manual | Automated |
