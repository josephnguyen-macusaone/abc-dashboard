# GitHub Actions Linter Warnings - Fix Plan

## Problem

VS Code GitHub Actions extension shows "Context access might be invalid" for all custom repo secrets (POSTGRES_DB, JWT_SECRET, SERVER_HOST, etc.) in `deploy.yml`. These are **false positives** — the workflow is valid and runs correctly.

**Why it happens:** The extension only knows about built-in secrets (e.g. `GITHUB_TOKEN`). It doesn't know about repository secrets added in **Settings → Secrets and variables → Actions**.

---

## What we tried

1. ✅ **Added comment** explaining warnings are false positives
2. ✅ **Switched to bracket notation** (`secrets['NAME']` instead of `secrets.NAME`)
3. ✅ **Created `.vscode/settings.json`** with file association to plain YAML
4. ❌ **None worked** — warnings persist

---

## Solution Options

### Option 1: Disable warnings via workspace settings ⭐ RECOMMENDED

Update `.vscode/settings.json` to suppress GitHub Actions diagnostics:

```json
{
  "files.associations": {
    ".github/workflows/*.yml": "yaml",
    ".github/workflows/*.yaml": "yaml"
  },
  "yaml.customTags": [
    "!secret scalar"
  ],
  "github-actions.workflows.pinned.workflows": [],
  "github-actions.workflows.pinned.refresh.enabled": false
}
```

**Then reload VS Code window:**
- Command Palette → "Developer: Reload Window"

---

### Option 2: Disable GitHub Actions extension for this workspace

Add to `.vscode/extensions.json`:

```json
{
  "recommendations": [],
  "unwantedRecommendations": [
    "github.vscode-github-actions"
  ]
}
```

Or manually: Extensions → GitHub Actions → Disable (Workspace)

---

### Option 3: Ignore warnings (live with them)

The workflow is **valid**. The warnings don't affect:
- ✅ Workflow execution
- ✅ GitHub Actions runs
- ✅ Deployment success

Just ignore the squiggly lines. Add secrets in repo Settings → Secrets and the workflow will work.

---

## Recommended Action

1. **Try Option 1** (update `.vscode/settings.json`, reload window)
2. **If that fails, use Option 3** (ignore warnings)
3. **Option 2** is overkill (loses GitHub Actions features)

---

## Verification

After applying fixes:
1. Open `deploy.yml`
2. Check Problems panel (View → Problems)
3. Should see 0 problems or only non-secret warnings

If warnings persist after reload, they're cosmetic — **the workflow is valid and will deploy correctly**.
