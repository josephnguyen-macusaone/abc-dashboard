# Why License Sync Runs and Log Analysis

## Why sync runs

License sync runs **by design**, not because of a bug:

1. **On server startup** (`server.js`), the app gets `LicenseSyncScheduler` from the container and calls `syncScheduler.start()`.
2. **LicenseSyncScheduler** (`src/infrastructure/jobs/license-sync-scheduler.js`) uses **node-cron** with `syncSchedule: '*/15 * * * *'` (every 15 minutes by default).
3. So every 15 minutes the job runs and logs: `Running scheduled license sync` → `Starting external licenses sync` → `Fetching licenses from external API...`.

So sync runs because:

- The backend is built to periodically pull licenses from an external API into `external_licenses` / `licenses`.
- The scheduler is started automatically when the server starts.

To **disable** sync (e.g. when using only seeded data or no external API), you can:

- Set env or config so the scheduler is disabled (`enabled: false`), or
- Change the cron expression so it never runs (e.g. empty or a far-future schedule).

---

## What your logs show (and why “old image” fits)

### 1. Migration failure → `licenses` missing

```
ERROR: relation "idx_external_licenses_coming_expired" already exists
STATEMENT: create index "idx_external_licenses_coming_expired" on "external_licenses" ("coming_expired")
```

- That index is **already** created in migration `20241215000001_create_external_licenses_table.js` (both via `table.index('coming_expired')` and a raw `CREATE INDEX idx_external_licenses_coming_expired`).
- So a **second** migration that tries to create the same index will fail. In the **current** repo, `20250121000001_add_external_sync_performance_indexes.js` does **not** create `idx_external_licenses_coming_expired` (it only has a comment to skip it). So the failure indicates the **running backend was using an older version** of `20250121000001` that still created this index.
- When that migration fails, its transaction aborts. Depending on order and how migrations are run, later migrations may not run, so the **`licenses`** table can be missing or in a bad state.

Then you see:

```
ERROR: relation "licenses" does not exist
```

So: **old migration code in the image** → duplicate index error → migration transaction aborted → `licenses` not created / not available.

### 2. Seed failure (invalid JSON)

```
ERROR: invalid input syntax for type json
CONTEXT: JSON data, line 1: {"Amy Miller"}
```

- The `agents_name` column is JSONB and is now used to store a **string** value (e.g. `"Amy Miller"` or `"Agent 1, Agent 2"`). The API and application layer use `agentsName` as a string everywhere; the repository normalizes legacy array JSON to string on read and writes string on save.
- The value `{"Amy Miller"}` is invalid JSON for a single string (it is an object). Valid values are a JSON string like `"Amy Miller"` or, historically, a JSON array like `["Amy Miller"]` (the backend normalizes arrays to a comma-separated string).
- If seed or insert code sends invalid JSON for `agents_name`, the insert will fail. Current code writes `agents_name` as a string.

So: **old seed/insert code in the image** → invalid `agents_name` → seed fails.

### 3. Sync still runs

- Sync is **independent** of migrations and seeds: it is started on server boot and then on a cron schedule.
- So even when migrations or seeds fail, the server can start and the scheduler will run at 10:30, etc., and you see “Running scheduled license sync” and “Fetching licenses from external API...”.

---

## Conclusion and what to do

- **Why does sync run?**
  Because the backend is designed to start the license sync scheduler on startup and run it on a schedule (e.g. every 15 minutes).

- **Why did migrations/seeds fail?**
  The logs are consistent with **old Docker images**: an older migration that re-created `idx_external_licenses_coming_expired`, and older seed/insert logic that could write invalid JSON for `agents_name`. (Current application layer treats `agentsName` as a string; see [Agents Name Field](../guides/agents-name-field.md).)

**What you should do:**

1. **Rebuild backend (and frontend if needed) images** so they contain the current code (migration that doesn’t create the duplicate index, seed that writes `agents_name` as valid string/JSON correctly).
2. **Reset DB and re-run migrations/seeds** (e.g. drop DB, run migrations, run seeds) so the schema and seed data match the current code.
3. **Optional:** Disable or reschedule the license sync scheduler if you don’t use the external API (e.g. dev with seeds only).

After rebuilding and re-running migrations/seeds, the duplicate-index and “relation licenses does not exist” and “invalid input syntax for type json” errors should go away; sync will still run on schedule unless you disable or change it.
