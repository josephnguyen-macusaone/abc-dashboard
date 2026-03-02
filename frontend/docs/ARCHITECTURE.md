# Frontend Architecture

The ABC Dashboard frontend is a Next.js 16 app following **Clean Architecture**: four layers with dependencies pointing inward. Backend is Node/Express with **PostgreSQL** (not MongoDB).

## Layers

- **Domain** (`src/domain/`): Entities (User, License, etc.), repository interfaces, domain services. No framework or UI dependencies.
- **Application** (`src/application/`): Use cases, application services, DTOs, validators. Orchestrates domain and repositories.
- **Infrastructure** (`src/infrastructure/`): Repository implementations, API client (Axios), Zustand stores, cookie/localStorage. Implements interfaces defined in domain/application.
- **Presentation** (`src/presentation/`): React components, hooks, pages. Thin UI layer that calls application services and hooks.

**Shared** (`src/shared/`): Types, constants, utilities, DI container.

## Data flow

```
User → Presentation (components/hooks) → Application (use cases) → Domain (entities / repo interfaces)
                                                                         ↓
External API / storage ← Infrastructure (repos, API client, stores)
```

## Project structure

```
src/
├── app/              # Next.js App Router (routes, layout, providers)
├── domain/           # Entities, repository interfaces, domain services
├── application/      # Use cases, DTOs, application services, validators
├── infrastructure/   # Repositories, API client, Zustand stores
├── presentation/    # components/, hooks/, pages; Atomic Design
└── shared/          # Types, constants, utils, DI
```

## Patterns

- **Dependency inversion:** Domain defines repository interfaces; infrastructure implements them. Use cases depend on interfaces, not concrete classes.
- **Repository pattern:** Data access behind interfaces (e.g. `IAuthRepository`, `ILicenseRepository`). API client and stores live in infrastructure.
- **Dependency injection:** Container wires use cases and repositories; presentation uses hooks that resolve from container.
- **Observer pattern:** Zustand stores for global state; React Context for UI tree state; React Hook Form for form state.

## Component hierarchy (Atomic Design)

- **Templates:** Page layouts (e.g. AuthTemplate, DashboardTemplate).
- **Pages:** Route-level components (LoginPage, LicenseManagementPage).
- **Organisms:** Complex UI (LoginForm, Sidebar, LicensesDataGrid).
- **Molecules:** Composite components (FormField, StatsCard, SearchBar).
- **Atoms:** Primitives (Button, Input, Card) – including Shadcn UI.

Components live under `presentation/components/` (atoms, molecules, organisms, pages, templates).

## Tech stack

- **Framework:** Next.js 16 (App Router), React 19
- **Language:** TypeScript (strict)
- **Styling:** Tailwind CSS v4, Shadcn UI
- **State:** Zustand (global), React Context (UI), React Hook Form (forms)
- **Validation:** Zod
- **API:** Axios (interceptors, token refresh, retry)

## Related

- [SETUP.md](./SETUP.md) – Run and test
- [DEPLOYMENT.md](./DEPLOYMENT.md) – Deploy and env
- [guides/license-management.md](./guides/license-management.md) – License UI (DataTable vs DataGrid)
