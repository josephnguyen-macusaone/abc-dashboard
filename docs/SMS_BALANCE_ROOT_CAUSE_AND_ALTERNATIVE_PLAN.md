# SMS Balance Root Cause Analysis & Alternative Approach Plan

## Executive Summary

SMS Balance still shows 0 in the dashboard despite external API returning values (e.g. 10, 8.9). This document traces the full data flow, identifies verification steps to pinpoint the failure, and proposes alternative approaches.

---

## Data Flow (End-to-End)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 1. External API (mapi.abcsalon.us)                                               │
│    GET /api/v1/licenses?dba=VALENCIA%20NAILS%20SPA                               │
│    Returns: smsBalance: 10, smsBalance: 8.9                                      │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 2. Sync: ExternalLicenseApiService.getAllLicenses()                              │
│    → externalLicenseValidator.validateLicenses() → validLicenses (sanitizedData)  │
│    → _normalizeApiKeys maps smsBalance from API                                   │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 3. Sync: externalLicenseRepository.bulkUpsert(batch)                              │
│    → _toExternalLicenseDbFormat() maps smsBalance → sms_balance                   │
│    → INSERT ... ON CONFLICT(appid) DO UPDATE SET sms_balance = ... (merge)        │
│    Target: external_licenses table                                                │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 4. Sync: syncToInternalLicensesComprehensive()                                    │
│    Reads external_licenses → creates/updates licenses (internal)                  │
│    _externalToInternalFormat sets smsBalance from externalLicense.smsBalance        │
│    Target: licenses table                                                         │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 5. Dashboard: GET /api/v1/licenses                                                │
│    → LicenseRepository.findLicenses() → internal licenses                          │
│    → GetLicensesUseCase._enrichFromExternal()                                     │
│       - externalLicenseRepository.findByAppIds(appids)                             │
│       - If internal.smsBalance === 0 && external.smsBalance > 0 → use external   │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 6. License entity toJSON()                                                        │
│    Uses stored smsBalance when valid, else getSmsBalance() (smsPurchased-smsSent) │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 7. Frontend: transformApiLicenseToRecord → row.getValue("smsBalance")            │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Failure Points (Where smsBalance Can Become 0)

| # | Location | Possible Cause |
|---|----------|----------------|
| 1 | **external_licenses.sms_balance** | Bulk upsert not writing; Knex merge omits column; constraint/type mismatch |
| 2 | **licenses.sms_balance** | Sync-to-internal not copying; appid mismatch so no match |
| 3 | **Enrichment** | internal has no appid → lookup fails; external_licenses has 0 → nothing to merge |
| 4 | **License entity toJSON()** | Overrides with getSmsBalance() (fixed in prior work) |
| 5 | **Frontend transform** | apiLicense.smsBalance ?? 0 (correct) |

**Critical path:** If `external_licenses.sms_balance` is 0, then:
- Sync-to-internal copies 0
- Enrichment gets 0 from external → no merge
- Dashboard shows 0

So **the root cause is almost certainly: external_licenses.sms_balance is not being written correctly during bulk upsert.**

---

## Verification Steps (Run These First)

### Step 1: Verify external_licenses has sms_balance after sync

```bash
# After running sync (./scripts/docker-db-reset-sync.sh --sync=10)
docker compose exec postgres psql -U abc_user -d abc_dashboard -c \
  "SELECT appid, dba, sms_balance FROM external_licenses WHERE dba ILIKE '%VALENCIA%' LIMIT 5;"
```

**Expected:** `sms_balance` should show 10, 8.9, etc.  
**If 0:** Bulk upsert is failing → focus on Approach A or B below.

### Step 2: Verify licenses table has sms_balance and appid

```bash
docker compose exec postgres psql -U abc_user -d abc_dashboard -c \
  "SELECT appid, dba, sms_balance FROM licenses WHERE dba ILIKE '%VALENCIA%' LIMIT 5;"
```

**Expected:** `appid` populated (e.g. vbBP4ca), `sms_balance` = 10 or 8.9.  
**If appid null:** Enrichment lookup fails.  
**If sms_balance 0:** Sync-to-internal or Step 1 is wrong.

### Step 3: Verify API response

```bash
curl -s -H "x-api-key: YOUR_JWT_OR_AUTH" \
  "http://localhost:5000/api/v1/licenses?limit=5&filters[dba]=VALENCIA%20NAILS%20SPA" | jq '.data[0] | {smsBalance, appid}'
```

**Expected:** `smsBalance` non-zero, `appid` present.

### Step 4: Add temporary debug logging (optional)

In `external-license-repository.js` `_processBulkUpsertBatch`, before insert:

```javascript
if (deduplicatedData.length > 0) {
  logger.info('DEBUG sms_balance in batch', {
    sample: deduplicatedData[0],
    sms_balance: deduplicatedData[0]?.sms_balance,
    rawFromBatch: batch[0]?.smsBalance ?? batch[0]?.sms_balance,
  });
}
```

Run sync and check logs. Confirms whether `sms_balance` is in the insert payload.

---

## Alternative Approaches

### Approach A: Raw SQL Upsert (Bypass Knex Merge)

**Idea:** Replace Knex `insert().onConflict().merge()` with raw PostgreSQL `INSERT ... ON CONFLICT DO UPDATE` to guarantee `sms_balance` is updated.

**Why:** Knex's merge behavior may differ from expectations; raw SQL gives full control.

**Implementation:**
- In `_processBulkUpsertBatch`, build parameterized raw SQL:
  ```sql
  INSERT INTO external_licenses (appid, countid, ..., sms_balance, ...)
  VALUES ($1, $2, ..., $N, ...)
  ON CONFLICT (appid) DO UPDATE SET
    sms_balance = EXCLUDED.sms_balance,
    countid = EXCLUDED.countid,
    ...
  ```
- Use `trx.raw()` with bound parameters for each row.

**Pros:** Full control; no Knex quirks.  
**Cons:** More code; need to maintain column list.

---

### Approach B: Two-Phase Upsert (Insert New, Then Explicit Update)

**Idea:** For existing records (conflict on appid), run a separate `UPDATE` that explicitly sets `sms_balance` from the batch data.

**Flow:**
1. Try insert; catch or detect conflict.
2. For rows that conflicted, run: `UPDATE external_licenses SET sms_balance = $1 WHERE appid = $2` for each.

**Pros:** Simpler than full raw SQL; guarantees update.  
**Cons:** Two round-trips; more queries.

---

### Approach C: Use External Licenses API for Dashboard List (Bypass Internal)

**Idea:** Dashboard fetches from `GET /external-licenses` instead of `GET /licenses`. External table is the first sync target; if bulk upsert is fixed, it has correct data.

**Prerequisite:** Approach A or B must fix `external_licenses.sms_balance` first. Otherwise external list would also show 0.

**Implementation:**
- Frontend: add `getLicensesFromExternal()` in API client.
- License store: when `USE_EXTERNAL_FOR_LIST=true`, call external endpoint.
- Normalize response shape for store (pagination, filters).

**Pros:** Single source of truth; no sync-to-internal dependency for display.  
**Cons:** Response shape differs; filters may need mapping; write path (create/update) still uses internal.

---

### Approach D: On-Demand smsBalance from External API

**Idea:** When serving license list, for each license with appid, fetch `smsBalance` from external API (or from `external_licenses` via a join) at read time.

**Problem:** If `external_licenses` has 0, we'd need to call the external mapi.abcsalon.us API per request. That's slow and may hit rate limits.

**Variant:** Join `licenses` with `external_licenses` on appid in the GET /licenses query, and use `COALESCE(external_licenses.sms_balance, licenses.sms_balance)` in the SELECT. This still requires `external_licenses.sms_balance` to be correct.

---

## Recommended Order

1. **Run verification steps** (Step 1–3) to confirm where data is lost.
2. **If external_licenses.sms_balance is 0:** Implement **Approach A** (raw SQL upsert) to fix the source.
3. **If external_licenses has correct data but licenses/internal does not:** Fix sync-to-internal or rely on enrichment (already implemented).
4. **If enrichment fails** (e.g. appid missing): Fix appid population in sync.

---

## Quick Reference: Key Files

| Purpose | File |
|---------|------|
| Bulk upsert to external_licenses | `backend/src/infrastructure/repositories/external-license-repository.js` → `_processBulkUpsertBatch`, `_rawBulkUpsert` |
| Map API → DB format | `_toExternalLicenseDbFormat` (smsBalance → sms_balance) |
| Enrichment (external → internal) | `backend/src/application/use-cases/licenses/get-licenses-use-case.js` → `_enrichFromExternal` |
| Sync external → internal | `external-license-repository.js` → `syncToInternalLicensesComprehensive`, `_externalToInternalFormat` |
| License entity toJSON | `backend/src/domain/entities/license-entity.js` |
| **Frontend License entity** | `frontend/src/domain/entities/license-entity.ts` – smsBalance getter was computing `purchased - sent`; now uses stored value when valid |
| **Frontend mapApiLicenseToDomain** | `frontend/src/infrastructure/repositories/license-repository.ts` – must pass `smsBalance` to `License.fromPersistence` |
