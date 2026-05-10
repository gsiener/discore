---
name: deploy-rankings
description: Pull latest rankings files from Google Drive and deploy to score.kcuda.org. Use when the user asks to "pull and deploy rankings", "update rankings", or "deploy rankings".
version: 2.0.0
---

# Deploy Rankings Skill

Pulls the latest rankings files (now split by division: boys + girls) from Google Drive and deploys them to score.kcuda.org via Cloudflare Pages.

## Critical: Shell Working Directory

The shell working directory **persists across Bash tool calls** in a session. Never use `cd packages/web` as a relative path — it accumulates across calls and causes deploys to run from the wrong directory. Always use absolute paths.

## Workflow

Graham uses two Macs with different usernames (`grahamsiener` and `gsiener`). All paths below use `$HOME` so the skill works on both machines without modification.

### Step 1 — Copy files from Google Drive

The rankings layout is now per-division (boys + girls) with a redirect at root, plus a shared `sources.html` page reachable from the in-page nav pill. Copy all 8 files in one call:

```bash
cd "$HOME/src/discore" && mkdir -p packages/web/public/rankings && cp \
  "$HOME/Library/CloudStorage/GoogleDrive-graham@kcuda.org/My Drive/Coaches/roster/rankings/data_boys.json" \
  "$HOME/Library/CloudStorage/GoogleDrive-graham@kcuda.org/My Drive/Coaches/roster/rankings/data_girls.json" \
  "$HOME/Library/CloudStorage/GoogleDrive-graham@kcuda.org/My Drive/Coaches/roster/rankings/index.html" \
  "$HOME/Library/CloudStorage/GoogleDrive-graham@kcuda.org/My Drive/Coaches/roster/rankings/boys.html" \
  "$HOME/Library/CloudStorage/GoogleDrive-graham@kcuda.org/My Drive/Coaches/roster/rankings/girls.html" \
  "$HOME/Library/CloudStorage/GoogleDrive-graham@kcuda.org/My Drive/Coaches/roster/rankings/graph_boys.html" \
  "$HOME/Library/CloudStorage/GoogleDrive-graham@kcuda.org/My Drive/Coaches/roster/rankings/graph_girls.html" \
  "$HOME/Library/CloudStorage/GoogleDrive-graham@kcuda.org/My Drive/Coaches/roster/rankings/sources.html" \
  packages/web/public/rankings/
```

Then sweep any leftover stale filenames from prior layouts so they don't ship:

```bash
rm -f "$HOME/src/discore/packages/web/public/rankings/index_boys.html" \
      "$HOME/src/discore/packages/web/public/rankings/index_girls.html" \
      "$HOME/src/discore/packages/web/public/rankings/data.json" \
      "$HOME/src/discore/packages/web/public/rankings/graph.html"
```

### Step 2 — Deploy

Run as a SEPARATE Bash call (do NOT chain with Step 1 using &&):

```bash
cd "$HOME/src/discore/packages/web" && npm run deploy 2>&1
```

### Step 3 — Verify the live site

Verify both divisions. Use a cache-busting query string — Cloudflare's edge can briefly serve stale content right after deploy:

```bash
for div in boys girls; do
  curl -s "https://score.kcuda.org/rankings/data_${div}.json?cb=$(date +%s%N)" \
    | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'${div}: totalGames={d[\"totalGames\"]}, lastUpdated={d[\"lastUpdated\"]}')"
done
```

Confirm `totalGames` is reasonable for each (boys ~1800+, girls ~150+). If either fetches as 0 or fails to parse, the working directory was wrong — go back to Step 1.

## Files

- Source: `$HOME/Library/CloudStorage/GoogleDrive-graham@kcuda.org/My Drive/Coaches/roster/rankings/`
- Files: `data_boys.json`, `data_girls.json`, `index.html` (redirect), `boys.html`, `girls.html`, `graph_boys.html`, `graph_girls.html`, `sources.html`
- Destination: `packages/web/public/rankings/` (gitignored, recreate each time)
- Live site: https://score.kcuda.org/rankings/ (redirects to `/rankings/boys.html`; `/rankings/girls.html` for girls; `/rankings/sources.html` for the shared Sources page reached via the in-page nav pill from any rankings/graph view)
