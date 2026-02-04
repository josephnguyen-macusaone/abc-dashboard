# Dashboard Metrics Verification Plan

**Endpoint:** `GET /api/v1/licenses/dashboard/metrics`  
**Purpose:** Verify that all calculations in the dashboard metrics use case are correct and consistent.

---

## 1. Scope

| Layer      | File                                                                           | What to verify                                                                            |
| ---------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Route      | `src/infrastructure/routes/license-routes.js`                                  | GET `/dashboard/metrics` exists, auth, validation                                         |
| Controller | `src/infrastructure/controllers/license-controller.js`                         | Parses `startsAtFrom`, `startsAtTo` from query; passes `filters` + `dateRange` to service |
| Service    | `src/shared/services/license-service.js`                                       | `getDashboardMetrics(options)` calls use case with same options                           |
| Use case   | `src/application/use-cases/licenses/get-license-dashboard-metrics-use-case.js` | Period logic, data fetches, `_calculateMetrics` formulas                                  |
| Repository | `src/infrastructure/repositories/license-repository.js`                        | `findLicenses` with `startsAtFrom` / `startsAtTo` returns correct date-filtered list      |
| Validator  | `src/application/validators/license-validator.js`                              | `validateListQuery` parses date params into `filters.startsAtFrom` / `filters.startsAtTo` |

---

## 2. Inputs to the endpoint

| Source | Key params                                               | How used                                                        |
| ------ | -------------------------------------------------------- | --------------------------------------------------------------- |
| Query  | `startsAtFrom`, `startsAtTo` (or `startDate`, `endDate`) | Controller builds `dateRange`; validator may put into `filters` |
| Query  | `search`, `status`, `plan`, `term`, `dba`, `zip`, etc.   | In `filters`; applied to all license fetches (userFilters)      |

**Period logic (use case):**

- If `dateRange.startsAtFrom` and `dateRange.startsAtTo` are both set:
  - **Target period:** `[dateRange.startsAtFrom, dateRange.startsAtTo]`
  - **Comparison period:** Previous calendar month (e.g. if target is Feb → comparison is Jan 1 00:00 to Jan 31 23:59:59.999)
- If no date range:
  - **Target period:** Current month (start of month → end of month)
  - **Comparison period:** Previous month (same shape)

**Check:**

- [ ] With `?startsAtFrom=2025-02-01&startsAtTo=2025-02-28`, response `metadata.currentPeriod` matches that range and `metadata.previousPeriod` is January that year.
- [ ] With no date params, target is current month and comparison is previous month (by server clock).

---

## 3. Data fetches (use case)

The use case runs up to 4 repository calls:

| Fetch                      | Filters                                    | Purpose                                                              |
| -------------------------- | ------------------------------------------ | -------------------------------------------------------------------- |
| `allLicenses`              | `userFilters` only (no date)               | Fallback / high-risk denominator; not used for trend metrics         |
| `filteredLicenses`         | `mergedFilters` = userFilters + date range | Used for **highRiskLicenses** and **metadata.totalLicensesAnalyzed** |
| `targetPeriodLicenses`     | userFilters + target period dates          | **All trend metrics** (value + comparison numerator)                 |
| `comparisonPeriodLicenses` | userFilters + comparison period dates      | **All trend metrics** (comparison denominator)                       |

**Check:**

- [ ] When date range is set: `targetPeriodLicenses` and `filteredLicenses` cover the same period (so counts can align where intended).
- [ ] When date range is not set: `filteredLicenses` = allLicenses; target/comparison are current/previous month only.

---

## 4. Metric-by-metric calculation checklist

### 4.1 Total Active Licenses

| Item     | Formula / rule                                        | Source data                                                 |
| -------- | ----------------------------------------------------- | ----------------------------------------------------------- |
| Value    | Count of licenses with `status === 'active'`          | `targetPeriodLicenses`                                      |
| Trend    | Like-to-like: same count for **comparison period**    | `comparisonPeriodLicenses` (active count)                   |
| % change | `(current - previous) / previous * 100`, capped ±999% | `trendValue(totalActiveLicenses, comparisonActiveLicenses)` |

**Verify:**

- [ ] Value = number of rows in target period where `status === 'active'`.
- [ ] Trend value = `min(999, abs((current - previous) / previous * 100))` when previous > 0.
- [ ] When previous = 0 and current > 0, trend value = 100 (capped).
- [ ] Direction: up when current > previous, down when current < previous, neutral when equal.

### 4.2 New Licenses This Month

| Item     | Formula / rule                                      | Source data                                                      |
| -------- | --------------------------------------------------- | ---------------------------------------------------------------- |
| Value    | Count of licenses that **started** in target period | `targetPeriodLicenses.length`                                    |
| Trend    | Same count for comparison period                    | `comparisonPeriodLicenses.length`                                |
| % change | Same formula and cap as above                       | `trendValue(newLicensesThisPeriod, newLicensesComparisonPeriod)` |

**Verify:**

- [ ] Value = total count of licenses in `targetPeriodLicenses` (no status filter).
- [ ] Trend compares to `comparisonPeriodLicenses.length`.

### 4.3 License Income This Month

| Item     | Formula / rule                                     | Source data                                                          |
| -------- | -------------------------------------------------- | -------------------------------------------------------------------- |
| Value    | Sum of `lastPayment` for licenses in target period | `targetPeriodLicenses`                                               |
| Trend    | Sum of `lastPayment` for comparison period         | `comparisonPeriodLicenses`                                           |
| % change | Same formula and cap                               | `trendValue(licenseIncomeThisPeriod, licenseIncomeComparisonPeriod)` |

**Verify:**

- [ ] Value = sum of `license.lastPayment` (parsed as number, NaN → 0) over `targetPeriodLicenses`.
- [ ] Comparison sum over `comparisonPeriodLicenses` with same parsing.

### 4.4 SMS Income This Month

| Item  | Formula / rule                           | Source data                                              |
| ----- | ---------------------------------------- | -------------------------------------------------------- |
| Value | `smsSentThisPeriod * 0.05` (5¢ per SMS)  | `targetPeriodLicenses` (sum of `smsSent`)                |
| Trend | Based on **usage** (smsSent), not income | `trendValue(smsSentThisPeriod, smsSentComparisonPeriod)` |

**Verify:**

- [ ] Value = sum of `license.smsSent` in target period × 0.05.
- [ ] Trend % is from comparison of **smsSent** counts, not income.

### 4.5 In-house vs Agent Licenses

| Item        | Formula / rule                                     | Source data                                       |
| ----------- | -------------------------------------------------- | ------------------------------------------------- | ------- | ---------------------- |
| Agent heavy | Count where `(license.agents                       |                                                   | 0) > 3` | `targetPeriodLicenses` |
| In-house    | `targetPeriodLicenses.length - agentHeavyLicenses` | Same                                              |
| Trend       | Like-to-like vs comparison period                  | `comparisonPeriodLicenses` (same agent threshold) |

**Verify:**

- [ ] Value uses **target period** only (not filteredLicenses).
- [ ] Trend compares to same definitions in comparison period.

### 4.6 High Risk Licenses

| Item  | Formula / rule                               | Source data                                   |
| ----- | -------------------------------------------- | --------------------------------------------- |
| Value | Count where `lastActive` &lt; (now - 7 days) | `filteredLicenses` (user’s view / date range) |
| Trend | Fixed: 0, neutral, "auto-updated daily"      | No calculation                                |

**Verify:**

- [ ] Uses `filteredLicenses` (not target period only).
- [ ] `lastActive` parsed as date; count only licenses with `lastActive` &lt; sevenDaysAgo.

### 4.7 Estimated Next Month Income

| Item  | Formula / rule                                                           | Source data   |
| ----- | ------------------------------------------------------------------------ | ------------- |
| Value | `licenseIncomeThisPeriod + averagePayment * newLicensesThisPeriod * 0.1` | Target period |
| Trend | Fixed: 10, up, "projected"                                               | No comparison |

**Verify:**

- [ ] `averagePayment` = `licenseIncomeThisPeriod / targetPeriodLicenses.length` (or 0 if empty).
- [ ] Formula matches implementation (10% growth estimate).

---

## 5. Trend formula and cap (shared)

- **Formula:** `(current - previous) / previous * 100` when previous ≠ 0.
- **When previous = 0:** result is 0 if current = 0, else 100 (capped).
- **Cap:** Result is clamped to `[-999, 999]`; trend **value** is `Math.abs()` of that.
- **Check:**
  - [ ] All trend values in response are in `[0, 999]`.
  - [ ] Direction matches sign of (current - previous).

---

## 6. Verification methods

### 6.1 Unit tests (recommended)

- **Target:** `GetLicenseDashboardMetricsUseCase._calculateMetrics(...)` with fixed arrays.
- **Cases:**
  - Known lists for target and comparison; assert each metric value and trend (value + direction).
  - previous = 0 for a metric → trend value 0 or 100, direction correct.
  - Large % change → trend value capped at 999.
  - Empty target period → no divide-by-zero; income and estimated income behave.

### 6.2 Integration test (recommended)

- **Target:** `GET /api/v1/licenses/dashboard/metrics` with auth.
- **Cases:**
  - No query: 200, structure has all metric keys and `metadata.currentPeriod` / `metadata.previousPeriod`.
  - With `startsAtFrom` & `startsAtTo`: 200, `metadata.currentPeriod` matches query; metrics are numbers/objects as expected.
  - Invalid date params: 400 (if validator rejects).

### 6.3 Manual / DB-backed check

1. Pick a date range (e.g. Feb 2025) and ensure DB has known licenses (start dates, status, lastPayment, smsSent, agents, lastActive).
2. Call `GET /api/v1/licenses/dashboard/metrics?startsAtFrom=2025-02-01&startsAtTo=2025-02-28`.
3. In DB (or export): count active in target period, count active in Jan 2025, sum lastPayment for target and for Jan, etc.
4. Compare response values and trend percentages to manual calculations.

---

## 7. Quick checklist (run before release)

- [ ] Period logic: with and without date range, target and comparison periods are as specified in §2.
- [ ] Total Active / New / Income / SMS / In-house / Agent use **target** vs **comparison** (like-to-like); no mix of “all licenses” vs “period licenses”.
- [ ] High Risk uses **filteredLicenses**; others that show “vs last month” use **targetPeriodLicenses** and **comparisonPeriodLicenses**.
- [ ] All percentage trends capped at 999%; no divide-by-zero when previous = 0.
- [ ] Response shape: each metric has `value` and `trend.value`, `trend.direction`, `trend.label`; `metadata` has `currentPeriod`, `previousPeriod`, `totalLicensesAnalyzed`, `appliedFilters`.

---

## 8. Test files (added)

| Type              | Path                                                        | How to run                                                                                                                                                       |
| ----------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit (use case)   | `tests/unit/get-license-dashboard-metrics-use-case.test.js` | `npm run test -- tests/unit/get-license-dashboard-metrics-use-case.test.js`                                                                                      |
| Integration (API) | `tests/integration/license-dashboard-metrics.test.js`       | `npm run test -- tests/integration/license-dashboard-metrics.test.js` (requires PostgreSQL test DB). Skipped by default `npm test` via `testPathIgnorePatterns`. |

Use the same period and cap logic as in the use case so tests document and lock the intended behavior.
