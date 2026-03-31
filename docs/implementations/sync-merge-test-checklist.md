# External → internal sync merge — manual test checklist

Use this after changes to `applyInternalMergePolicy` / legacy or comprehensive repository sync paths. Policy details: [sync-merge-policy.md](./sync-merge-policy.md).

## Prerequisites

- [ ] Backend and DB running; you can call sync (admin or role with external sync permission).
- [ ] Pick a license that exists **internally** and in **external_licenses** with the same `appid` (or matching `countid` / email for legacy path), so a sync will **update** that row (not create).
- [ ] Note current values for at least one **web-managed** field (e.g. `dba`, `notes`, `status`) and one **external-managed** field (e.g. `appid`, `mid`, `package_data`).

## Scenario 1 — Preserve web-managed fields (internal edited after last sync)

Goal: `updated_at` on the internal license is **after** `last_external_sync` → external sync must **not** overwrite web-managed fields; it **should** still apply identifiers/package-style fields from external.

1. [ ] In the DB (or via API that does not bump `last_external_sync`), set `last_external_sync` on the license to a **past** timestamp (e.g. yesterday).
2. [ ] In the UI (or PATCH license API), change a web-managed field (e.g. set **dba** to `MERGE-TEST-DASHBOARD` and **notes** to `merge test`).
3. [ ] Confirm internal `updated_at` is **newer** than `last_external_sync` (refresh row in DB if needed).
4. [ ] In external staging/API (or `external_licenses` row), use **different** values for fields that map to web-managed columns (e.g. different DBA / notes) so you can see overwrites if merge fails.
5. [ ] Run sync:
   - **Paginated path (default):** `POST /api/v1/external-licenses/sync` with `comprehensive=true` (or omit; default is true in config/routes).
   - **Legacy path:** same endpoint with `comprehensive=false` (exercises `syncToInternalLicenses`).
6. [ ] **Expect:** `dba` and `notes` still match your dashboard edits (`MERGE-TEST-DASHBOARD`, `merge test`).
7. [ ] **Expect:** `last_external_sync` advanced to ~now; `external_sync_status` still consistent with a successful sync.
8. [ ] **Expect:** External-driven fields that remain in the patch (e.g. `appid`, `mid`, package metadata as applicable) still align with external after sync.

## Scenario 2 — Allow external to overwrite web fields (internal not newer than last sync)

Goal: No “fresher local edit” guard → sync may update web-managed fields from external.

1. [ ] Set `last_external_sync` to **now** (or after `updated_at`).
2. [ ] Optionally set web-managed fields to known values.
3. [ ] Change external (`external_licenses` / API) so mapped web fields differ (e.g. DBA).
4. [ ] Run sync (either `comprehensive=true` or `false`).
5. [ ] **Expect:** Web-managed fields can match external again (policy does not preserve them when internal is not newer than `last_external_sync`).

## Scenario 3 — First-time / never synced row

1. [ ] Use a row where `last_external_sync` is **null** (or missing).
2. [ ] Run sync once.
3. [ ] **Expect:** Merge treats “internal newer” as false (no last sync) → full patch from external applies; after sync, `last_external_sync` is set.

## Automated regression

- [ ] From repo root:  
  `cd backend && npm run test -- --testPathPatterns=internal-license-external-sync-merge`

## Notes

- **409 optimistic concurrency** on license PATCH is separate; this checklist is only about **scheduled / manual external → internal sync** not clobbering recent dashboard edits.
- Repository method `syncToInternalLicensesComprehensive` is alignable with the same merge rules but may not be wired to your default HTTP sync flow; if you call it from a script, re-run Scenario 1 against that entry point too.
