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

Run as its own Bash call (absolute cd to project root):

```bash
cd /Users/grahamsiener/src/discore && mkdir -p packages/web/public/rankings && cp \
  "/Users/grahamsiener/Library/CloudStorage/GoogleDrive-graham@kcuda.org/My Drive/Coaches/roster/rankings/data.json" \
  "/Users/grahamsiener/Library/CloudStorage/GoogleDrive-graham@kcuda.org/My Drive/Coaches/roster/rankings/graph.html" \
  "/Users/grahamsiener/Library/CloudStorage/GoogleDrive-graham@kcuda.org/My Drive/Coaches/roster/rankings/index.html" \
  packages/web/public/rankings/
```

### Step 2 — Deploy

Run as a SEPARATE Bash call (do NOT chain with Step 1 using &&):

```bash
cd /Users/grahamsiener/src/discore/packages/web && npm run deploy 2>&1
```

Why separate? The shell working directory persists across Bash calls. If Step 1 ended at the project root, Step 2 needs its own `cd` to reach `packages/web`. Chaining them in one call risks the deploy running from the wrong directory if the session already had a different cwd.

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
