---
name: CI Web Deploy Clobbered Gitignored Rankings
description: GitHub Actions deploy-web job ran on every push, built an empty dist/rankings/ because the directory is gitignored, and replaced the live rankings pages with nothing
problem_id: ci-clobbers-gitignored-rankings
problem_type: workflow_issue
component: .github/workflows/cd.yml, packages/web/public/rankings/
function: deploy-web (workflow job)
severity: high
date_fixed: 2026-05-19
symptoms:
  - https://score.kcuda.org/rankings/boys and /rankings/girls returned 404 or blank pages after recent merges to main
  - Local `npm run deploy` worked and rankings showed up — until the next CI run wiped them
  - CF Pages deployment list showed alternating "from local" (with content) and "from GitHub Actions" (empty) deployments
root_cause: config_error
resolution_type: workflow_improvement
tags:
  - github-actions
  - cloudflare-pages
  - gitignore
  - deploy-pipeline
  - cd-clobber
related:
  - commits 8f6467b (removed deploy-web job)
  - .claude/skills/deploy-rankings/SKILL.md (the local deploy flow that pulls rankings from Google Drive)
---

# CI Web Deploy Clobbered Gitignored Rankings

## Problem

The rankings pages at `score.kcuda.org/rankings/boys` and `/rankings/girls` kept disappearing after pushes to `main`, then reappearing after the next local deploy. Pattern repeated until I tied it to CI deploy timing.

## Investigation

- Checked CF Pages deployment history → recent deploys alternated between "from local CLI" (rankings present) and "triggered by GitHub Actions" (rankings missing).
- Inspected the GitHub Actions checkout → `packages/web/public/rankings/` was empty.
- Confirmed `packages/web/public/rankings/` is in `.gitignore`. The rankings HTML files are large, generated artifacts pulled from Google Drive by the `deploy-rankings` skill, and intentionally not committed.
- The CI workflow ran `vite build` against a checkout with no rankings, producing an empty `dist/rankings/`. Then `wrangler pages deploy dist` published that empty directory, which overwrote whatever the last local deploy had put up.

## Root Cause

`vite build` + `wrangler pages deploy dist` is a **whole-site replacement**, not a partial publish. There is no merge with existing content on the edge — the contents of `dist` *are* the new site. If `dist` is missing a directory, the live site loses that directory.

CI checked out only what's in the repo; the gitignored rankings were never present in the build; the deploy clobbered them.

This is structurally unavoidable as long as:
1. The rankings live outside the repo (gitignored, sourced from Drive).
2. CI runs an unconditional full deploy from a fresh checkout.

## Solution

Removed the `deploy-web` job entirely from `.github/workflows/cd.yml`. Web deploys must now happen from local, where the `deploy-rankings` skill pulls fresh rankings from Drive into `packages/web/public/rankings/` before `npm run deploy` builds and publishes.

The workflow file now has a comment block where the job used to be, explaining why it must stay removed:

```yaml
# NOTE: web deploys must happen from local, not CI.
# packages/web/public/rankings/ is gitignored — those files are pulled fresh
# from Google Drive via the deploy-rankings skill before each deploy. CI
# builds an empty rankings/ directory and clobbers the live rankings pages.
# Run `cd packages/web && npm run deploy` locally instead.
```

The Worker (`deploy-worker`) job stays — the Worker has no equivalent gitignored content and is safe to ship from CI.

## Prevention

- **Whenever a static deploy is "replace whole site", any gitignored content under the publish directory is a deployment hazard.** Either commit the artifact (with LFS if needed), pull it in CI before build, or block CI from publishing.
- If a future CI rebuild becomes desirable, the rankings need to be either checked in or fetched from Drive *inside the CI job* before `vite build` runs. Pulling from Drive in CI would need service-account credentials and is more setup than it's worth right now.
- For CF Pages projects with gitignored content, prefer Wrangler's local deploy over CI deploy unless explicit fetch-then-build steps are in place.
- The same trap would apply to any other gitignored generated directory under `packages/web/public/` (e.g. future cached datasets, manual uploads).
