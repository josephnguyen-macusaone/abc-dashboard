# License Management (backend)

> Status: mock-only. Current `/api/v1/licenses` responses come from an in-memory store (seeded); PostgreSQL persistence is not yet wired. Frontend presently uses DataTable only while grid editing is disabled.

## Scope

- Manage software licenses and assignments to customers (or internal org units).
- Track lifecycle: issued → active → expiring → expired → revoked.
- Provide dashboards for counts, status breakdowns, upcoming expirations, and assignment coverage.

## Domain Model (proposed)

- **License**
  - `id` (uuid, pk)
  - `key` (string, unique)
  - `product` (string)
  - `plan` (string)
  - `status` (enum: draft | active | expiring | expired | revoked)
  - `seatsTotal` (int)
  - `seatsUsed` (int, derived from assignments)
  - `startsAt` (timestamptz)
  - `expiresAt` (timestamptz, nullable)
  - `notes` (text)
  - `createdAt` / `updatedAt`
- **LicenseAssignment**
  - `id` (uuid, pk)
  - `licenseId` (fk → licenses.id)
  - `userId` (fk → users.id)
  - `status` (enum: assigned | unassigned | revoked)
  - `assignedAt` / `revokedAt`
- **AuditEvent**
  - `id` (uuid, pk)
  - `type` (string, e.g., license.created, license.revoked, assignment.created)
  - `actorId` (fk → users.id)
  - `entityId` (licenseId or assignmentId)
  - `metadata` (jsonb)
  - `createdAt`

### Derived metrics

- Utilization: `seatsUsed / seatsTotal`
- Expiration windows: `expiresAt` in next 7/30/90 days
- Assignment coverage per product/plan

## API Surface (planned)

- `GET /api/v1/licenses` — list/filter by status, product, expiration window; paginate/sort.
- `POST /api/v1/licenses` — create license; validate uniqueness of `key`.
- `GET /api/v1/licenses/:id` — details with assignments and audit trail.
- `PATCH /api/v1/licenses/:id` — update status, notes, seats, dates.
- `DELETE /api/v1/licenses/:id` — revoke/archive (soft delete recommended).
- `POST /api/v1/licenses/:id/assignments` — assign user(s); enforce seat limits.
- `PATCH /api/v1/licenses/:id/assignments/:assignmentId` — revoke/unassign.
- `GET /api/v1/licenses/:id/metrics` — utilization, upcoming expiration flags.
- `GET /api/v1/licenses/metrics/summary` — totals by status/product, expiring soon.

## Permissions (align with existing RBAC)

- **Admin**: full CRUD on licenses and assignments; can view all metrics.
- **Manager**: view licenses; assign/revoke within their managed users; cannot change seat totals or delete licenses.
- **Staff**: view own assignments only.

## Validation & Rules

- `seatsUsed` must not exceed `seatsTotal`.
- `expiresAt` may be null (no expiry); if provided, must be after `startsAt`.
- Prevent duplicate `key`.
- When revoking a license, revoke active assignments or mark as invalid.
- Assignment creation must ensure the target user exists and is active.

## Data Persistence (PostgreSQL)

Example migrations (Knex-style):

```sql
CREATE TABLE licenses (
  id uuid PRIMARY KEY,
  key text UNIQUE NOT NULL,
  product text NOT NULL,
  plan text NOT NULL,
  status text NOT NULL CHECK (status IN ('draft','active','expiring','expired','revoked')),
  seats_total integer NOT NULL CHECK (seats_total > 0),
  seats_used integer NOT NULL DEFAULT 0 CHECK (seats_used >= 0),
  starts_at timestamptz NOT NULL,
  expires_at timestamptz NULL,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE license_assignments (
  id uuid PRIMARY KEY,
  license_id uuid NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('assigned','unassigned','revoked')),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz NULL,
  UNIQUE (license_id, user_id)
);

CREATE TABLE license_audit_events (
  id uuid PRIMARY KEY,
  type text NOT NULL,
  actor_id uuid NULL REFERENCES users(id),
  entity_id uuid NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

## Eventing & Notifications (future)

- Emit audit events for create/update/revoke/assign/unassign.
- Optional webhook or email alerts for expiring soon and over-utilization.
- Consider background job to flag `expiring` when `expiresAt` is within N days.

## Monitoring & Metrics

- Dashboard tiles: total licenses, active, expiring (≤30d), expired, utilization %.
- Alerts: utilization > 90%, expired > 0, expiring soon > threshold.

## Open Items

- Decide on key format (UUID vs human-friendly string).
- Clarify product/plan taxonomy source of truth.
- Define import/export format (CSV/JSON) if needed.
- Align with frontend data contracts once backend DTOs are finalized.
