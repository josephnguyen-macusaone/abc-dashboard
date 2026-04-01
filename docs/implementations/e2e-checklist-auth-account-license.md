# E2E checklist: start -> auth -> account -> license

Use this checklist for manual QA after deploy/reset (local or staging), focused on Agent / Tech / Accountant flows.

## Test info

- Date:
- Environment: (local/staging/prod-like)
- Build/commit:
- Tester:

## 0) Startup and system health

- [x] Run `make deploy-sync` successfully.
- [x] Backend health returns OK (`/api/v1/health`).
- [x] Frontend loads without runtime errors.
- [x] External API connectivity is available from backend.
- [x] No critical startup errors in backend logs.

## 1) Authentication flow (all three roles)

Run for Agent, Tech, Accountant:

- [ ] Signup success with valid payload.
- [ ] Signup rejects invalid/missing required fields.
- [x] Login success with valid credentials. (API verified for Agent/Tech/Accountant on 2026-04-01)
- [x] Login fails with wrong password. (API verified)
- [x] Protected routes are blocked when unauthenticated. (API verified: `/external-licenses` returns 401)
- [x] Logout invalidates session.
- [ ] Password reset flow works (request + reset + relogin).

## 2) Account/profile flow

- [ ] Profile page loads current user data.
- [ ] Profile update succeeds.
- [ ] Change password works; old password no longer valid.
- [ ] Role after login matches expected role.
- [ ] Unauthorized screens/actions are hidden or denied (403).

## 3) Role permission matrix

### Agent

- [x] Can view only assigned licenses (read-only behavior). (Server-side scoping + ownership checks verified in controller paths)
- [x] Cannot create/update/delete license. (API verified for restricted operations returning 403)
- [ ] Can view SMS balance.
- [ ] Can view SMS payment history.
- [ ] Cannot access Tech/Accountant-only actions.

### Tech

- [ ] Can submit/add license where allowed by API flow.
- [x] Can reset license ID. (API verified; invalid appid now returns 404 instead of 500)
- [ ] Can adjust activate date.
- [ ] Can adjust coming-expired date.
- [ ] Cannot perform Accountant-only restricted actions.

### Accountant

- [ ] Can view licenses.
- [ ] Can adjust coming-expired.
- [ ] Can deactivate/activate.
- [ ] Can add license.
- [x] Can add SMS balance. (API verified; invalid appid now returns 404 instead of 500)
- [ ] Can adjust package.

## 4) License + SMS behavior (API-first roles)

- [ ] License list loads from external/API-backed flow for Agent/Tech/Accountant.
- [ ] Search/filter/pagination work as expected.
- [ ] Update actions persist and refresh correctly.
- [ ] Conflict-safe behavior works (`409` stale update handling where applicable).
- [ ] Reset license ID endpoint works.
- [ ] Add SMS payment endpoint works.
- [ ] SMS payment history includes newly added transaction.
- [ ] Web DB is not used as heavy mirror for these role flows.

## 5) Audit and logging

For each mutation path used in this run:

- [ ] Logs include `correlationId`.
- [ ] Logs include `userId` and `userRole`.
- [ ] Logs include action name and timestamp.
- [ ] Audit rows/events exist for paths implemented with DB audit.
- [ ] Error logs contain enough context for troubleshooting.

## 6) Stability and regression

- [ ] Concurrent usage check: Agent + Tech + Accountant sessions in parallel.
- [ ] Repeated actions (10-20 ops) do not crash backend/frontend.
- [ ] Backend container remains healthy (no restart loop).
- [ ] Frontend production build passes.
- [ ] Backend test suite passes.

## 7) Final report

### Summary

- Total checks:
- Passed:
- Failed:
- Blocked:

### Findings

| ID | Severity | Area | Role | Steps | Actual | Expected | Evidence |
|----|----------|------|------|-------|--------|----------|----------|
|    |          |      |      |       |        |          |          |

### Decision

- [ ] Ready for release
- [ ] Ready with known minor issues
- [ ] Not ready (fix required)

