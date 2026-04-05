---
name: deploy-rankings
description: Pull latest rankings files from Google Drive and deploy to score.kcuda.org. Use when the user asks to "pull and deploy rankings", "update rankings", or "deploy rankings".
version: 1.0.0
---

# Deploy Rankings Skill

Pulls the three rankings files from Google Drive and deploys them to score.kcuda.org via Cloudflare Pages.

## Critical: Shell Working Directory

The shell working directory **persists across Bash tool calls** in a session. Never use `cd packages/web` as a relative path — it accumulates across calls and causes deploys to run from the wrong directory. Always use absolute paths.

## Workflow

### Step 1 — Copy files from Google Drive

Run this as a single Bash call:

```bash
cd /Users/grahamsiener/src/discore && mkdir -p packages/web/public/rankings && cp \
  "/Users/grahamsiener/Library/CloudStorage/GoogleDrive-graham@kcuda.org/My Drive/Coaches/roster/rankings/data.json" \
  "/Users/grahamsiener/Library/CloudStorage/GoogleDrive-graham@kcuda.org/My Drive/Coaches/roster/rankings/graph.html" \
  "/Users/grahamsiener/Library/CloudStorage/GoogleDrive-graham@kcuda.org/My Drive/Coaches/roster/rankings/index.html" \
  packages/web/public/rankings/
```

### Step 2 — Deploy (use absolute path for cd)

```bash
cd /Users/grahamsiener/src/discore/packages/web && npm run deploy 2>&1
```

### Step 3 — Verify the live site

```bash
curl -s "https://score.kcuda.org/rankings/" | grep '"lastUpdated"' | head -1
```

Confirm the date matches today's date. If it's stale or 0 files were uploaded, the working directory was wrong — go back to Step 1.

## Files

- Source: `/Users/grahamsiener/Library/CloudStorage/GoogleDrive-graham@kcuda.org/My Drive/Coaches/roster/rankings/`
- Files: `data.json`, `graph.html`, `index.html`
- Destination: `packages/web/public/rankings/` (gitignored, recreate each time)
- Live site: https://score.kcuda.org/rankings/
