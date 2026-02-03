# 🚨 SECURITY NOTICE - Action Required

## Critical: Production Secrets Exposed in Git History

### What Happened

The following files containing **real production secrets** were committed and pushed to the GitHub repository:

1. `QUICK-START.md` - Contained all 18 GitHub secrets with real values
2. `API-FIX-SUMMARY.md` - Contained configuration examples with secrets
3. `OPENLITESPEED-FIX.md` - Contained deployment details
4. `.env.production` - Contained full production environment variables

### Commits Affected

- `bd9eebf` - "fix: revert to relative API paths, delete NEXT_PUBLIC_API_URL secret"
- `d40b70b` - "fix: use relative API paths in production, remove NEXT_PUBLIC_API_URL secret"
- Earlier commits from documentation consolidation

### Exposed Secrets

The following secrets were exposed in the git history:

**Critical (Must Rotate Immediately):**
- ✅ `JWT_SECRET`
- ✅ `ENCRYPTION_KEY`
- ✅ `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`
- ⚠️ `EXTERNAL_LICENSE_API_KEY` (if real key was used, not "YOUR_API_KEY" placeholder)
- ⚠️ `EMAIL_USER` / `EMAIL_PASS` (if real Mailjet keys were used)

**Informational (Not Secret):**
- `SERVER_HOST` - 155.138.245.11
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` - default values
- `EMAIL_SERVICE`, `EMAIL_HOST`, `EMAIL_PORT` - Mailjet config
- `CLIENT_URL` - public URL

---

## Immediate Actions Required

### 1. Rotate All Cryptographic Keys (Critical)

```bash
# Generate new secrets
JWT_SECRET=$(openssl rand -base64 48)
ENCRYPTION_KEY=$(openssl rand -hex 64)
NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=$(openssl rand -base64 48)

# Update GitHub secrets
gh secret set JWT_SECRET -b "$JWT_SECRET"
gh secret set ENCRYPTION_KEY -b "$ENCRYPTION_KEY"
gh secret set NEXT_SERVER_ACTIONS_ENCRYPTION_KEY -b "$NEXT_SERVER_ACTIONS_ENCRYPTION_KEY"
```

**WARNING:** This will invalidate all existing:
- JWT tokens (users will be logged out)
- Encrypted data (if any stored with old key)
- Next.js server actions

### 2. Check External API Key

If you used your **real** Mailjet API key and External License API key:

```bash
# Regenerate in Mailjet dashboard: https://app.mailjet.com/account/api_keys
# Update:
gh secret set EMAIL_USER -b "new_mailjet_api_key"
gh secret set EMAIL_PASS -b "new_mailjet_secret_key"

# Regenerate External License API key (contact provider)
gh secret set EXTERNAL_LICENSE_API_KEY -b "new_api_key"
```

### 3. Review Server Access

Since `SERVER_HOST` (155.138.245.11) is public, consider:

```bash
# Review SSH authorized_keys
ssh root@155.138.245.11 'cat ~/.ssh/authorized_keys'

# Check recent logins
ssh root@155.138.245.11 'last | head -20'

# Review firewall rules
ssh root@155.138.245.11 'firewall-cmd --list-all'
```

### 4. Redeploy with New Secrets

After rotating secrets:

```bash
git push origin develop
gh run watch  # Monitor deployment
```

All users will be logged out and need to re-authenticate.

---

## Git History Cleanup (Optional but Recommended)

### Option A: Force Delete from History (Recommended)

**WARNING:** This rewrites history and requires force push. Coordinate with team members.

```bash
# Install git-filter-repo
brew install git-filter-repo  # macOS
# OR: pip install git-filter-repo

# Remove files from entire history
cd /path/to/abc-dashboard
git filter-repo --path QUICK-START.md --invert-paths
git filter-repo --path API-FIX-SUMMARY.md --invert-paths
git filter-repo --path OPENLITESPEED-FIX.md --invert-paths
git filter-repo --path .env.production --invert-paths

# Force push (DANGER: Rewrites history)
git push origin --force --all
git push origin --force --tags
```

### Option B: Use BFG Repo-Cleaner (Alternative)

```bash
# Install BFG
brew install bfg  # macOS

# Create a mirror clone
git clone --mirror https://github.com/josephnguyen-macusaone/abc-dashboard.git

# Remove files
bfg --delete-files QUICK-START.md abc-dashboard.git
bfg --delete-files API-FIX-SUMMARY.md abc-dashboard.git
bfg --delete-files OPENLITESPEED-FIX.md abc-dashboard.git

# Push changes
cd abc-dashboard.git
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push --force
```

### Option C: Do Nothing (Not Recommended)

If this is a private repo with trusted users only, you may choose to:
1. Rotate secrets (still required)
2. Leave history as-is
3. Be more careful in future

**Note:** GitHub retains deleted branches/commits for 90 days. History is never truly erased.

---

## Prevention for Future

### 1. Create Safe Documentation Template

Create `docs/DEPLOYMENT-TEMPLATE.md` with placeholders:

```bash
gh secret set JWT_SECRET -b "<generate-with-openssl-rand>"
gh secret set ENCRYPTION_KEY -b "<generate-with-openssl-rand>"
# etc...
```

### 2. Update .gitignore

Already done:
```
.env
.env.local
.env.production
*.env
```

### 3. Pre-commit Hooks (Optional)

Install `git-secrets` to prevent commits with sensitive data:

```bash
brew install git-secrets  # macOS
git secrets --install
git secrets --register-aws  # Example patterns
```

### 4. Use Environment Variables Only

Never document actual secret values. Instead:
- Store in GitHub Secrets (already doing this)
- Reference `.env.example` with placeholders
- Document secret names, not values

---

## Current Status

✅ Files deleted from working directory:
- `QUICK-START.md`
- `API-FIX-SUMMARY.md`
- `OPENLITESPEED-FIX.md`
- `.env.production`

⚠️ Still in git history (commits bd9eebf, d40b70b, etc.)

🔄 **Next:** Rotate secrets and optionally clean history

---

## Questions?

If uncertain about any step, **stop and ask for help**. Security incidents require careful handling.

**Priority:** Rotate JWT_SECRET, ENCRYPTION_KEY, and NEXT_SERVER_ACTIONS_ENCRYPTION_KEY immediately.
