---
title: 'deploy-rankings assumes missing 2026-27 Drive folder'
severity: 'minor'
---

## Expected Behavior
The deployment skill detects available season folders and safely deploys the web app.

## Current Behavior
The skill requires rankings/2026-27 in Google Drive, but only flat rankings exports exist, so its copy step fails.

## Possible Solution
Detect available season directories and fall back to existing frozen local season data when the current Drive folder is absent.

## Minimal Reproducible Example
Run the first copy step from .claude/skills/deploy-rankings/SKILL.md on this machine; the rankings/2026-27 source directory does not exist.

## Context
This blocked a web deployment after a successful push because CI intentionally deploys only the API Worker.
