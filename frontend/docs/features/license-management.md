# License Management (Frontend)

> Status: Mock-backed, DataTable-only. The editable DataGrid is temporarily disabled due to DOM issues and will be reintroduced after backend persistence (Postgres) is ready and stable.

## Current Behavior
- **Data source**: Mock data seeded from `frontend/src/shared/mock/license-faker-data.ts` via an in-memory `/api/v1/licenses` endpoint.
- **UI**: Uses the `LicensesDataTable` (read-only) for listing, sorting, filtering, and pagination on the client-side dataset.
- **Editing**: Inline grid editing is disabled; CRUD actions are mocked (no real persistence).
- **Pagination/sort/filter**: Client-side only on the fetched mock list.

## Known Limitations
- No Postgres persistence; data resets on reload.
- DataGrid (Excel-like editing) is disabled to avoid DOM mutation errors (`Node.removeChild`); will return once the backend is stable.
- Bulk operations and server-side pagination are not wired.

## Planned (post-Postgres)
- Re-enable the editable DataGrid with server-backed CRUD and bulk ops.
- Server-side pagination/filter/sort aligned with `/api/v1/licenses`.
- Metrics panels driven by real license data.

## Files of Interest
- UI: `frontend/src/presentation/components/organisms/license-management/license-management.tsx`
- Mock data: `frontend/src/shared/mock/license-faker-data.ts`
- API client: `frontend/src/application/services/license-management-service.ts`
