# License and SMS Management - Implementation Task Board

## Scope

This board implements `requirements.md` using the current monorepo architecture and the following alignment decision:

- Keep existing roles (`admin`, `manager`, `staff`)
- Add new roles (`agent`, `tech`, `accountant`)
- Migrate incrementally with backward compatibility

## Delivery Strategy

- Priority 1: Agent module (read assigned licenses, SMS balance, SMS top-up, SMS payment history)
- In parallel: foundation work (auth, role expansion, audit, RBAC policy)
- Then: Tech and Accountant modules
- Final: sync conflict controls and hardening

## Execution Progress

- [x] M0-01 - Role enum/constants expansion (backend + frontend)
- [x] M0-02 - Central role capability matrix baseline
- [x] M0-03 - Route/navigation policy updates for new roles
- [x] M1-02 - RBAC middleware alignment
- [x] M1-01 - Multi-role signup support
- [x] M1-03 - Audit logging contract for Tech and critical writes
- [x] M2-01 - Assigned-license access enforcement
- [x] M2-02 - Agent license dashboard (read-only)
- [x] M2-03 - SMS balance and card charge flow
- [x] M2-04 - SMS payment history for Agent
- [x] M3-01 - Tech license submission flow
- [x] M3-02 - Tech reset license ID flow
- [x] M3-03 - Tech date adjustment flow
- [x] M4-01 - Accountant activation/deactivation controls
- [x] M4-02 - Accountant package/date adjustment tools
- [x] M4-03 - Accountant manual SMS top-up

## Milestones

- M0: Role expansion and policy foundation
- M1: Auth and onboarding foundation
- M2: Agent module (priority)
- M3: Tech module
- M4: Accountant module
- M5: Conflict resolution and data integrity
- M6: QA, rollout, and observability

---

## M0 - Role Expansion and Policy Foundation

### Ticket M0-01 - Add new roles without replacing existing roles
- Type: Backend
- Goal: Extend role model to include `agent`, `tech`, `accountant`.
- Tasks:
  - Add migration to update DB enum/type for `users.role`.
  - Keep existing roles valid for backward compatibility.
  - Update role constants and permission map in backend and frontend.
- Acceptance criteria:
  - Existing users keep current roles and can still log in.
  - New users can be created with new roles.
  - No endpoint breaks due to unknown role values.
- Dependencies: None
- Estimate: M

### Ticket M0-02 - Define role capability matrix in code
- Type: Backend + Frontend
- Goal: Codify allowed actions per role, including legacy and new roles.
- Tasks:
  - Implement centralized role-action matrix.
  - Add helpers for `canCreate`, `canUpdate`, `canSync`, `canViewAssignedOnly`.
  - Ensure route/middleware and UI guards consume the same matrix.
- Acceptance criteria:
  - One source of truth controls both API and UI permissions.
  - Legacy roles and new roles are both handled.
- Dependencies: M0-01
- Estimate: M

### Ticket M0-03 - Navigation and route policy for new roles
- Type: Frontend
- Goal: Expose role-appropriate pages and hide unauthorized routes.
- Tasks:
  - Update route constants and navigation generator.
  - Add default redirects for new roles.
  - Preserve current behavior for legacy roles.
- Acceptance criteria:
  - `agent`, `tech`, `accountant` receive correct sidebar items and redirects.
  - Unauthorized routes are blocked client-side and server-side.
- Dependencies: M0-02
- Estimate: S

---

## M1 - Auth and Onboarding Foundation

### Ticket M1-01 - Multi-role signup support
- Type: Backend + Frontend
- Goal: Add signup flows for Agent, Tech, and Accountant.
- Tasks:
  - Add auth signup endpoint(s) and validation schema.
  - Create signup UI flow(s) with role selection restrictions.
  - Ensure role assignment follows policy matrix (no privilege escalation).
- Acceptance criteria:
  - Users can sign up using supported new roles.
  - Invalid role assignments are rejected with clear errors.
- Dependencies: M0-01, M0-02
- Estimate: M

### Ticket M1-02 - RBAC middleware alignment
- Type: Backend
- Goal: Ensure all relevant routes enforce updated role permissions.
- Tasks:
  - Update auth, license, external-license, and user-management middleware.
  - Add explicit role checks for new responsibilities in requirements.
- Acceptance criteria:
  - Protected endpoints return 403 when role is not allowed.
  - Allowed roles can execute expected operations.
- Dependencies: M0-02
- Estimate: M

### Ticket M1-03 - Audit logging contract for Tech and critical writes
- Type: Backend
- Goal: Guarantee audit trail fields for required operations.
- Tasks:
  - Implement or extend audit logging to capture:
    - `createdBy`
    - `updatedBy`
    - timestamp
    - action metadata
  - Ensure Tech operations always produce audit records.
- Acceptance criteria:
  - Write operations from Tech generate complete audit entries.
  - Audit records are queryable by actor and entity.
- Dependencies: M0-02
- Estimate: M

---

## M2 - Agent Module (Priority)

### Ticket M2-01 - Assigned-license access enforcement
- Type: Backend
- Goal: Agents only see licenses assigned to them.
- Tasks:
  - Update query layer to apply assignment-based filters for agent role.
  - Reuse `license_assignments` where possible.
  - Add tests for assignment scoping.
- Acceptance criteria:
  - Agent cannot list/read licenses outside assignment.
  - Admin/manager/tech/accountant behavior remains consistent with policy.
- Dependencies: M1-02
- Estimate: M

### Ticket M2-02 - Agent license dashboard (read-only)
- Type: Frontend
- Goal: Agent-focused UI for assigned licenses.
- Tasks:
  - Create agent dashboard page/section.
  - Display assigned licenses with read-only interactions.
  - Keep table/search responsive with existing store patterns.
- Acceptance criteria:
  - Agent sees only assigned licenses in UI.
  - Edit actions are hidden/disabled for agent.
- Dependencies: M2-01, M0-03
- Estimate: M

### Ticket M2-03 - SMS balance and card charge flow
- Type: Frontend + Backend
- Goal: Enable `add_sms_payment` workflow for Agent role.
- Tasks:
  - Ensure route permissions allow agent where required.
  - Build payment form + success/error feedback.
  - Refresh balances after successful payment.
- Acceptance criteria:
  - Agent can submit SMS payment and see updated balance.
  - Errors are surfaced clearly and safely.
- Dependencies: M1-02
- Estimate: M

### Ticket M2-04 - SMS payment history for Agent
- Type: Frontend + Backend
- Goal: Surface `get_sms_payments` transaction logs.
- Tasks:
  - Add payment history table with filters/pagination.
  - Limit visibility based on role and assignment rules.
- Acceptance criteria:
  - Agent can view relevant SMS payment history.
  - Unauthorized history is not exposed.
- Dependencies: M2-01, M2-03
- Estimate: S

---

## M3 - Tech Module

### Ticket M3-01 - Tech license submission flow
- Type: Frontend + Backend
- Goal: Tech can submit new licenses.
- Tasks:
  - Create tech form and validation.
  - Map to existing/create endpoints with role checks.
  - Emit audit records for create action.
- Acceptance criteria:
  - Tech can submit valid licenses.
  - Invalid payloads are rejected with actionable messages.
- Dependencies: M1-02, M1-03
- Estimate: M

### Ticket M3-02 - Tech reset license ID flow
- Type: Frontend + Backend
- Goal: Tech can reset license ID via existing reset endpoint.
- Tasks:
  - Add UI action and confirmation dialog.
  - Authorize tech role in route guards.
  - Audit reset operations.
- Acceptance criteria:
  - Tech can reset ID successfully.
  - Operation is logged with actor and timestamp.
- Dependencies: M1-02, M1-03
- Estimate: S

### Ticket M3-03 - Tech date adjustment flow
- Type: Frontend + Backend
- Goal: Tech can adjust activate and coming-expired dates.
- Tasks:
  - Add edit controls for date fields.
  - Validate date semantics and write rules.
  - Audit each adjustment.
- Acceptance criteria:
  - Tech can update allowed date fields.
  - Invalid or conflicting updates are blocked.
- Dependencies: M1-02, M1-03
- Estimate: M

---

## M4 - Accountant Module

### Ticket M4-01 - Accountant activation/deactivation controls
- Type: Frontend + Backend
- Goal: Accountant can activate/deactivate licenses.
- Tasks:
  - Add status toggle actions.
  - Apply accountant permission checks.
  - Add confirmation and audit trail.
- Acceptance criteria:
  - Accountant can toggle status according to policy.
  - Every status change is auditable.
- Dependencies: M1-02, M1-03
- Estimate: S

### Ticket M4-02 - Accountant package/date adjustment tools
- Type: Frontend + Backend
- Goal: Accountant can adjust plan/package and relevant dates.
- Tasks:
  - Add controlled edit forms/actions.
  - Validate transitions and data invariants.
  - Apply conflict-safe update strategy (see M5).
- Acceptance criteria:
  - Adjustments are successful and validated.
  - Invalid transitions are blocked with clear errors.
- Dependencies: M1-02
- Estimate: M

### Ticket M4-03 - Accountant manual SMS top-up
- Type: Frontend + Backend
- Goal: Accountant can add SMS balance via manual top-up.
- Tasks:
  - Reuse/add payment endpoint integration in accountant UI.
  - Add history linkage and audit metadata.
- Acceptance criteria:
  - Accountant can top up SMS and verify transaction record.
- Dependencies: M2-03, M2-04
- Estimate: S

---

## M5 - Conflict Resolution and Data Integrity

Progress update: Completed

### Ticket M5-01 - Optimistic concurrency for mutable license writes
- Type: Backend
- Goal: Prevent overwriting newer data with stale web state.
- Tasks:
  - Add version check (`updated_at` or version field) to update endpoints.
  - Return `409 Conflict` with latest record when stale write detected.
- Acceptance criteria:
  - Stale updates fail safely with conflict response.
  - No silent overwrite of newer data.
- Dependencies: M3, M4
- Estimate: M

### Ticket M5-02 - Sync precedence and merge policy
- Type: Backend
- Goal: Define field-level source-of-truth behavior during sync.
- Tasks:
  - Document and implement merge rules:
    - external-owned fields
    - web-owned fields
    - conflict/audit handling
  - Update sync use-case and repository paths accordingly.
- Acceptance criteria:
  - Sync does not overwrite protected newer web changes unexpectedly.
  - Conflict events are traceable in logs/audit.
- Dependencies: M5-01
- Estimate: M

### Ticket M5-03 - Conflict UX feedback in frontend
- Type: Frontend
- Goal: User-friendly handling of 409 conflicts.
- Tasks:
  - Detect conflict responses in store/service layer.
  - Show actionable message and refresh stale rows.
- Acceptance criteria:
  - Users understand why save failed and can recover quickly.
- Dependencies: M5-01
- Estimate: S

---

## M6 - QA, Rollout, and Observability

Progress update: Completed

### Ticket M6-01 - Test matrix for legacy + new roles
- Type: Backend + Frontend
- Goal: Ensure both role sets remain functional during migration.
- Tasks:
  - Add RBAC tests for old and new roles.
  - Add integration tests for Agent/Tech/Accountant key flows.
- Acceptance criteria:
  - CI passes with role coverage on critical endpoints/pages.
- Dependencies: M0-M5
- Estimate: M

### Ticket M6-02 - Seed data and smoke scenarios
- Type: Backend
- Goal: Fast verification in dev/staging.
- Tasks:
  - Add seed users for new roles and sample assignments.
  - Add smoke script/checklist for end-to-end verification.
- Acceptance criteria:
  - Team can verify full role journeys in < 30 minutes.
- Dependencies: M2-M4
- Estimate: S

### Ticket M6-03 - Progressive rollout controls
- Type: Backend + Frontend
- Goal: Reduce risk during release.
- Tasks:
  - Add feature flags by module (Agent, Tech, Accountant).
  - Roll out module-by-module with monitoring.
- Acceptance criteria:
  - Modules can be enabled independently.
  - Rollback path exists without schema rollback.
- Dependencies: M2-M4
- Estimate: S

---

## Suggested Execution Order (ASAP)

1. M0-01, M0-02, M1-02 (RBAC foundation)
2. M1-01, M1-03 (signup + audit)
3. M2-01, M2-02, M2-03, M2-04 (Agent priority)
4. M3 group (Tech)
5. M4 group (Accountant)
6. M5 group (conflict/data integrity)
7. M6 group (test + rollout)

## Notes for Implementation

- Keep backend as proxy for external ABC APIs to avoid exposing API keys and to preserve audit/RBAC consistency.
- During migration period, support both role families in authorization checks.
- Favor additive schema changes and backward-compatible defaults to avoid operational disruption.
- Interface typing standard for backend use-cases/services: see `docs/implementations/backend-interface-contracts.md`.
