# Role Smoke Checklist (M6)

## Setup

- Seed users: `admin`, `accountant`, `tech`, `agent`
- Start backend + frontend and log in with each role.

## Agent

- Open licenses list and verify only assigned licenses are visible.
- Open SMS tab and verify history requires assigned App ID.
- Attempt license update endpoint and confirm `403`.

## Tech

- Open Tech tools and reset license ID by `appid` or email.
- Apply date adjustment (activate/coming-expired) and verify success.
- Attempt delete endpoint and confirm `403`.

## Accountant

- Open Accountant controls and update status/package/dates.
- Add SMS payment and verify payment appears in history.
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
