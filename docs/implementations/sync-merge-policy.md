# Sync Merge Policy (M5)

## Goal

Prevent stale writes and accidental overwrite between:
- User edits from web app (admin/accountant/tech)
- Scheduled external sync from ABC API

## Write Conflict Policy

- All mutable license updates support optimistic concurrency using `updatedAt` (or `expectedUpdatedAt`).
- Backend compares request token with current DB row timestamp.
- If mismatch:
  - API returns `409 CONCURRENT_MODIFICATION`
  - response includes latest record details in `error.details`
- Frontend refreshes list and asks user to re-apply changes.

## Sync Precedence Policy

- Sync is still API-driven, but local user edits must not be immediately clobbered by delayed sync batches.
- If internal row `updatedAt` is newer than `lastExternalSync`, web-managed fields are preserved.

### Web-Managed Fields (preserved when internal is newer)

- `dba`, `zip`
- `status`, `plan`, `term`
- `startsAt`, `cancelDate`
- `lastPayment`
- `seatsTotal`, `seatsUsed`
- `smsPurchased`, `smsSent`
- `agents`, `agentsName`, `agentsCost`
- `notes`

### External-Managed Fields (always synced from external)

- external identifiers (`appid`, `countid`, `mid`)
- external package/workspace metadata
- sync state (`external_sync_status`, `last_external_sync`, sync errors)

## Operational Notes

- This policy avoids heavy merge logic while preventing known destructive collisions.
- For full API-first/pass-through architecture, internal licenses should be reduced to auth/assignment/cache metadata only in a later migration.
