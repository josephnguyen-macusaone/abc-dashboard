# Features Overview

High-level overview of main frontend features and where to read more.

## Authentication

- **Login / logout:** JWT-based; tokens in HTTP-only cookies; refresh flow.
- **Registration, email verification, password reset:** Backed by backend API; see backend docs for email config.
- **Roles:** Admin, Manager, Staff with role-based UI and API access.

**Details:** [guides/authentication-flow.md](./guides/authentication-flow.md)

## License management

- **DataTable:** Read-only list (sort, filter, paginate) – e.g. dashboard license section.
- **DataGrid:** Excel-like grid (inline edit, focus, selection, copy/paste) – License Management page.
- **Data source:** Backend `GET /api/v1/licenses` (PostgreSQL). Same filters (status, plan, term, DBA/agent search) for both views.

**Details:** [guides/license-management.md](./guides/license-management.md)

## Dashboard

- Metrics and charts; license stats, user stats (depending on role).
- Date range and filters; real-time or on-demand refresh via API.

## User management (admin)

- User CRUD, role assignment, bulk operations.
- Admin can create managers and staff; managers can create staff. Backed by backend user API.

## Tech and patterns

- **State:** Zustand (auth, theme, license list, etc.); React Hook Form for forms; React Context where needed.
- **API:** Axios client with interceptors (auth header, refresh, retry). Repositories in infrastructure call API; use cases sit in application layer.
- **Forms:** React Hook Form + Zod; validation and errors aligned with backend.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for layers and data flow.
