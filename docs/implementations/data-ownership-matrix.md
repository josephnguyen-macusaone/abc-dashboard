# Data ownership matrix (web vs ABC via external API)

**Purpose:** One contract for *where data lives*, *who may read/write it*, and *what counts as source of truth* — aligned with product direction: Agents, Techs, and Accountants work **API-first**; the web database must not carry heavy license/SMS replication.

**Systems**

| System | What it is | Reference |
|--------|------------|-----------|
| **Web DB** | PostgreSQL backing this dashboard (users, sessions, lightweight app metadata, audit events) | `backend/` migrations, Knex |
| **External API** | License Management API (gateway to ABC-side data; other teams own ABC persistence) | `https://mapi.abcsalon.us:2342` |
| **Consolidation** | Our **backend service layer** merges external responses with mappings / extra fields for the UI — **not** a mandate to mirror full license rows into Web DB | Application code |

---

## Golden rules

1. **Web DB owns:** signup, login, logout, identity, roles (for dashboard users), and **non-business** artifacts (e.g. audit rows, optional assignment links if product requires them).
2. **External API owns:** license records, SMS balance/payments as exposed by that API, and fields persisted in ABC by the API team.
3. **Agents / Techs / Accountants:** **Read and write business data through our backend → External API** where permitted by RBAC. Avoid scheduled **full** sync of license/SMS into Web DB for these roles (keeps Web DB light).
4. **Admin / Manager (legacy / full dashboard):** May still use internal license tables and flows as implemented today until explicitly migrated; treat as **exception** to API-only rule.
5. **Audit:** Prefer **dashboard audit tables / structured logs** for “who did what” on mutations that go through our API. Row-level audit for **bulk** external updates should be explicit (see backend: bulk path may log without per-license audit rows unless extended).

---

## Entity matrix

| Entity / concern | Primary read (Agents, Tech, Accountant) | Primary write (Agents, Tech, Accountant) | Web DB may store | Notes |
|------------------|----------------------------------------|------------------------------------------|-------------------|--------|
| User account (email, password hash, role, profile) | Web DB | Web DB (signup/profile) | Yes — full row | Auth is always Web DB. |
| Session / refresh tokens | Web DB (+ cookies policy) | Web DB | Yes | As implemented. |
| License list/detail (operational) | External API | External API (per RBAC) | No full copy for API-first roles | UI consolidates in memory / response DTO. Optional: cache with TTL — not a “source of truth”. |
| SMS balance / SMS payments | External API | External API where role allows | No full history mirror | Use API list/add endpoints as product defines. |
| Assignments (user ↔ license) | Product-specific | Product-specific | **If** product requires: minimal link table only | Do not duplicate entire license payload. |
| Audit (who/when/what) | Web DB (audit events) + app logs | Web DB / logs on our mutations | Yes — audit rows + correlation in logs | Ensure bulk flows match compliance needs. |
| Dashboard metrics built from internal DB | N/A for pure API-first roles | N/A | Internal aggregates may reflect Admin/Manager scope | Clarify when metrics mix internal + external. |

---

## Role × capability (business data)

High-level only; detailed flags live in code (`license-capabilities` FE/BE).

| Role | External API: view licenses | External API: mutate license/SMS | Web DB: business license mirror |
|------|-----------------------------|-----------------------------------|--------------------------------|
| **Agent** | Yes (typically scoped) | Read-only license; SMS top-up/history per product | No |
| **Tech** | Yes | Yes — limited fields (e.g. dates, reset id) | No |
| **Accountant** | Yes | Yes — broader fields (status, package, SMS add, etc.) | No |
| **Admin / Manager** | Yes + internal routes as allowed | Yes + internal flows as implemented | **May** (legacy) — document when deprecating |

---

## Glossary (disambiguate “sync”)

| Term | Meaning here |
|------|----------------|
| **Sync** | Leader directive: **do not** run heavy **bidirectional replication** of license/SMS into Web DB for API-first roles. |
| **Consolidate** | At **request time**, merge external payload + our transformations for display or downstream writes **back to External API**. |
| **Mirror** | Persisting full external rows in Web DB — **avoid** for Agent/Tech/Accountant unless an approved exception. |

---

## Change control

- Any new feature that writes license/SMS data must state: **target system (Web DB vs External API)** and **audience roles**.
- If Web DB storage is added for API-first roles, it requires **explicit sign-off** (performance + ownership + conflict resolution).

---

*Last updated: March 31, 2026 — aligns with stakeholder message on API-first flow for Agents, Techs, Accountants.*
