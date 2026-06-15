# Critical Patterns — Required Reading

Patterns that must be followed every time. Each one represents a non-obvious
trap that has caused real damage (data loss, prod outages, silent corruption).
Read before writing or reviewing code in the affected area.

---

## 1. Use UPSERT, never INSERT OR REPLACE, on tables with cascading children

**Applies to:** Any SQLite/D1 table that has child tables with `ON DELETE CASCADE` foreign keys referencing it. In Discore today this is the `games` ← `events` relationship, but the rule generalizes to any future parent-child pair.

**Why it matters:** SQLite's `INSERT OR REPLACE` (and the equivalent `REPLACE`) is implemented as **DELETE the conflicting row, then INSERT the new one**. The DELETE fires `ON DELETE CASCADE`, silently wiping every child row before the new parent is inserted. A metadata-only update to the parent destroys all its children.

In Discore this caused real data loss: every `PATCH /games/:id` (lineup change, videoUrl attach, score correction) wiped that game's events from D1. The Durable Object kept the events in memory, so per-game endpoints kept working — but the aggregated stats endpoint reads D1 directly and started returning wildly wrong numbers (PVI break conversion read as 84% from 3 wins, actual 69% from 6).

### ❌ WRONG

```ts
await this.db.prepare(
  `INSERT OR REPLACE INTO games (
     id, status, our_team_name, their_team_name, ...
   ) VALUES (?, ?, ?, ?, ...)`
).bind(...).run();
```

This deletes the old `games` row before inserting the new one. `ON DELETE CASCADE` on the events FK fires. All events for this game are gone.

### ✅ CORRECT

```ts
await this.db.prepare(
  `INSERT INTO games (
     id, status, our_team_name, their_team_name, ...
   ) VALUES (?, ?, ?, ?, ...)
   ON CONFLICT(id) DO UPDATE SET
     status=excluded.status,
     our_team_name=excluded.our_team_name,
     their_team_name=excluded.their_team_name,
     ...
     updated_at=excluded.updated_at`
).bind(...).run();
```

This updates the existing row in place. No DELETE, no cascade, children preserved.

### How to apply

- **Audit any new D1 migration that adds a foreign key.** If it includes `ON DELETE CASCADE`, every code path that writes the parent must use UPSERT.
- **Never write a new query that uses `INSERT OR REPLACE` or `REPLACE INTO`** without first checking whether the table has child rows. If in doubt, use UPSERT — it's safe in both cases.
- **When two endpoints reading the "same" data disagree** (e.g. `/games/:id` shows events, `/stats/aggregated` doesn't), treat it as a data-loss signal, not a math bug. Look for missing rows before re-examining the calculation.

See: [docs/solutions/database-issues/d1-insert-or-replace-cascade-deletes-events.md](../database-issues/d1-insert-or-replace-cascade-deletes-events.md)
