# Test Coverage Improvement Plan

**Date:** Feb 23, 2026

This plan outlines how to improve test coverage for both frontend and backend, with tests organized in **separate folders** by type (unit, integration, e2e) and domain.

---

## Current State

| App | Tests | Coverage | Target | Test Location |
|-----|-------|----------|--------|---------------|
| **Backend** | 183 | ~12% | 70% | `tests/unit/`, `tests/integration/` |
| **Frontend** | 29 | ~1% | 70% | `src/**/__tests__/` (co-located) |

---

## Target Folder Structure

### Backend (keep existing + extend)

```
backend/
├── tests/
│   ├── setup.js                    # Global setup (existing)
│   ├── unit/                       # Fast, isolated, mocked
│   │   ├── auth/                   # Auth domain
│   │   │   ├── login-use-case.test.js
│   │   │   ├── refresh-token-use-case.test.js
│   │   │   ├── auth-service.test.js
│   │   │   └── token-service.test.js
│   │   ├── users/                  # User domain
│   │   │   ├── get-users-use-case.test.js
│   │   │   ├── create-user-use-case.test.js
│   │   │   └── ...
│   │   ├── licenses/               # License domain
│   │   │   ├── get-license-dashboard-metrics-use-case.test.js
│   │   │   └── ...
│   │   ├── external-licenses/       # External license domain
│   │   │   ├── sync-external-licenses-use-case.test.js
│   │   │   └── manage-external-licenses-use-case.test.js
│   │   ├── domain/                 # Domain entities
│   │   │   ├── user-entity.test.js
│   │   │   └── user-profile-entity.test.js
│   │   └── shared/                 # Shared utilities
│   │       ├── security-middleware.test.js
│   │       └── validators.test.js
│   ├── integration/               # Real DB, real HTTP
│   │   ├── auth/                   # Auth flows
│   │   │   └── auth-integration.test.js
│   │   ├── licenses/               # License API
│   │   │   └── license-dashboard-metrics.test.js
│   │   └── users/                 # User API (new)
│   │       └── user-crud-integration.test.js
│   └── e2e/                        # Full stack (optional, Phase 4)
│       └── ...
```

### Frontend (migrate to dedicated `tests/` folder)

```
frontend/
├── tests/
│   ├── setup.ts                    # Global setup (move from jest.setup.js)
│   ├── unit/                       # Pure logic, no DOM
│   │   ├── domain/                 # Domain entities
│   │   │   ├── license-entity.test.ts
│   │   │   └── user-entity.test.ts
│   │   ├── application/            # Use cases
│   │   │   ├── auth/
│   │   │   │   ├── login-usecase.test.ts
│   │   │   │   └── logout-usecase.test.ts
│   │   │   ├── user/
│   │   │   │   └── get-users-usecase.test.ts
│   │   │   └── license/
│   │   │       ├── get-licenses-usecase.test.ts
│   │   │       └── get-license-stats-usecase.test.ts
│   │   ├── infrastructure/         # API clients, transforms
│   │   │   ├── api/
│   │   │   │   ├── licenses/
│   │   │   │   │   ├── transforms.test.ts
│   │   │   │   │   └── api-client.test.ts
│   │   │   │   └── core/
│   │   │   │       └── errors.test.ts
│   │   │   └── stores/
│   │   │       └── license-store.test.ts
│   │   └── shared/                 # Helpers, utils
│   │       ├── helpers/
│   │       │   └── toast-map.test.ts
│   │       └── lib/
│   │           └── format.test.ts
│   ├── integration/               # With mocks, light DOM
│   │   ├── hooks/
│   │   │   ├── use-realtime-sync.test.tsx
│   │   │   └── use-licenses.test.tsx
│   │   └── components/
│   │       └── login-form.test.tsx
│   └── e2e/                        # Playwright/Cypress (optional)
│       └── ...
```

---

## Phase 1: Backend Reorganization

**Effort:** 0.5 day

1. **Create domain subfolders**

   - Move existing unit tests into `tests/unit/domain/`, `tests/unit/auth/`, etc.
   - Keep `tests/unit/*.test.js` for backward compatibility; gradually migrate.

2. **Jest config**

   - Ensure `testMatch` includes both `tests/unit/**/*.test.js` and `tests/integration/**/*.test.js`.
   - No changes needed if tests are already under `tests/`.

3. **Files to move**

   - `unit/user-entity.test.js` → `unit/domain/user-entity.test.js`
   - `unit/user-profile-entity.test.js` → `unit/domain/user-profile-entity.test.js`
   - `unit/login-use-case.test.js` → `unit/auth/login-use-case.test.js`
   - `unit/auth-service.test.js` → `unit/auth/auth-service.test.js`
   - `unit/token-service.test.js` → `unit/auth/token-service.test.js`
   - `unit/get-users-use-case.test.js` → `unit/users/get-users-use-case.test.js`
   - `unit/create-user-use-case.test.js` → `unit/users/create-user-use-case.test.js`
   - `unit/get-license-dashboard-metrics-use-case.test.js` → `unit/licenses/get-license-dashboard-metrics-use-case.test.js`
   - `unit/sync-external-licenses-use-case.test.js` → `unit/external-licenses/sync-external-licenses-use-case.test.js`
   - `unit/manage-external-licenses-use-case.test.js` → `unit/external-licenses/manage-external-licenses-use-case.test.js`
   - `unit/security-middleware.test.js` → `unit/shared/security-middleware.test.js`
   - `unit/validators.test.js` → `unit/shared/validators.test.js`

---

## Phase 2: Backend New Tests

**Effort:** 8–12 days

**Priority order:**

| # | Domain | Tests to Add | Files | Est. |
|---|--------|--------------|-------|------|
| 1 | Repositories | `unit/repositories/license-repository.test.js` | 1 | 1 day |
| 2 | Repositories | `unit/repositories/user-repository.test.js` | 1 | 1 day |
| 3 | Repositories | `unit/repositories/external-license-repository.test.js` | 1 | 1 day |
| 4 | External API | `unit/external-licenses/external-license-api-service.test.js` | 1 | 1 day |
| 5 | License Lifecycle | `unit/licenses/renew-license-use-case.test.js` | 1 | 0.5 day |
| 6 | License Lifecycle | `unit/licenses/expire-license-use-case.test.js` | 1 | 0.5 day |
| 7 | License Service | `unit/licenses/license-service.test.js` | 1 | 1 day |
| 8 | Integration | `integration/licenses/license-crud.test.js` | 1 | 1 day |
| 9 | Integration | `integration/users/user-crud.test.js` | 1 | 1 day |
| 10 | Error handling | `unit/shared/error-responses.test.js` | 1 | 0.5 day |

---

## Phase 3: Frontend Test Folder Setup

**Effort:** 1 day

1. **Create `frontend/tests/`**

   - Create `tests/unit/`, `tests/integration/` (and optionally `tests/e2e/`).
   - Add `tests/setup.ts` (or keep `jest.setup.js` at root).

2. **Update Jest config**

   - Add `tests/` to `testMatch`:
     ```js
     testMatch: [
       '<rootDir>/tests/**/*.(test|spec).(js|jsx|ts|tsx)',
       '<rootDir>/src/**/__tests__/**/*.(test|spec).(js|jsx|ts|tsx)', // Keep for migration
     ],
     ```
   - Ensure path aliases work for `tests/` imports.

3. **Migrate existing tests**

   - `src/domain/entities/__tests__/license-entity.test.ts` → `tests/unit/domain/license-entity.test.ts`
   - `src/application/use-cases/license/__tests__/get-licenses-usecase.test.ts` → `tests/unit/application/license/get-licenses-usecase.test.ts`
   - `src/presentation/hooks/__tests__/use-realtime-sync.test.tsx` → `tests/integration/hooks/use-realtime-sync.test.tsx`

4. **Remove `__tests__` after migration**

   - Once all tests are under `tests/`, update `testMatch` to only `tests/**/*.(test|spec).(ts|tsx)`.
   - Remove empty `__tests__` folders.

---

## Phase 4: Frontend New Tests

**Effort:** 10–15 days

**Priority order:**

| # | Domain | Tests to Add | Files | Est. |
|---|--------|--------------|-------|------|
| 1 | Domain | `unit/domain/user-entity.test.ts` | 1 | 0.5 day |
| 2 | Application | `unit/application/auth/logout-usecase.test.ts` | 1 | 0.5 day |
| 3 | Application | `unit/application/auth/change-password-usecase.test.ts` | 1 | 0.5 day |
| 4 | Application | `unit/application/user/get-users-usecase.test.ts` | 1 | 0.5 day |
| 5 | Application | `unit/application/license/get-license-stats-usecase.test.ts` | 1 | 0.5 day |
| 6 | Infrastructure | `unit/infrastructure/api/licenses/transforms.test.ts` | 1 | 0.5 day |
| 7 | Infrastructure | `unit/infrastructure/api/core/errors.test.ts` | 1 | 0.5 day |
| 8 | Infrastructure | `unit/infrastructure/stores/auth-store.test.ts` | 1 | 1 day |
| 9 | Infrastructure | `unit/infrastructure/stores/license-store.test.ts` | 1 | 1.5 days |
| 10 | Integration | `integration/hooks/use-licenses.test.tsx` | 1 | 1 day |
| 11 | Integration | `integration/components/login-form.test.tsx` | 1 | 1 day |
| 12 | Integration | `integration/components/licenses-data-grid.test.tsx` | 1 | 1.5 days |
| 13 | Shared | `unit/shared/helpers/toast-map.test.ts` | 1 | 0.5 day |
| 14 | Shared | `unit/shared/helpers/logger.test.ts` | 1 | 0.5 day |

---

## Phase 5: Coverage Thresholds (Optional)

**Effort:** 0.5 day

1. **Relax thresholds temporarily**

   - Backend: Lower from 70% to 30% until coverage improves.
   - Frontend: Lower from 70% to 10% until coverage improves.
   - Or use `coverageThreshold: {}` to disable during ramp-up.

2. **Per-domain thresholds (later)**

   - Use `coverageThresholds` per path to enforce higher coverage for critical paths (e.g. auth, licenses).

---

## Jest Config Changes

### Backend (`backend/jest.config.js`)

```js
testMatch: [
  '<rootDir>/tests/unit/**/*.test.js',
  '<rootDir>/tests/integration/**/*.test.js',
],
```

### Frontend (`frontend/jest.config.js`)

```js
testMatch: [
  '<rootDir>/tests/**/*.(test|spec).(ts|tsx)',
  // During migration, also keep:
  // '<rootDir>/src/**/__tests__/**/*.(test|spec).(ts|tsx)',
],
```

---

## Migration Checklist

### Backend

- [ ] Create `tests/unit/domain/`, `tests/unit/auth/`, `tests/unit/users/`, `tests/unit/licenses/`, `tests/unit/external-licenses/`, `tests/unit/shared/`
- [ ] Move existing unit tests into domain subfolders
- [ ] Add repository unit tests
- [ ] Add external-license-api-service unit tests
- [ ] Add license-service unit tests
- [ ] Add integration tests for license and user CRUD
- [ ] Verify coverage reaches 30%+ (then 50%, then 70%)

### Frontend

- [ ] Create `frontend/tests/` with `unit/`, `integration/`
- [ ] Move existing tests from `src/**/__tests__/` to `tests/`
- [ ] Update Jest `testMatch` for `tests/`
- [ ] Add domain entity tests
- [ ] Add use case tests
- [ ] Add infrastructure transforms and errors tests
- [ ] Add store tests
- [ ] Add integration tests for hooks and components
- [ ] Remove `__tests__` folders after migration
- [ ] Verify coverage reaches 30%+ (then 50%, then 70%)

---

## Naming Conventions

| Type | Location | Naming | Example |
|------|----------|--------|---------|
| Unit | `tests/unit/<domain>/` | `<module>.test.ts` | `license-entity.test.ts` |
| Integration | `tests/integration/<domain>/` | `<module>.test.tsx` | `use-realtime-sync.test.tsx` |
| E2E | `tests/e2e/` | `<flow>.spec.ts` | `login-flow.spec.ts` |

---

## Dependencies

- **Backend**: No new deps; Jest + Supertest already configured.
- **Frontend**: No new deps; Jest + RTL already configured.
- **E2E (optional)**: Add Playwright or Cypress in a later phase.

---

## Related Docs

- Backend: `backend/docs/architecture/architecture-overview.md`
- Frontend: `frontend/docs/development/README.md`
- Evaluation: `docs/` (analysis summary)
