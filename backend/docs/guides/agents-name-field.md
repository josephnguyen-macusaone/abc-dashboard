# Agents Name Field (agentsName / agents_name)

## Overview

The license field **agentsName** (API/code) / **agents_name** (database) stores the names of agents associated with a license. It has been changed from an **array of strings** to a **single string** across the backend and frontend.

## Data Type

| Layer        | Field        | Type   | Example                                      |
|-------------|--------------|--------|----------------------------------------------|
| API (JSON)  | `agentsName` | string | `"Agent 1, Agent 2"` or `"John Doe"`          |
| Domain/Entity | `agentsName` | string | Same as API                                  |
| Database    | `agents_name` | JSONB  | Stored as string (e.g. `"Agent 1, Agent 2"`)  |

- **Max length:** 500 characters (enforced by API validation and Joi schemas).
- **Empty value:** Use `""` (empty string). The API accepts and returns empty string; the UI may display a placeholder such as "No Agent".

## Backend Behavior

### Validation

- **Create / update / bulk:** `agentsName` must be a string when provided. It is validated with max length 500 (see `license-validator.js` and `license.schemas.js`). Sending an array will result in a validation error.

### Repository (license-repository.js)

- **Read:** `_normalizeAgentsName(agents_name)` converts DB value to string:
  - `null`/undefined → `""`
  - String → trimmed string (if it looks like JSON array string, parsed and joined for legacy data)
  - Array (legacy JSONB array) → joined with `", "`
- **Write:** The column is JSONB and requires valid JSON. The repository stores the app string as a JSON string value: `dbData.agents_name = JSON.stringify(str)` so that e.g. `"hello"` is written as the JSON value `"hello"` (not the invalid literal `hello`).

### External Sync

- Sync and external-license code use **string** only:
  - Default/fallback: `agentsName: ''`
  - If external data has an array, it is normalized to a comma-separated string before persisting.

### Search

- `searchField=agentsName` searches the `agents_name` column with ILIKE; the column is coerced to text for search. Works the same whether the stored value is a string or legacy array in JSONB.

## Frontend Behavior

- **Types:** `agentsName` is typed as `string` (e.g. in `license-dto.ts`, `license-entity.ts`, API types).
- **Display:** The table and cell variants treat `agentsName` as a string (e.g. show as-is or "No Agent" when empty).
- **Forms / create / update:** The UI sends `agentsName` as a string (e.g. single input or comma-separated).

## Database Default

A migration (`20250205000001_agents_name_default_string.js`) sets the default for `licenses.agents_name` to JSONB empty string (`""`). New rows get this default when the column is not specified. After a full reset (drop + migrate + seed), the schema uses this default.

## Migration Notes (Array → String)

- **API:** Request/response bodies must send and expect `agentsName` as a string. Old clients that send an array will receive a validation error.
- **Database:** The column remains JSONB. Existing rows may still contain JSON arrays; the backend normalizes them to a string when reading. New and updated rows are stored as a string value in JSONB.
- **External integrations:** If any external system still sends an array, the backend sync/transform layer can normalize it to a string (e.g. join with `", "`) before save; the application layer does not accept array in the main license create/update APIs.

## Related Documentation

- [Agent Data Limitation](./agent-data-limitation.md) – agent fields are internal-only, not synced from external API
- [License Management System](./license-management-system.md) – domain model and architecture
- [Sync and Startup Analysis](../operations/sync-and-startup-analysis.md) – troubleshooting `agents_name` and seed/sync
