# Role Smoke Checklist (M6)

## Setup

- Seed users: `admin`, `accountant`, `tech`, `agent`
- Dedicated smoke users:
  - `agent_smoke` / `agent.smoke@abcsalon.us` / `AgentSmoke123!`
  - `tech_smoke` / `tech.smoke@abcsalon.us` / `TechSmoke123!`
  - `account_smoke` / `account.smoke@abcsalon.us` / `AccountSmoke123!`
- Start backend + frontend and log in with each role.

## Agent

- Open licenses list and verify only assigned licenses are visible. (Server-side ownership/scoping verified)
- Open SMS tab and verify history requires assigned App ID.
- Attempt license update endpoint and confirm `403`. (Verified for restricted Agent mutation paths)

## Tech

- Open Tech tools and reset license ID by `appid` or email. (API verified; non-existent app now returns `404`)
- Apply date adjustment (activate/coming-expired) and verify success.
- Attempt delete endpoint and confirm `403`.

## Accountant

- Open Accountant controls and update status/package/dates.
- Add SMS payment and verify payment appears in history. (API verified for path and RBAC; valid-app transaction verification pending data setup)
- Run bulk update and verify role is allowed.

## Conflict Safety

- Open same license in two sessions.
- Save from session A.
- Save stale data from session B and verify `409` + refresh message.

## Feature Flags

- Disable one module with env flags:
  - Backend: `FEATURE_AGENT_MODULE=false` (or tech/accountant)
  - Frontend: `NEXT_PUBLIC_FEATURE_AGENT_MODULE=false`
- Verify role module UI hides and backend rejects with `403`.
