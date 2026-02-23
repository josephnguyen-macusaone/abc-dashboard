# Recommendations Implementation Plan

**Date:** Feb 23, 2026

This plan covers all recommendations from the Frontend & Backend Evaluation. Each recommendation is broken into phases with dependencies, effort estimates, and checklists.

---

## Overview

| # | Recommendation | Priority | Effort | Depends On |
|---|----------------|----------|--------|------------|
| 1 | Increase test coverage | High | 20–28 days | — |
| 2 | Adopt OpenAPI codegen | High | 3–5 days | — |
| 3 | Complete SSR migration | Medium | 5–8 days | 2 (partial) |
| 4 | Standardize error responses | Medium | 2–3 days | — |
| 5 | Simplify backend DI | Low | 2–3 days | 1 (tests) |
| 6 | useEffect audit | Low | 3–5 days | — |

**Total estimated effort:** 35–52 days (can be parallelized).

---

## Recommendation 1: Increase Test Coverage

**Reference:** `docs/TEST_COVERAGE_IMPROVEMENT_PLAN.md`

### Scope

- Backend: Repositories, external license API, license sync, license service
- Frontend: Auth flow, license store, critical use cases, transforms, errors
- Target: 70% coverage (ramp via 30% → 50% → 70%)

### Phases

| Phase | Action | Effort |
|-------|--------|--------|
| 1.1 | Backend: Reorganize tests into domain subfolders | 0.5 day |
| 1.2 | Backend: Add repository, service, integration tests | 8–12 days |
| 1.3 | Frontend: Create `tests/` folder, migrate existing tests | 1 day |
| 1.4 | Frontend: Add unit and integration tests | 10–15 days |

### Checklist

- [ ] Backend: Create `tests/unit/auth/`, `users/`, `licenses/`, `external-licenses/`, `domain/`, `shared/`
- [ ] Backend: Move existing unit tests into domain subfolders
- [ ] Backend: Add `license-repository.test.js`, `user-repository.test.js`, `external-license-repository.test.js`
- [ ] Backend: Add `external-license-api-service.test.js`, `license-service.test.js`
- [ ] Backend: Add `integration/licenses/license-crud.test.js`, `integration/users/user-crud.test.js`
- [ ] Frontend: Create `frontend/tests/unit/`, `tests/integration/`
- [ ] Frontend: Migrate tests from `src/**/__tests__/` to `tests/`
- [ ] Frontend: Add domain, application, infrastructure, shared unit tests
- [ ] Frontend: Add integration tests for hooks and components
- [ ] Both: Relax coverage thresholds during ramp-up; restore to 70% when ready

---

## Recommendation 2: Adopt OpenAPI Codegen

**Goal:** Use `generated-types.d.ts` as the source of truth for API types. Replace manual DTOs where possible. Add codegen to CI.

### Current State

- Backend: Swagger/OpenAPI via `swagger-jsdoc`; `npm run export:swagger` generates `swagger-spec.json`
- Frontend: `openapi-typescript` generates `generated-types.d.ts`; manual DTOs in `application/dto/api-dto.ts` and `infrastructure/api/licenses/types.ts`
- Codegen script exists: `npm run codegen` (backend export + frontend types)

### Phases

| Phase | Action | Effort |
|-------|--------|--------|
| 2.1 | Ensure Swagger spec is complete and accurate | 1 day |
| 2.2 | Create type aliases from generated types for API clients | 1 day |
| 2.3 | Replace manual DTOs with generated types (incremental) | 1–2 days |
| 2.4 | Add codegen to CI pipeline | 0.5 day |
| 2.5 | Document codegen workflow | 0.5 day |

### Implementation Details

**2.1 Swagger completeness**

- Audit all routes in `backend/src/infrastructure/routes/`
- Ensure request/response schemas in JSDoc match actual behavior
- Add missing schemas for license, user, auth, profile endpoints

**2.2 Type aliases**

- In `frontend/src/infrastructure/api/`, create `generated-types.ts` that re-exports from `generated-types.d.ts`
- Map `paths['/api/v1/auth/login']['post']['responses']['200']['content']['application/json']` to `LoginResponseDto`-like aliases

**2.3 Replace manual DTOs**

- Start with auth: `LoginRequestDto`, `LoginResponseDto` → generated
- Then users: `UserProfileDto`, `CreateUserRequestDto`, etc.
- Licenses: Use generated types for request/response; keep transforms for `LicenseRecord` mapping
- Keep `ApiExceptionDto` and `ApiErrorDto` (error handling is custom)

**2.4 CI**

- Add step: `npm run codegen` (from repo root or frontend)
- Fail if generated file differs from committed version (detect drift)

### Checklist

- [ ] Backend: Audit and complete Swagger schemas for all routes
- [ ] Frontend: Create `generated-types.ts` re-exports
- [ ] Frontend: Replace `api-dto.ts` auth DTOs with generated types
- [ ] Frontend: Replace `api-dto.ts` user DTOs with generated types
- [ ] Frontend: Use generated types in `licenses/types.ts` where applicable
- [ ] CI: Add `codegen` step; add check for uncommitted changes
- [ ] Docs: Add "API Types & Codegen" section to development README

---

## Recommendation 3: Complete SSR Migration

**Goal:** Convert public pages and key dashboard pages to RSC. Use `getServerSession()` for auth. Reduce client-side data fetching where server can provide data.

### Current State

- `getServerSession()` exists in `infrastructure/auth/server-session.ts`
- `createServerHttpClient()` and `getServerLicenseApiClient()` exist in `shared/di/server-container.ts`
- Most pages are client components with client-side fetches

### Phases

| Phase | Action | Effort |
|-------|--------|--------|
| 3.1 | Convert public pages (login, forgot-password, reset-password) to RSC | 1 day |
| 3.2 | Refactor layout/auth to use `getServerSession()` for redirects | 1 day |
| 3.3 | Convert dashboard page to hybrid (server data + client interactivity) | 1–2 days |
| 3.4 | Convert licenses page to hybrid | 1–2 days |
| 3.5 | Add `loading.tsx` skeletons and Suspense boundaries | 1 day |
| 3.6 | Remove redundant client-side initial fetches | 0.5–1 day |

### Implementation Details

**3.1 Public pages**

- `app/login/page.tsx`: Server component; redirect if already authenticated
- `app/forgot-password/page.tsx`: Server component
- `app/reset-password/page.tsx`: Server component (form stays client)

**3.2 Layout/auth**

- In root layout or auth middleware: call `getServerSession()`; redirect unauthenticated users to `/login`
- Protect `/dashboard`, `/licenses`, `/users`, `/profile` routes

**3.3–3.4 Hybrid pages**

- Fetch initial data in server component or server action
- Pass data as props to client components for interactivity
- Use `getServerLicenseRepository()` or `getServerLicenseApiClient()` for license data

**3.5 Loading states**

- Add `app/dashboard/loading.tsx`, `app/licenses/loading.tsx`, etc.
- Wrap async server components in Suspense

### Checklist

- [ ] Public pages: Convert to RSC; add redirect logic
- [ ] Layout: Use `getServerSession()` for auth check; redirect logic
- [ ] Dashboard: Server fetch metrics; client for charts/interactivity
- [ ] Licenses: Server fetch initial list; client for table, filters, pagination
- [ ] Add `loading.tsx` for main routes
- [ ] Remove duplicate fetches in stores where server already provides data
- [ ] Verify no hydration mismatches

---

## Recommendation 4: Standardize Error Responses

**Goal:** Single error shape on backend. Consistent parsing and handling on frontend.

### Current State

- Backend: `ERROR_LIST` in `error-responses.js`; multiple response helpers; some controllers return ad-hoc shapes
- Frontend: `handleApiError()` in `core/errors.ts`; `ApiExceptionDto`; `getErrorMessage()`, `getLoginErrorMessage()`

### Phases

| Phase | Action | Effort |
|-------|--------|--------|
| 4.1 | Define canonical error response schema (backend) | 0.5 day |
| 4.2 | Refactor backend to use single error formatter everywhere | 1 day |
| 4.3 | Update frontend `handleApiError` to expect canonical shape | 0.5 day |
| 4.4 | Document error contract in Swagger | 0.5 day |

### Canonical Error Shape

```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password",
    "category": "authentication",
    "statusCode": 401,
    "details": {}
  }
}
```

### Implementation Details

**4.1–4.2 Backend**

- Add `formatErrorResponse(error, options)` in `error-responses.js`
- Ensure all controllers use it (or middleware catches and formats)
- Map `ERROR_LIST` entries to this shape
- Validation errors (express-validator, Joi) → same shape with `category: "validation"`

**4.3 Frontend**

- `handleApiError()` already handles `data.error.message` and `data.message`
- Align with canonical shape; remove fallbacks for legacy formats once backend is updated

### Checklist

- [x] Backend: Define and document canonical error schema
- [x] Backend: Refactor `error-responses.js` to single formatter (formatCanonicalError, ErrorResponse.toResponse)
- [x] Backend: Update controllers/middleware to use formatter
- [x] Frontend: Update `handleApiError` for canonical shape
- [ ] Swagger: Add error response schemas to routes

---

## Recommendation 5: Simplify Backend DI

**Goal:** Use Awilix (or similar) for cleaner registration and wiring. Reduce manual container code.

### Current State

- Custom `Container` class in `shared/kernel/container.js`
- Manual `getXxx()` methods; lazy singletons; `setCorrelationId` wiring
- Awilix is in `package.json` but not used

### Phases

| Phase | Action | Effort |
|-------|--------|--------|
| 5.1 | Design Awilix container structure (lifetimes, registration) | 0.5 day |
| 5.2 | Migrate repositories and use cases to Awilix | 1 day |
| 5.3 | Migrate controllers and services to Awilix | 1 day |
| 5.4 | Remove old container; update server.js | 0.5 day |
| 5.5 | Add request-scoped correlation ID via middleware | 0.5 day |

### Implementation Details

**5.1 Design**

- `SINGLETON`: DB connection, logger, cache, external API client
- `SINGLETON`: Repositories, use cases, services
- `SCOPED` (per-request): Correlation ID; optional request-scoped repos if needed

**5.2–5.4 Migration**

- Create `shared/kernel/awilix-container.js`
- Register: `asClass(UserRepository).singleton()`, `asClass(LoginUseCase).singleton()`, etc.
- Resolve in middleware: `req.container = container.createScope()`
- Controllers receive deps via `cradle` or constructor injection

**5.5 Correlation ID**

- Middleware: `req.correlationId = generateCorrelationId()`
- Pass to logger/repos via `req` or scoped container

### Checklist

- [ ] Create Awilix container module
- [ ] Register all repositories, use cases, services
- [ ] Update route registration to inject from container
- [ ] Migrate correlation ID to middleware
- [ ] Remove old `Container` class
- [ ] Verify all tests pass (update mocks if needed)

### Dependency

- **Recommendation 1** (tests): Ensure repository and use case tests exist before refactoring DI, so behavior is preserved.

---

## Recommendation 6: useEffect Audit

**Goal:** Reduce effect-driven logic. Prefer derived state, event handlers, and explicit data flow. Align with project React guidelines.

### Current State

- ~50+ files use `useEffect` or `useState`
- Project rules: avoid `useEffect` for dependent logic; prefer derived state and event handlers

### Phases

| Phase | Action | Effort |
|-------|--------|--------|
| 6.1 | Audit and categorize all useEffect usages | 1 day |
| 6.2 | Refactor high-impact components (auth, license fetch, filters) | 1–2 days |
| 6.3 | Refactor medium-impact (forms, tables, modals) | 1–2 days |
| 6.4 | Document patterns and add lint rules (optional) | 0.5 day |

### Audit Categories

| Category | Action |
|----------|--------|
| **Mount-only init** | Keep; ensure deps correct |
| **Sync state from props** | Replace with derived state or key reset |
| **Fetch on mount** | Consider RSC or explicit trigger (e.g. user action) |
| **Subscription/listener** | Keep; ensure cleanup |
| **Debounce/throttle** | Prefer `useDebouncedCallback` or event handler |
| **Multiple useStates** | Consider state machine or single state object |

### High-Impact Targets

- `use-licenses.ts` – fetch logic
- `use-initial-license-filters.ts` – init logic
- `license-management-page.tsx` – filters, fetch
- `auth-initializer.tsx` – auth check
- `protected-route.tsx` – auth redirect

### Checklist

- [ ] Create `docs/USEEFFECT_AUDIT.md` with categorized list
- [ ] Refactor `use-licenses`, `use-initial-license-filters`
- [ ] Refactor `license-management-page`, `license-dashboard`
- [ ] Refactor `auth-initializer`, `protected-route`
- [ ] Refactor form components (login, user create/edit)
- [ ] Add ESLint rule for useEffect deps (optional)

---

## Execution Order

### Parallel Tracks

| Track | Recommendations | Can Run In Parallel |
|-------|-----------------|---------------------|
| **A** | 1 (tests), 2 (codegen) | Yes |
| **B** | 4 (errors) | Yes with A |
| **C** | 3 (SSR) | After 2 partial; can overlap with A |
| **D** | 5 (DI) | After 1.2 (backend tests) |
| **E** | 6 (useEffect) | Yes with others |

### Suggested Sequence

1. **Week 1–2:** 1.1–1.2 (backend test reorg + new tests), 2.1–2.3 (codegen)
2. **Week 2–3:** 1.3–1.4 (frontend tests), 4 (error standardization)
3. **Week 3–4:** 3 (SSR migration), 2.4–2.5 (codegen CI + docs)
4. **Week 4–5:** 5 (backend DI), 6 (useEffect audit)

---

## Success Criteria

| Recommendation | Done When |
|----------------|-----------|
| 1 | Backend & frontend coverage ≥ 70%; tests in `tests/` folders |
| 2 | All API types from codegen; codegen in CI; manual DTOs removed |
| 3 | Public pages RSC; dashboard/licenses hybrid; auth via `getServerSession()` |
| 4 | Single error shape; all backend errors use it; frontend parses it |
| 5 | Awilix container; old Container removed; tests pass |
| 6 | Audit doc; high-impact components refactored; no new anti-patterns |

---

## Related Docs

- `docs/TEST_COVERAGE_IMPROVEMENT_PLAN.md` – Test structure and phases
- `docs/LICENSE_API_SERVICE_DEPRECATION_PLAN.md` – License API (completed)
- `backend/docs/architecture/architecture-overview.md`
- `frontend/docs/architecture/clean-architecture-guide.md`
