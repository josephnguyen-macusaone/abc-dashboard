# Plan: Issues, Risks & Monitoring

This document outlines a phased plan to address backend evaluation issues/risks and then add monitoring improvements.

---

## Phase 1: Address Issues and Risks

### 1.1 Fix error key mismatch (high priority, quick win)

**Problem:** `RequiredFieldMissingException` uses `REQUIRED_FIELD_MISSING` but `ERROR_LIST` only has `MISSING_REQUIRED_FIELD`, so responses fall back to `INTERNAL_SERVER_ERROR`.

**Options (pick one):**

- **A)** Add `REQUIRED_FIELD_MISSING` to `ERROR_LIST` in `src/shared/http/error-responses.js` (same content as `MISSING_REQUIRED_FIELD`, or alias).
- **B)** Change `RequiredFieldMissingException` in `src/domain/exceptions/domain.exception.js` to use `'MISSING_REQUIRED_FIELD'****` and pass `fieldName` in a way the existing entry supports (e.g. ensure `formatCanonicalError` / details support it).

**Suggested:** Option A — add `REQUIRED_FIELD_MISSING` so existing exception call sites need no change. Optionally add a short comment that it is the same as `MISSING_REQUIRED_FIELD` for consistency.

**Tasks:**

- [ ] Add `REQUIRED_FIELD_MISSING` to `ERROR_LIST` (or switch exception to `MISSING_REQUIRED_FIELD` and use details).
- [ ] Add a unit test that throws `RequiredFieldMissingException` and asserts the response has the correct `error.code` and status (e.g. in `tests/unit/` or existing error tests).

---

### 1.2 Remove magic number in license data-integrity check (medium priority)

**Problem:** In `src/infrastructure/controllers/license-controller.js`, `_collectDataIntegrityViolations` uses hardcoded `total === 2836` as “known external total” contamination check. This is brittle when data changes.

**Tasks:**

- [ ] Introduce a named constant or config, e.g. in `src/infrastructure/config/license-sync-config.js` or next to the controller:
  - `KNOWN_EXTERNAL_TOTAL_FOR_CONTAMINATION_CHECK` (number or null to disable), or
  - `CONTAMINATION_CHECK_EXTERNAL_TOTALS: number[]` if multiple known totals are possible.
- [ ] Replace the literal `2836` with the constant; if config is `null` or array empty, skip that violation type.
- [ ] Optionally: make the check more generic (e.g. “filtered total equals unfiltered total” or “total equals external system count” when we have it) so it’s not tied to one number.

---

### 1.3 Avoid mutating shared result in license controller (low–medium priority)

**Problem:** `_applyMetaCorrectionIfNeeded` mutates `meta` on the result object (e.g. `meta.total = 0`). If the same object is reused or cached, this can affect other responses.

**Tasks:**

- [ ] In `getLicenses`, when correction is needed, work on a **copy** of `meta` (e.g. `correctedMeta = { ...result.getMeta() }`) and pass that to `res.success(..., correctedMeta)` instead of mutating the original.
- [ ] Ensure the service/use case still returns an immutable or documented “ownership” of the result so controllers don’t need to mutate it. Add a one-line comment in the controller: “We never mutate the service result; we only build a new meta object for the response.”

---

### 1.4 Centralize Redis config (low priority)

**Problem:** Redis is read from `process.env` in `server.js` and Redis init; `src/infrastructure/config/config.js` does not expose `REDIS_ENABLED` / `REDIS_URL`.

**Tasks:**

- [ ] Add to `config.js`: `REDIS_ENABLED`, `REDIS_URL` (and any other Redis vars used).
- [ ] In `server.js` and `src/infrastructure/config/redis.js`, use `config.REDIS_ENABLED` and `config.REDIS_URL` (or equivalent) instead of reading `process.env` directly for those keys.

---

### 1.5 Align service placement (low priority, refactor)

**Problem:** `LicenseService` is in `shared/services/` while `LicenseLifecycleService` and `LicenseNotificationService` are in `infrastructure/services/`. Inconsistent layering.

**Tasks:**

- [ ] Decide convention: either move license-related services to `infrastructure/services/` (recommended: “shared = cross-cutting, not feature-specific”) or document why one stays in shared.
- [ ] If moving: move `LicenseService` to `infrastructure/services/license-service.js`, update `container.js` and any other imports, run tests.

---

### 1.6 Correlation ID and AsyncLocalStorage (medium effort, high value)

**Problem:** Container’s `setCorrelationId` mutates shared singletons; under concurrency the ID can be overwritten between set and use. Comment in container already notes AsyncLocalStorage as Phase 4.2.

**Tasks:**

- [ ] Introduce Node `AsyncLocalStorage` in a small shared module (e.g. `src/shared/utils/correlation-context.js` or extend existing).
- [ ] In request pipeline: run each request in an async context that stores `correlationId` (and optionally `requestId`). Set the storage in correlation-id middleware; read it wherever correlation ID is needed (repositories, services, logger).
- [ ] Remove or deprecate `setCorrelationId` on the container and on singletons; resolve correlation ID from AsyncLocalStorage only.
- [ ] Update logger, repositories, and services to get correlation ID from context instead of instance property. Add a simple test that fires two concurrent requests and asserts each response/log has the correct correlation ID.

---

## Phase 2: Additional Monitoring Suggestions

After Phase 1 is in good shape, consider these monitoring additions. They build on the existing health, metrics, error monitor, and middleware.

### 2.1 Structured logging and log aggregation

**Current:** Winston with correlation ID and request context.

**Suggestions:**

- Ensure all important operations (auth, license sync, external API calls, DB errors) log in a **consistent JSON shape** (e.g. `{ correlationId, level, message, ...meta }`) so log aggregation (e.g. ELK, Datadog, CloudWatch) can index and alert.
- Add a **request log** at response finish (status, duration, route, userId if any) in one structured line per request.
- Consider a **log sampling** config for very high traffic (e.g. log 100% of errors, 10% of 2xx) to control volume and cost.

**Tasks:**

- [ ] Audit a few key paths (login, get licenses, sync) and standardize log fields (e.g. `event`, `durationMs`, `userId`, `licenseId`).
- [ ] Document the expected JSON schema for “one request = one log line” so ops can build dashboards.

---

### 2.2 Metrics endpoint and dashboards

**Current:** `/api/v1/health` returns comprehensive metrics; in-memory API metrics (request counts, response times, error rate) reset every 5 minutes.

**Suggestions:**

- Expose a **dedicated metrics endpoint** (e.g. `GET /api/v1/metrics`) that returns the same or a subset of data as health, in a **stable JSON structure**, for scraping by Prometheus/Grafana or a cloud metrics agent. Optionally support Prometheus text format on `GET /api/v1/metrics/prometheus` if you adopt Prometheus.
- Add **business metrics** that matter for licenses and sync:
  - License sync: last run time, last success/failure, count of licenses synced, count of failures.
  - License lifecycle: last run time, counts renewed/expired/suspended in last run.
- These can be implemented by reading from existing schedulers/monitors (e.g. `license-sync-monitor`) or a small “metrics registry” that they update.

**Tasks:**

- [ ] Add or formalize `GET /api/v1/metrics` (and optionally `GET /api/v1/metrics/prometheus`) with a documented schema.
- [ ] Include in that response: system/process/DB/cache (as today), API summary (totalRequests, errorRate, p95, etc.), and business metrics (license sync, lifecycle) where available.
- [ ] Document which metrics are suitable for alerting (e.g. `database.connected`, `errorRate`, `license_sync.lastSuccessAge`).

---

### 2.3 Alerting on health and errors

**Current:** Error monitor has severity and rates; health endpoint computes overall status and issues.

**Suggestions:**

- **Probe health periodically:** Use a cron or orchestrator (e.g. Kubernetes liveness/readiness, or a simple external cron) to call `GET /api/v1/health` every 1–2 minutes. If `status` is not `healthy` (or `score` &lt; threshold), trigger an alert (PagerDuty, Slack, email).
- **Alert on error spikes:** If you expose error rate (or error count) in metrics, define a threshold (e.g. error rate &gt; 5% or errors in 5 min &gt; N) and alert when exceeded.
- **Alert on sync/lifecycle failures:** If license sync or lifecycle job fails (or hasn’t succeeded in X hours), send an alert. This can be a simple “last success timestamp” in metrics plus a probe or script that alerts when it’s too old.

**Tasks:**

- [ ] Define alert rules (e.g. in a runbook or config): health down, error rate high, DB disconnected, sync/lifecycle stale.
- [ ] Implement at least one channel (e.g. Slack webhook or email) that the health probe or a small script can call when a rule fires.
- [ ] Optionally integrate with the existing `ErrorMonitor` (e.g. call a “notify” or “alert” when thresholds are exceeded) so one place owns alert logic.

---

### 2.4 License sync and lifecycle observability

**Current:** Schedulers and sync runner exist; there is a license-sync monitor.

**Suggestions:**

- **Structured logs** for each sync/lifecycle run: start, end, duration, counts (synced, failed, renewed, expired), and any top-level error. Same for “sync from external API” triggered by API.
- **Metrics:** Last sync success time, last sync duration, last sync error (or error count), licenses synced per run. Same idea for lifecycle (renew/expire) runs.
- **Lightweight tracing:** If you add AsyncLocalStorage for correlation ID, pass the same `correlationId` (or a `syncRunId`) through the sync pipeline so one run can be traced in logs and errors.

**Tasks:**

- [ ] Ensure sync runner and lifecycle scheduler log one structured “run finished” line with the above fields.
- [ ] Expose “last run” and “last success” (and optionally “last error”) in the metrics or health payload so probes can alert on “sync hasn’t succeeded in 24h”.

---

### 2.5 Security and rate-limiting visibility

**Current:** Security events (failed logins, rate limits, suspicious patterns) are recorded in `applicationMetrics`; rate limiter is in place.

**Suggestions:**

- **Log security events** (at least failed login and 429) with a stable event name (e.g. `event: 'auth.failed_login'`, `event: 'rate_limit.hit'`) and correlation ID so they can be counted and alerted in log aggregation.
- **Metrics:** Expose `security.failedLogins`, `security.rateLimitedRequests` (and optionally blocked IPs count) in the metrics endpoint so you can graph and alert on abuse (e.g. spike in failed logins).

**Tasks:**

- [ ] Add a single log line for failed login and for 429 with `event` and correlation ID.
- [ ] Include security counters in `GET /api/v1/metrics` (or health) from existing `applicationMetrics.getApplicationMetrics()`.

---

### 2.6 Database and cache health in alerts

**Current:** Health includes DB and cache; overall score is reduced if DB is disconnected.

**Suggestions:**

- Ensure **DB connection failure** is clearly reflected in health (already is) and that the health probe alerts on it.
- Add an optional **DB pool metric** (e.g. active/idle connections) to metrics if Knex exposes it; alert if pool is exhausted (e.g. active &gt; 90% of max).
- **Cache:** If Redis is used, alert when Redis is down (health already differentiates Redis vs in-memory). Optionally expose cache hit rate in metrics and alert if hit rate drops below a threshold (e.g. &lt; 50%) when you expect caching to be used.

**Tasks:**

- [ ] Confirm health probe alerts when `database.connected === false`.
- [ ] Optionally add pool stats to metrics and document an “exhausted pool” alert rule.

---

## Implementation order (suggested)

**Phase 1 (issues/risks):**

1. 1.1 Error key fix (quick).
2. 1.2 Magic number constant/config.
3. 1.3 Meta mutation fix.
4. 1.4 Redis in config.
5. 1.5 Service placement (optional, when touching that code).
6. 1.6 Correlation ID → AsyncLocalStorage (when you have a sprint for it).

**Phase 2 (monitoring):**

1. 2.2 Metrics endpoint and business metrics (so 2.3 and 2.6 have something to consume).
2. 2.3 Health probe + one alert channel.
3. 2.1 Structured request log (one line per request).
4. 2.4 Sync/lifecycle run logs and “last success” in metrics.
5. 2.5 Security event logs and metrics.
6. 2.6 DB pool and cache hit rate (optional).

---

## Summary

- **Phase 1** fixes one concrete bug (error key), reduces technical debt (magic number, mutation, config, placement), and improves correctness under concurrency (AsyncLocalStorage).
- **Phase 2** keeps your existing health and error monitoring and extends it with a stable metrics API, health-based alerting, structured logs, and business/sync/lifecycle and security visibility. You can implement Phase 2 incrementally; start with the metrics endpoint and health probe so the rest can rely on them.

---

## Grafana + Prometheus (implemented)

Server health and deployment monitoring with Grafana is set up as follows:

- **Backend:** `GET /api/v1/metrics` (JSON) and `GET /api/v1/metrics/prometheus` (Prometheus text format). Rate limiting skips these paths.
- **Prometheus:** Scrapes `backend:5000` at `/api/v1/metrics/prometheus` every 15s. Config: `monitoring/prometheus/prometheus.yml`.
- **Grafana:** Pre-provisioned datasource (Prometheus) and dashboard “ABC Backend - Server health & deployment”. Config and dashboard JSON: `monitoring/grafana/`.
- **Docker Compose:** Services `prometheus` (port 9090) and `grafana` (port 3030) added; see `monitoring/README.md` for env vars and metrics reference.
