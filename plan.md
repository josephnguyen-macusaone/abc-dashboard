---
name: Signup & Auth Flow Overhaul
overview: Simplify the signup form (remove firstName/lastName/username), add automated license assignment by email on verification, and confirm the already-existing login redirect guard is wired correctly.
todos:
  - id: be-schema
    content: Make firstName/lastName optional in auth Joi schema (backend/src/infrastructure/api/v1/schemas/auth.schemas.js)
    status: done
  - id: be-validator
    content: Make firstName/lastName optional in AuthValidator.validateSignup (backend/src/application/validators/auth-validator.js) — mirrors be-schema, both layers validate the same fields
    status: done
  - id: be-signup-uc
    content: Derive displayName from email local-part when names not provided in signup use case (backend/src/application/use-cases/auth/signup-use-case.js)
    status: done
  - id: be-repo-all
    content: Add findAllByEmailLicense() to license-repository returning array of all matches
    status: done
  - id: be-verify-uc
    content: Inject licenseRepository into VerifyEmailUseCase and add _autoAssignLicenses() after activation (backend/src/application/use-cases/auth/verify-email-use-case.js)
    status: done
  - id: be-di
    content: Update DI container to pass licenseRepository to VerifyEmailUseCase (backend/src/shared/kernel/container.js)
    status: done
  - id: fe-form
    content: Remove firstName/lastName/username from signup form; relabel email as License Email (frontend/src/presentation/components/organisms/auth/signup-form.tsx)
    status: done
  - id: fe-dto
    content: Remove firstName/lastName from SignupRequestDto (frontend/src/application/dto/api-dto.ts)
    status: done
  - id: fe-redirect
    content: Verify getDefaultRedirect covers all 3 new roles in middleware (frontend/middleware.ts line 314)
    status: done
isProject: false
---

# Signup & Auth Flow Overhaul

## What already works (no changes needed)

- Email verification flow end-to-end (signup → JWT token email → `POST /auth/verify-email` → `updateEmailVerification`) — confirmed in [verify-email-use-case.js](backend/src/application/use-cases/auth/verify-email-use-case.js)
- Login blocks unverified accounts (`EmailNotVerifiedException` in [login-use-case.js](backend/src/application/use-cases/auth/login-use-case.js) line 62) — also blocks deactivated accounts separately
- Middleware redirect guard: authenticated+active users visiting `/login` already redirect to their dashboard in [middleware.ts](frontend/middleware.ts) line 314
- Rate limiting on `POST /auth/signup` (20 req / 15 min via `signupLimiter` in [auth-routes.js](backend/src/infrastructure/routes/auth-routes.js))
- `users` table stores only `display_name` (not separate first/last columns) — DB schema already compatible with the plan's displayName-from-email approach

---

## Current state confirmed by code audit

### Frontend signup form — [signup-form.tsx](frontend/src/presentation/components/organisms/auth/signup-form.tsx)

Current fields: `firstName` (required), `lastName` (required), `email` (required), `password` (required), `confirmPassword` (required), `role` (required), `username` (optional), `phone` (optional).

After `fe-form`: keep only `email`, `password`, `confirmPassword`, `role`, `phone?`.

Validation is manual local state (not RHF+Zod) — out of scope for this plan.

Submission chain: `SignupForm` → `useAuthStore.signup` → `authApi.signup` → `POST /auth/signup` — no application use-case layer on the frontend for signup.

### Backend validation — two layers, both need updating

| Layer | File | What to change |
|---|---|---|
| Joi schema | [auth.schemas.js](backend/src/infrastructure/api/v1/schemas/auth.schemas.js) | `be-schema`: make firstName/lastName `.optional()` |
| AuthValidator | [auth-validator.js](backend/src/application/validators/auth-validator.js) | `be-validator`: mirror the same optionality — currently duplicates required-field rules |

### Backend signup use case — [signup-use-case.js](backend/src/application/use-cases/auth/signup-use-case.js)

Currently: `displayName = firstName + ' ' + lastName` (both required). After `be-signup-uc`: fall back to email local-part when names absent. Username uniqueness loop already exists — no change needed there.

### VerifyEmailUseCase — [verify-email-use-case.js](backend/src/application/use-cases/auth/verify-email-use-case.js)

Currently calls only `userRepository.updateEmailVerification`. Does **not** touch licenses. `be-verify-uc` + `be-repo-all` + `be-di` add the auto-assign step after activation.

### Known risk (no change needed now)

If `sendEmailVerification` throws after `userRepository.save`, the user row exists but is unverified with no easy recovery path other than the resend endpoint. This is a pre-existing issue — out of scope, but worth a follow-up.

---

## Flow after changes

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant BE as Backend
    participant DB as Web DB
    participant Email as Email Service

    U->>FE: Fill signup form (email, phone?, role, password)
    FE->>BE: POST /auth/signup {email, role, password, phone?}
    BE->>DB: Create user (isActive=false, emailVerified=false)
    BE->>DB: username auto-generated from email local-part
    BE->>Email: Send verification link
    BE->>FE: 201 "Check your email to activate"
    FE->>U: Redirect to /verify-email?pending=true

    U->>BE: GET /verify-email?token=JWT (clicks email link)
    BE->>DB: Set isActive=true, emailVerified=true
    BE->>DB: Find licenses in external_licenses WHERE email_license = user.email
    BE->>DB: Create license_assignments for each match (skip if already assigned)
    BE->>FE: 200 "Email verified. You can now log in."
    FE->>U: Redirect to /login

    U->>FE: Login with email+password
    FE->>BE: POST /auth/login
    BE->>FE: 200 + tokens (HttpOnly cookie)
    FE-->>FE: middleware: isAuthRoute + isAuthenticated + isActive → redirect to dashboard
```
