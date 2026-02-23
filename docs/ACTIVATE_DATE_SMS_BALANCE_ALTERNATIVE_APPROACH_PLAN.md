# Activate Date & SMS Balance – Alternative Approach Plan

Data still shows today's date and SMS Balance 0 after sync. The sync-to-internal path is unreliable. This plan outlines alternative approaches.

**Chosen: Approach B** – Backend merge: enrich internal licenses with external data.

---

## Current Flow (Broken)

```
External API (ActivateDate, smsBalance)
  → Sync → external_licenses (activate_date, sms_balance)
  → Sync to internal → licenses (starts_at, sms_balance)
  → GET /licenses → Frontend
```

**Problem:** Internal `licenses` table ends up with wrong `starts_at` (today) and `sms_balance` (0).

---

## Alternative Approaches

### Approach A: Use External Licenses API for List (Recommended)

**Idea:** Use `GET /external-licenses` instead of `GET /licenses` for the license list. The `external_licenses` table is populated directly from the external API and should have correct `activate_date` and `sms_balance`.

**Data flow:**
```
External API → Sync → external_licenses (source of truth)
  → GET /external-licenses → Frontend
```

**Pros:**
- Bypasses the broken sync-to-internal path
- `external_licenses` is the first sync target and should have correct data
- Frontend transform already supports external format (ActivateDate, smsBalance)
- Minimal backend changes

**Cons:**
- Response shape differs (`meta.pagination` vs flat `meta`)
- Filters (search, status, etc.) may need alignment with external-licenses controller
- Create/update/delete may still use internal licenses (need to decide write path)

**Implementation:**
1. Add `getLicensesFromExternal()` in API client that calls `/external-licenses`
2. Add env/feature flag or switch: `USE_EXTERNAL_LICENSES_FOR_LIST=true`
3. License store: when flag set, call external endpoint instead of internal
4. Normalize response (meta.pagination → pagination) for store compatibility
5. Map filters (dba, search, status) to external-licenses query params

---

### Approach B: Backend Merge – Enrich Internal with External Data ✅ IMPLEMENTED

**Idea:** Keep `GET /licenses` but join/lookup `external_licenses` to fill `starts_at` and `sms_balance` when internal values are missing or wrong.

**Implementation (done):**
- `ExternalLicenseRepository.findByAppIds(appids)` – batch lookup by appid
- `GetLicensesUseCase` – after building license DTOs, enriches from external:
  - `startsAt`: use external `ActivateDate` when internal is empty or today
  - `smsBalance`: use external when internal is 0 and external has value
- `LicenseService` receives `externalLicenseRepository` and passes to `GetLicensesUseCase`

**Pros:**
- Single endpoint for frontend
- No frontend changes
- Internal licenses remain source of truth; external used only for merge

**Cons:**
- One extra batch query per list request
- Depends on `external_licenses` having correct data (from sync)

---

### Approach C: Backend Source Switch

**Idea:** Add query param `?source=external` to `GET /licenses`. When present, backend fetches from `external_licenses` and returns that format.

**Pros:**
- Single endpoint for frontend
- Easy to switch via query param

**Cons:**
- Response shape varies by source
- Frontend must handle both shapes
- More branching in controller

---

### Approach D: Debug Sync at Source

**Idea:** Fix why sync-to-internal does not populate `starts_at` and `sms_balance` correctly.

**Steps:**
1. Query `external_licenses` after sync – verify `activate_date` and `sms_balance`
2. Check `syncToInternalLicensesComprehensive` – trace where `starts_at` comes from
3. Add logging around `_externalToInternalFormat` and `_createExternalUpdateData`
4. Confirm `externalLicense.ActivateDate` is set when passed to these helpers

**Pros:**
- Fixes root cause
- Keeps internal licenses as source of truth

**Cons:**
- Sync may be complex and multi-step
- May need more time to debug

---

## Recommendation

**Use Approach A** first: switch the license list to `GET /external-licenses` when the flag is set. This:

1. Uses the table that is directly synced from the external API
2. Avoids the broken sync-to-internal path
3. Requires minimal backend changes (only response normalization)
4. Reuses the existing frontend transform for external format

**Implementation order:**
1. Add external-licenses fetch path in API client
2. Normalize response for store compatibility
3. Add feature flag or env switch
4. Wire license store to use external source when flag is on
5. Verify filters (search, dba, status) work with external-licenses

---

## Next steps

1. Confirm `external_licenses` has correct `activate_date` and `sms_balance` after sync (DB query).
2. If yes → implement Approach A.
3. If no → debug sync into `external_licenses` first (Approach D).
