---
name: N+1 Queries and Code Quality Refactors
description: Eliminated N+1 database queries in aggregated stats, reduced router boilerplate with mutateGameViaDO helper, split save strategies, and replaced fragile DOM selectors with data attributes
type: performance_issue
problem_type: performance_issue
component: packages/bot (API router, database), packages/web (stats page)
date_solved: 2026-03-24
severity: medium
tags:
  - n-plus-one
  - cloudflare-d1
  - code-quality
  - router-pattern
  - dom-selectors
---

# N+1 Queries and Code Quality Refactors

## Problem

Four code quality issues identified via `/simplify` review:

1. **N+1 queries in aggregated stats**: `getAggregatedStats` called `db.getGame(id)` in a loop for every finished game, each requiring 2 D1 queries (game metadata + events). For 50 games, this meant 100+ queries.

2. **N+1 in `saveGame`**: `saveGame` inserted events one at a time in a loop, issuing N individual INSERT statements.

3. **Router boilerplate**: Four mutation endpoints (`addEvent`, `undoLastEvent`, `deleteEvent`, `setLineups`) all duplicated the same pattern: fetch game -> hydrate Durable Object -> forward request -> save result.

4. **Fragile DOM selectors in stats page**: Column visibility and sort headers used positional indexes (`children[7]`, `children[8]`) that would break if columns were reordered.

## Root Cause

- **N+1 queries**: No batch query method existed. Each game was fetched individually because `listGames` only returned `GameSummary` (no events).
- **Save inefficiency**: No distinction between "save metadata only" and "save with events" — every mutation saved everything.
- **Router duplication**: No shared abstraction for the common DO mutation pattern.
- **Fragile selectors**: HTML had no semantic markers; JS relied on column position.

## Solution

### 1. Batch Query: `listGamesWithEvents`

Added a new method to `DatabaseService` that fetches all games and their events in exactly 2 queries:

```typescript
// packages/bot/src/db/database.ts
async listGamesWithEvents(
  limit: number = 50,
  tournamentName?: string,
  fromDate?: string,
  toDate?: string,
): Promise<Game[]> {
  // Query 1: Fetch games with dynamic WHERE clause
  const gamesResult = await this.db
    .prepare(`SELECT * FROM games g ${whereClause} ORDER BY ... LIMIT ?`)
    .bind(...binds)
    .all();

  // Query 2: Fetch ALL events for these games with IN clause
  const gameIds = gameRows.map(g => g.id as string);
  const placeholders = gameIds.map(() => '?').join(',');
  const eventsResult = await this.db
    .prepare(`SELECT * FROM events WHERE game_id IN (${placeholders}) ORDER BY timestamp ASC`)
    .bind(...gameIds)
    .all();

  // Group events by game_id in JS
  const eventsByGame = new Map<string, any[]>();
  for (const row of (eventsResult.results || [])) {
    const gameId = row.game_id as string;
    if (!eventsByGame.has(gameId)) eventsByGame.set(gameId, []);
    eventsByGame.get(gameId)!.push(row);
  }

  return gameRows.map(gameRow =>
    this.mapToGame(gameRow, eventsByGame.get(gameRow.id as string) || [])
  );
}
```

**Impact**: Reduced aggregated stats from ~100 queries to exactly 2, regardless of game count.

### 2. Split Save Strategies

Created three distinct save methods:

- `saveGameMetadata(game)` — upserts the games row only (1 query). Used for lineup changes, game updates.
- `saveGameWithEvents(game)` — upserts metadata + deletes orphaned events + upserts current events. Used after event mutations.
- `saveGame(game)` — full save for game creation (delegates to `saveGameMetadata` + event loop).

### 3. Router `mutateGameViaDO` Helper

Extracted the repeated pattern into a single method:

```typescript
// packages/bot/src/api/router.ts
private async mutateGameViaDO(
  gameId: string,
  doPath: string,
  doMethod: string,
  body?: unknown,
  saveStrategy: 'metadata' | 'events' = 'events',
): Promise<Response> {
  const game = await this.db.getGameMetadata(gameId);
  if (!game || !game.chatId) return jsonError('Game not found', 404);

  const stub = await this.ensureDOHydrated(game.chatId);
  if (!stub) return jsonError('Failed to restore game state', 500);

  const response = await stub.fetch(
    new Request(`https://fake-host${doPath}`, {
      method: doMethod,
      ...(body !== undefined && { body: JSON.stringify(body) }),
    })
  );

  const data = await response.json() as { game: Game };
  if (response.ok) {
    if (saveStrategy === 'metadata') await this.db.saveGameMetadata(data.game);
    else await this.db.saveGameWithEvents(data.game);
  }
  return jsonResponse(data, response.status);
}
```

Route handlers became one-liners:

```typescript
private async addEvent(gameId: string, request: Request): Promise<Response> {
  const body = await request.json();
  const parsed = AddEventRequestSchema.safeParse(body);
  if (!parsed.success) return jsonError('Validation error', 400);
  return this.mutateGameViaDO(gameId, '/events', 'POST', parsed.data, 'events');
}
```

### 4. Data Attributes for DOM Selection

Replaced positional index selectors with semantic `data-*` attributes:

```html
<!-- packages/web/src/stats.html -->
<th data-sort-key="name">Player</th>
<th data-sort-key="goals">Goals</th>
<th data-sort-key="goalsPerGame" data-per-game class="mobile-hidden">G/Game</th>
```

```typescript
// Toggle per-game columns by attribute, not position
document.querySelectorAll('[data-per-game]').forEach(el => {
  el.classList.toggle('hidden', !isAggregated);
});
```

## Verification

All 6 API endpoints tested against production after deployment:
- GET /health
- GET /games
- GET /games/{id}
- GET /games/{id}/stats
- GET /stats/aggregated
- GET /stats/aggregated?tournament=YULA

## Prevention

- **Review for N+1 patterns**: When adding new list endpoints that need related data, always consider batch fetching with `IN` clauses rather than per-item queries.
- **Use `getGameMetadata` for routing**: When you only need the `chatId` to forward to a Durable Object, don't fetch all events.
- **Semantic selectors**: Always use `data-*` attributes or class names for JS DOM selection, never positional indexes.
- **Extract common patterns early**: When 3+ endpoints share the same boilerplate, extract a helper immediately.

## Related

- Cloudflare D1 has a 1MB response limit per query — batching with `IN` clauses is safe as long as the result set stays under this.
- The `ensureDOHydrated` pattern handles Durable Object eviction gracefully by rehydrating from D1 when needed.
