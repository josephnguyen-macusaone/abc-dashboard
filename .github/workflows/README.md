# CI/CD – GitHub Secrets

Deploy runs on push to `main` or `develop`.

**Note:** The IDE may show "Context access might be invalid" for custom secrets in `deploy.yml` — these are false positives; the workflow is valid.

## Required secrets (19)

| Group | Secrets |
|-------|--------|
| **Server** | `SERVER_HOST`, `SERVER_USER`, `SERVER_SSH_KEY` |
| **Database** | `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` |
| **Auth** | `JWT_SECRET`, `ENCRYPTION_KEY` |
| **External API** | `EXTERNAL_LICENSE_API_URL`, `EXTERNAL_LICENSE_API_KEY` |
| **Email** | `EMAIL_SERVICE`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_FROM`, `EMAIL_FROM_NAME`, `EMAIL_USER`, `EMAIL_PASS` |
| **App** | `CLIENT_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` |

## Setup

**See [../../QUICK-START.md](../../QUICK-START.md)** for complete setup instructions including SSH key generation and all 19 `gh secret set` commands.

Quick version:
```bash
gh auth login
# Run 19 commands from QUICK-START.md
gh secret list  # Verify
```
