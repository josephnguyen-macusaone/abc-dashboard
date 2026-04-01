## Project: License & SMS Management System (Web Integration)

### 1. System Architecture & Data Flow

Based on the final confirmation (March 28), the technical approach is as follows:

- **Web Database:** Minimalist role. Used strictly for **User Management** (Signup, Login, Logout) and **Audit Logs** (`createdBy`, `updatedBy`, `timestamps`).
- **API Integration:** All functional data (Licenses, SMS Balance, Payments) is fetched and pushed directly via the **ABC API** (`mapi.abcsalon.us`).
- **Sync Policy:** No heavy data synchronization. The Web platform acts as a functional UI layer for the ABC database to prevent data bloat and overwriting conflicts.

---

### 2. Role-Based Access Control (RBAC)

All users will have their own independent signup/login portals.

#### **A. Agent Role (High Priority)**

- **Focus:** Read-only monitoring of their own assets.
- **Capabilities:**
  - View all licenses assigned under their account (Read-only).
  - Monitor SMS balance (Real-time tracking for card charging/refilling).
  - View SMS payment history.
- **API Status:** Fully available; development can begin immediately.

#### **B. Tech Role**

- **Focus:** Technical license adjustments and provisioning.
- **Capabilities:**
  - Submit new licenses.
  - Reset License IDs.
  - Adjust "Coming-Expired" dates.
  - Adjust Activation dates.
- **Logging:** Every action must record `createdBy` and `updatedBy` to the Web DB for audit tracking.

#### **C. Accountant Role**

- **Focus:** Financial adjustments and license lifecycle management.
- **Capabilities:**
  - View licenses.
  - Adjust "Coming-Expired" dates.
  - Deactivate/Activate licenses.
  - Add new licenses and SMS balances.
  - Adjust package types.
- **Logging:** Full audit trail required.

---

### 3. Unified Web UX + Enforcement Contract

- **Single UI flow:** `/licenses` always renders the same `LicenseManagement` screen for all roles.
- **No split dashboard UI by role:** role differences are enforced by capability toggles and server responses, not by switching between separate license pages.
- **Source of truth for access:** backend scoping and permission checks are authoritative even if frontend checks are bypassed.
- **Agent data isolation:** agent sees only assigned licenses and only scoped analytics/stats.
- **Mutation safety:** disallowed mutations remain hidden/disabled in the UI and are denied server-side.

---

### 4. Endpoint-by-Role Checklist (Regression Guard)

- `GET /api/v1/external-licenses`
  - `admin/manager/accountant/tech`: full role-allowed dataset.
  - `agent`: assigned licenses only (server scoped).
- `GET /api/v1/external-licenses/:id|appid/:appid|email/:email|countid/:countid`
  - `agent`: allowed only when license is assigned; otherwise forbidden.
- `GET /api/v1/external-licenses/stats|expired|expiring|organization/:dba|license-analytic`
  - `agent`: scoped to assigned licenses only.
- `GET /api/v1/licenses` and `GET /api/v1/licenses/dashboard/metrics`
  - `agent`: forced `assignedUserId` scoping in backend controller.
- `POST /api/v1/external-licenses/add-sms-payment` and `GET /api/v1/external-licenses/sms-payments`
  - `agent`: requires assigned license scope via `appid` or `countid`.

---

### 5. Verification of Requirements

- **Priority:** **High.** Working alongside the ABC Order PMS project.
- **Resource Allocation:** **40%** of time dedicated to this system.
- **Dashboard Approach:** Per your note, you will utilize the existing dashboard and license management screens by applying **conditional visibility/permissions** rather than building entirely new UI screens for each role.
- **Audit Logic:** Even though the source of truth is the API, the Web DB will maintain a side-log of "Who did what" (Audit Dashboard) to ensure accountability.

---
