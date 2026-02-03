# Redundant Files Cleanup (Done)

## Summary

Removed obsolete build/deploy artifacts. Current flow: **CI/CD (GitHub Actions)** or **scripts/build-and-save.sh + scripts/load-and-run.sh** for manual deploy.

---

## 1. Remove `build.sh` (root)

**Why redundant:**
- **build.sh**: Low-memory server build script (sequential, 1GB RAM). Current flow builds in **GitHub Actions** or locally via **scripts/build-and-save.sh**, then transfers images; we no longer build on the low-resource server.
- **README** mentions `build-optimized.sh` (file does not exist); intent is “optimized build” — use `docker compose build` + BuildKit instead.

**Action:** Delete `build.sh`. Update README and `.cursor/rules/project-overview.mdc` to use `docker compose` and `scripts/` (see below).

---

## 2. Remove `deploy/` folder

**Contents:** `deploy/deploy.sh` — OpenLiteSpeed deployment (copies project to `/var/www`, configures OLS vhost, static frontend + Docker backend).

**Why redundant:**
- Current stack is **Docker Compose only** (frontend + backend in containers). No OpenLiteSpeed.
- Deploy is done by **CI/CD** (push to develop/main) or **scripts/load-and-run.sh** on the server.
- No references to `deploy/` or `deploy.sh` in the codebase.

**Action:** Delete `deploy/deploy.sh` and remove the `deploy/` directory.

---

## 3. Update README.md

**Current:** References non-existent `build-optimized.sh` and “2 Minutes to Running” with that script.

**Change:**
- Quick start: use `docker compose up -d` (and optional `docker compose build`) at repo root; point to **QUICK-START.md** for production deploy.
- Remove all mentions of `build-optimized.sh`. For “optimized” local builds, use BuildKit + `docker compose build` (and optionally `scripts/build-and-save.sh` for manual deploy).

---

## 4. Update `.cursor/rules/project-overview.mdc`

**Current:** “build.sh – Docker build (sequential, low-memory); use ./build.sh [frontend|backend|all] [--no-cache]”.

**Change:**
- Remove the `build.sh` line.
- Add: **scripts/** – `build-and-save.sh` (local build for manual deploy), `load-and-run.sh` (on server), `docker-db-reset-sync.sh` (DB utility).
- Add: **Deploy:** CI/CD on push to main/develop, or see QUICK-START.md.

---

## 5. QUICK-START.md and workspace

- **QUICK-START.md:** Already correct — CI/CD, one-time setup, manual fallback via `scripts/build-and-save.sh` and `scripts/load-and-run.sh`. No reference to `build.sh` or `deploy/`.
- **abc-dashboard.code-workspace:** No reference to build.sh or deploy. No change needed.

---

## 6. Files to delete

| Item           | Reason                                      |
|----------------|---------------------------------------------|
| `build.sh`     | Replaced by CI/CD + scripts/build-and-save.sh |
| `deploy/deploy.sh` | OpenLiteSpeed stack; current stack is Docker Compose only |
| `deploy/`      | Empty after removing deploy.sh              |

---

## 7. Post-cleanup root layout

```
abc-dashboard/
├── README.md
├── QUICK-START.md
├── docker-compose.yml
├── scripts/
│   ├── build-and-save.sh   # Manual build for deploy
│   ├── load-and-run.sh     # On server: load images, compose up
│   ├── docker-db-reset-sync.sh
│   └── README.md
├── .github/workflows/
│   ├── deploy.yml
│   └── README.md
├── docs/
│   └── README.md
├── backend/
├── frontend/
└── abc-dashboard.code-workspace
```

No `build.sh`, no `deploy/`.
