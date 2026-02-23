# Activate Date & SMS Balance – Root Cause Analysis

## Summary

| Issue | Root Cause | Fix Location |
|-------|------------|--------------|
| **Activate Date shows today** | Sync may not populate `starts_at` correctly, or DB has stale data from before sync fix | Backend sync + re-run sync |
| **SMS Balance shows 0** | `License` entity `toJSON()` overrides stored `smsBalance` with `getSmsBalance()` (computed as `smsPurchased - smsSent`) | `backend/src/domain/entities/license-entity.js` |

---

## Data Flow

```
External API (mapi.abcsalon.us)
  → ActivateDate: "02/12/2026", smsBalance: 18.5
  ↓
Sync job → external_licenses table → sync to internal
  ↓
licenses table (starts_at, sms_balance)
  ↓
GET /api/v1/licenses → LicenseRepository.findLicenses
  ↓
_toLicenseEntity(licenseRow) → License entity (startsAt, smsBalance from DB)
  ↓
entity.toJSON() → API response
  ↓
Frontend transformApiLicenseToRecord → LicenseRecord
  ↓
UI (license-table-columns: startsAt, smsBalance)
```

---

## Issue 1: SMS Balance Shows 0 Instead of 18.5

### Root Cause

In `backend/src/domain/entities/license-entity.js`, `toJSON()` returns:

```javascript
smsBalance: this.getSmsBalance(),
```

`getSmsBalance()` is:

```javascript
getSmsBalance() {
  return Math.max(0, this.smsPurchased - this.smsSent);
}
```

So the API always returns a computed value (`smsPurchased - smsSent`) instead of the stored `smsBalance`. For external licenses, the external API provides `smsBalance` directly (e.g. 10, 18.5). The sync stores it in `sms_balance`, and the repository passes it to the entity as `this.smsBalance`. But `toJSON()` ignores it and uses the computed value. When `smsPurchased` and `smsSent` are 0 or undefined, the result is 0.

### Fix

In `license-entity.js` `toJSON()`, prefer the stored `smsBalance` when it is a valid number, and fall back to `getSmsBalance()` otherwise:

```javascript
// Use stored smsBalance when available (external API); else compute from smsPurchased - smsSent
smsBalance: (this.smsBalance !== undefined && this.smsBalance !== null && !Number.isNaN(Number(this.smsBalance)))
  ? Number(this.smsBalance)
  : this.getSmsBalance(),
```

---

## Issue 2: Activate Date Shows Today Instead of API Value

### Possible Causes

1. **Stale data** – Sync was fixed but not re-run; `licenses.starts_at` still has old values (e.g. today).
2. **Sync bug** – Sync still does not map `ActivateDate` → `starts_at` correctly.

### Data Path

- `LicenseRepository._toLicenseEntity()` maps `licenseRow.starts_at` → `entity.startsAt`.
- `entity.toJSON()` returns `startsAt: this.startsAt`.
- Frontend uses `startsAt` for the Activate Date column.

So if `starts_at` in the DB is wrong, the UI will show the wrong date.

### Sync Path (External → Internal)

In `external-license-repository.js`, sync logic maps:

- `ActivateDate` (or `activateDate`) → `updateData.startsAt` → `licenses.starts_at`

If the sync uses the wrong field or fallback (e.g. today’s date), `starts_at` will be wrong.

### Recommended Actions

1. Confirm sync maps `ActivateDate` → `starts_at` correctly (no fallback to today when `ActivateDate` exists).
2. Re-run sync after any fix: `npm run sync:start` or `./scripts/docker-db-reset-sync.sh --drop --sync`.
3. Verify `licenses.starts_at` in the DB after sync.

---

## Frontend Transform (Already Correct)

`frontend/src/infrastructure/api/licenses/transforms.ts`:

- `startsAt`: Uses `ActivateDate ?? activateDate ?? startDay ?? startsAt` and converts MM/DD/YYYY.
- `smsBalance`: Uses `apiLicense.smsBalance ?? 0`.

The problem is upstream: the backend API response has wrong `smsBalance` because of `toJSON()`, and wrong `startsAt` if the DB has wrong `starts_at`.

---

## Fix Checklist

- [x] **SMS Balance**: Update `license-entity.js` `toJSON()` to use stored `smsBalance` when valid, else `getSmsBalance()`.
- [ ] **Activate Date**: Sync logic is correct; re-run sync to refresh stale data.
- [ ] **Re-run sync** after backend changes: `npm run sync:start` or `./scripts/docker-db-reset-sync.sh --drop --sync`
- [ ] **Verify** `licenses` table has correct `starts_at` and `sms_balance` after sync.
