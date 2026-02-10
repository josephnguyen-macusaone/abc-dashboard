# Database migrations analysis

## Order and dependencies

Migrations run in filename order. Dependency chain:

| Order | Migration                                              | Depends on                                   |
| ----- | ------------------------------------------------------ | -------------------------------------------- |
| 1     | `20241209000001_create_users_table`                    | —                                            |
| 2     | `20241209000002_create_user_profiles_table`            | users                                        |
| 3     | `20241212000001_create_licenses_table`                 | users (created_by, updated_by)               |
| 4     | `20241212000002_create_license_assignments_table`      | licenses, users                              |
| 5     | `20241212000003_create_license_audit_events_table`     | users                                        |
| 6     | `20241212000004_add_performance_indexes`               | all above                                    |
| 7     | `20241215000001_create_external_licenses_table`        | —                                            |
| 8     | `20241217000001_add_external_fields_to_licenses_table` | licenses                                     |
| 9     | `20241218000001_drop_sms_balance_constraint`           | external_licenses                            |
| 10    | `20250121000001_add_external_sync_performance_indexes` | licenses (appid, countid), external_licenses |
| 11    | `20250121000002_fix_null_empty_dba_values`             | licenses (data migration)                    |
| 12    | `20250122000001_add_license_lifecycle_fields`          | licenses                                     |
| 13    | `20250123000001_add_missing_external_fields`           | licenses                                     |

Seeds depend on: **users** (001), then **licenses** (002). So migrate then seed is correct.

---

## Issues found and fixes

### 1. `20241212000004_add_performance_indexes.js` — down() bugs

- **Users section:** down() drops `last_login_at` and `last_activity_at` on **users**, but those indexes were never added to users; they belong to **user_profiles**. So the users block incorrectly tries to drop `idx_users_last_login_at` / `idx_users_last_activity_at` (not created in up() on users). Fixed by removing those two dropIndex calls from the users block.
- **License assignments:** down() uses `table.dropIndex('assignment_status', 'idx_assignments_status')` but the column is **status**, not assignment_status. Fixed by using `dropIndex('status', 'idx_assignments_status')`.

### 2. `20250121000001_add_external_sync_performance_indexes.js` — wrong column names on licenses

- Migration checks for `external_appid` and `external_countid` on **licenses**. Those columns do not exist; `20241217000001` added **appid** and **countid**.
- Result: the whole “licenses – external sync” block is skipped, so no sync-related indexes on `licenses` are created. The app and repository use `appid` / `countid`.
- Fixed by using **appid** and **countid** for the conditional check and for creating indexes (appid, countid, external_sync_status, last_external_sync). Other names (external_email, external_status, etc.) are left as optional checks so existing DBs with different renames are not broken.

### 3. `20241212000002_create_license_assignments_table.js` — trigger syntax

- Uses `EXECUTE FUNCTION` (PostgreSQL 11+). Docker uses Postgres 16, so this is correct. No change.

### 4. `20250121000002_fix_null_empty_dba_values.js` — down() no-op

- down() does not restore previous dba values. Acceptable for a data migration; rollback is best-effort. No change.

### 5. `20241212000003_create_license_audit_events_table.js` — view ORDER BY

- View includes `ORDER BY lae.created_at DESC`. PostgreSQL does not guarantee order when selecting from the view. Callers should add ORDER BY. No migration change.

---

## Seed compatibility

- **002_create_licenses.js** inserts into `licenses` with: key, product, plan, status, term, seats*total, seats_used, starts_at, expires_at, cancel_date, last_active, dba, zip, last_payment, sms*\*, agents, agents_name (jsonb), agents_cost, notes, created_by, updated_by, created_at, updated_at.
- All of these exist in the current schema after migrations. Later migrations only add nullable or defaulted columns (appid, countid, lifecycle fields, etc.), so the seed does not need to provide them.

---

## Summary

- **Fixed:** performance-indexes down() (wrong table/column for some drops), external-sync-indexes up() (use appid/countid on licenses so indexes are created).
- **Not changed:** trigger syntax (correct for PG 11+), DBA data-migration down(), view ORDER BY note.
