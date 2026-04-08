# Role Management Overview

This document describes the current role model, permission boundaries, and management rules used across backend and frontend in `abc-dashboard`.

## 1) Role Model

The system has 7 active roles:

- `admin`
- `accountant`
- `account_manager`
- `tech_manager`
- `agent_manager`
- `tech`
- `agent`

Manager roles are typed by domain:

- `account_manager` manages `accountant`
- `tech_manager` manages `tech`
- `agent_manager` manages `agent`

The manager-to-staff ownership relationship is enforced through `managed_by`.

## 2) Permission Domains

Permissions are split into two domains:

- **User-management permissions** (create/read/update/delete users, dashboard, profile)
- **License-management capabilities** (view/create/update/delete licenses and related actions)

This separation is important because a role may have broad user permissions while being read-only for licenses.

## 3) User Management Permissions

### 3.1 Effective role permissions (users)

| Role | Create User | Read User | Update User | Delete User | Manage System | View Dashboard | Manage Own Profile |
|---|---|---|---|---|---|---|---|
| `admin` | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| `accountant` | Yes | Yes | Yes | Yes | No | Yes | Yes |
| `account_manager` | Yes | Yes | Yes | Yes | No | Yes | Yes |
| `tech_manager` | Yes | Yes | Yes | Yes | No | Yes | Yes |
| `agent_manager` | Yes | Yes | Yes | Yes | No | Yes | Yes |
| `tech` | No | No | No | No | No | Yes | Yes |
| `agent` | No | No | No | No | No | Yes | Yes |

### 3.2 Who can create which role

| Creator role | Creatable roles |
|---|---|
| `admin` | `admin`, `accountant`, `account_manager`, `tech_manager`, `agent_manager`, `tech`, `agent` |
| `accountant` | `tech` |
| `account_manager` | `accountant` |
| `tech_manager` | `tech` |
| `agent_manager` | `agent` |
| `tech` | none |
| `agent` | none |

### 3.3 Delete-user constraints

Even with `delete_user`, delete operations are constrained by business rules:

- `admin` can delete anyone except other `admin`.
- `accountant` can delete non-admin users.
- Managers (`account_manager`, `tech_manager`, `agent_manager`) can delete only:
  - direct reports (`targetUser.managedBy === deleter.id`), and
  - only the manager's owned staff role:
    - account manager -> accountant
    - tech manager -> tech
    - agent manager -> agent
- No one can delete themselves.

## 4) License Management Capabilities

### 4.1 Current policy

Managers are now **read-only for licenses**.

- They can view all licenses (`canViewLicenses: true`, `canViewOwnLicensesOnly: false`).
- They cannot create, update, delete, sync, monitor, reset IDs, or perform SMS payment actions.

### 4.2 Effective role capabilities (licenses)

| Role | View Licenses | Scope | Create | Update | Delete | Bulk | Reset ID | SMS Add/View |
|---|---|---|---|---|---|---|---|---|
| `admin` | Yes | All | Yes | Yes | Yes | Yes | Yes | Yes / Yes |
| `accountant` | Yes | All | Yes | Yes | No | No | No | Yes / Yes |
| `account_manager` | Yes | All | No | No | No | No | No | No / No |
| `tech_manager` | Yes | All | No | No | No | No | No | No / No |
| `agent_manager` | Yes | All | No | No | No | No | No | No / No |
| `tech` | Yes | All | Yes | Yes | No | No | Yes | No / Yes |
| `agent` | Yes | Own-focused behavior in APIs/UI | No | No (except own-update paths) | No | No | No | Yes / Yes |

Notes:

- In backend middleware, manager roles only carry `license:read`.
- In frontend capabilities, all manager write flags are disabled.

## 5) Dashboard and Route Access

### 5.1 Dashboard routing

- `admin`, `account_manager`, `tech_manager`, `agent_manager` -> `/dashboard/admin`
- `accountant` -> `/dashboard/accountant`
- `tech` -> `/dashboard/tech`
- `agent` -> `/dashboard/agent`

### 5.2 Main protected route access

- `/users`: `admin`, `accountant`, all manager roles
- `/licenses`: `admin`, `accountant`, all manager roles, `tech`
- `agent` does not get direct `/licenses` navigation link by default, but still has role-specific license-related flows.

## 6) Navigation Behavior

Navigation is permission-driven:

- Roles with `manage_system` (`admin`) get Dashboard + License Management + User Management.
- Roles with `read_user` (accountant + manager roles) also get Dashboard + License Management + User Management.
- License-only roles without user-read get Dashboard + License Management (except agent link handling).

Because managers still have `/licenses` access, the page is visible, but actions are disabled by capabilities.

## 7) Management Ownership Rules (`managed_by`)

`managed_by` is central to manager authority.

- Manager update/delete authority over users depends on ownership and managed role type.
- A manager can only operate on users that:
  - are directly assigned to that manager, and
  - match the staff role that manager owns.

This prevents cross-domain manager actions (for example, an `agent_manager` acting on `tech` users).

## 8) Design Intent (Current State)

Current implementation supports the following intent:

- Managers are people managers with user-management capability.
- Managers have license visibility for overview and operational context.
- Managers are read-only on license modification paths.
- Agent manager can view all licenses while managing agent users.

## 9) Source of Truth Files

Primary files controlling this behavior:

- Backend role + user permissions:
  - `backend/src/shared/constants/roles.js`
- Backend license capabilities:
  - `backend/src/shared/constants/license-capabilities.js`
- Backend license permission middleware:
  - `backend/src/infrastructure/middleware/license-access-control-middleware.js`
  - `backend/src/infrastructure/middleware/license-management.middleware.js`
- Backend delete-user business rules:
  - `backend/src/application/use-cases/users/delete-user-use-case.js`
- Frontend role + permission maps:
  - `frontend/src/shared/constants/auth/permissions.ts`
  - `frontend/src/shared/constants/auth/permission-utils.ts`
- Frontend license capability maps:
  - `frontend/src/shared/constants/license/capabilities.ts`
- Frontend route + nav visibility:
  - `frontend/src/shared/constants/routes.ts`
  - `frontend/src/shared/constants/navigation.ts`

## 10) Recommendations (Optional Next Step)

If you want this to remain clear for future contributors:

- Keep this document updated whenever role constants/capabilities change.
- Add tests for manager delete constraints (`managed_by` + expected staff role).
- Add tests that managers cannot perform license write operations while retaining list/read access.
