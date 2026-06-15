---
name: D1 INSERT OR REPLACE Cascade-Deletes Child Rows
description: Every metadata-only save silently wiped a game's events because SQLite's INSERT OR REPLACE is DELETE+INSERT, triggering ON DELETE CASCADE on the events foreign key
problem_id: d1-insert-or-replace-cascade
problem_type: database_issue
component: packages/bot/src/db/database.ts
function: saveGameMetadata
severity: critical
date_fixed: 2026-05-19
symptoms:
  - Aggregated stats endpoint returned wildly wrong percentages (e.g. PVI break conversion 84% from 3 wins instead of 69% from 6)
  - /games/:id returned correct events but /stats/aggregated saw the game as having zero events
  - Metadata-only PATCHes (e.g. setting videoUrl) silently destroyed all events for that game
  - Loss was invisible until aggregated math diverged from manual count
root_cause: wrong_api
resolution_type: code_fix
tags:
  - cloudflare-d1
  - sqlite
  - cascade-delete
  - upsert
  - data-loss
  - foreign-keys
related:
  - commits 8a8832d (fix), and a follow-up admin endpoint (since removed) that restored events from each Durable Object back into D1
  - docs/solutions/patterns/critical-patterns.md (pattern #1 — required reading)
---

# D1 INSERT OR REPLACE Cascade-Deletes Child Rows

## Problem

After backfilling `videoUrl` on three games via a `PATCH /games/:id`, the aggregated stats endpoint started reporting a season break-conversion rate of 84% from 3 wins, instead of the expected 69% from 6 games. Manual recount from the timeline didn't match the API. `GET /games/:id` still returned full event lists for every game — only `GET /stats/aggregated` was wrong.

Every metadata-only save (set lineups, attach a video URL, edit team name) silently deleted that game's events from D1. The Durable Object still held them in memory, so the per-game view kept working, masking the loss.

## Investigation

Spent significant time triple-checking the stats math before realizing the data was wrong, not the formula:

- Hand-calculated season totals from event lists → didn't match `/stats/aggregated`.
- Checked the per-game endpoint → events were all there.
- Diffed: per-game endpoint reads from the Durable Object, aggregate endpoint reads from D1 directly.
- Queried D1 → events for the three patched games were gone. Their `games` row was present and correct.

The pattern was obvious in retrospect: every game that lost events had been touched by a metadata-only update.

## Root Cause

`saveGameMetadata` used `INSERT OR REPLACE INTO games (...)`. In SQLite, `INSERT OR REPLACE` (and the equivalent `REPLACE`) is implemented as **DELETE the conflicting row, then INSERT the new one** — not as an update in place.

The `events` table has:

```sql
FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
```

So the implicit DELETE of the parent row cascaded through and wiped every event for that game. The new INSERT re-created the games row with the same id, but the events were gone.

This is documented SQLite behavior, but it's the kind of footgun you only learn about once.

## Solution

Switch from `INSERT OR REPLACE` to a true UPSERT using `ON CONFLICT(id) DO UPDATE SET`, which updates the existing row in place — no DELETE, no cascade:

```ts
// packages/bot/src/db/database.ts (saveGameMetadata)
//
// UPSERT (not INSERT OR REPLACE): REPLACE deletes-then-inserts, which
// triggers ON DELETE CASCADE on the events table and silently wipes a
// game's events on every metadata update. UPSERT keeps the row identity.
await this.db
  .prepare(
    `INSERT INTO games (
        id, status, our_team_name, their_team_name,
        score_us, score_them, started_at, finished_at,
        chat_id, tournament_name, game_date, game_order,
        starting_on_offense, lineups, video_url, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        status=excluded.status,
        our_team_name=excluded.our_team_name,
        ...
        updated_at=excluded.updated_at`
  )
  .bind(...)
  .run();
```

### Recovery

Events were still resident in each affected game's Durable Object (the DO is the live source of truth; D1 is the persistence layer). A one-shot admin endpoint walked the list of games, fetched their event history from the corresponding DO, and re-inserted those rows into D1. The endpoint was removed once recovery finished.

## Prevention

- **Never use `INSERT OR REPLACE` on a table that has child tables with `ON DELETE CASCADE`.** Always use `ON CONFLICT(...) DO UPDATE SET` for parent rows.
- **Cross-check D1 vs Durable Object for any consistency bug.** If `/games/:id` and `/stats/aggregated` disagree, the DO has data D1 doesn't, and you have data loss.
- **Treat aggregated-stats discrepancies as data-integrity alerts, not math bugs.** When the manual count doesn't match the API, the first hypothesis should be "rows are missing", not "the calculation is wrong".
- The same trap exists for any future child table that adds `ON DELETE CASCADE` against `games`. Auditing existing migrations once, and adding a comment on the FK definition, would help.
