---
title: "Scorebot Multi-Fix: Parser, State Machine, Routing, and Break Detection"
date: 2026-03-08
tags:
  - parser
  - game-state
  - routing
  - break-detection
  - backfill
  - stats
severity: high
component:
  - StatsCalculator
  - GameState
  - Router
  - web/main.ts
problem_type: logic-errors
status: resolved
---

# Scorebot Multi-Fix: Parser, State Machine, Routing, and Break Detection

Six bugs discovered while loading Battle of the Hudson tournament games, plus a simplification pass.

## Symptoms

1. Player stats showed "Hammer", "Deep", "Greatest", "Blade" as player names
2. Newly loaded games were invisible in the games list (status stuck at `not_started`)
3. Stats page showed "Failed to load statistics" for individual games
4. Score table showed breaks incorrectly after halftime (e.g., opponent's first hold after half marked as break)
5. Note events in timeline displayed generic "Note" instead of "Jake steal" or "Toby block"
6. Refreshing the page lost the selected game

## Root Causes and Fixes

### 1. Throw descriptors parsed as player names

**Root cause:** `StatsCalculator.extractPlayerNames()` matched capitalized words via `/[A-Z][a-z]+/` but didn't exclude throw descriptors. `parseGoalEvent()` regex `([A-Z][a-z]+)\s+to\s+([A-Z][a-z]+)` captured "hammer" as assister in "Mason hammer to Asher".

**Fix:** Extracted a single `THROW_DESCRIPTORS` constant. Updated `parseGoalEvent()` regex to skip optional descriptors between name and "to". Added descriptors to `COMMON_WORDS` exclusion set.

```typescript
private static readonly THROW_DESCRIPTORS = [
  'hammer', 'deep', 'greatest', 'blade', 'huck', 'diving', 'tipped', 'sky',
];

// Regex skips descriptors: "Mason hammer to Asher" -> assister=Mason, scorer=Asher
private static readonly ASSIST_PATTERN = new RegExp(
  `\\b([A-Z][a-z]+)\\s+(?:(?:${...})\\s+)?to\\s+([A-Z][a-z]+)\\b`, 'i'
);
```

### 2. Backfilled events didn't update game status

**Root cause:** `GameState.addEvent()` had `if (!timestamp)` guard around all status transitions. Events with custom timestamps (backfilling historical games) never changed status from `not_started`, so `listGames()` query `WHERE status = 'finished'` excluded them.

**Fix:** Removed the guard. Status transitions always execute, using `timestamp || Date.now()` for timing.

```typescript
// Before: if (!timestamp) { ...transitions... }
// After:
const eventTime = timestamp || Date.now();
if (type === EventType.GAME_START) {
  this.game.status = GameStatus.FIRST_HALF;
  this.game.startedAt = eventTime;
}
```

### 3. Stats endpoint unreachable (route ordering)

**Root cause:** Router used `path.startsWith('/games/')` for GET game handler, which caught `/games/:id/stats` before the stats handler.

**Fix:** Changed to exact match: `path.match(/^\/games\/[^/]+$/)`.

### 4. Break detection wrong after halftime

**Root cause:** Break detection compared consecutive goals — same team scoring = break. But after halftime the receiving team flips, so same team scoring across half is a hold, not a break. This was duplicated in both the score table and timeline.

**Fix:** Added halftime crossing check. When halftime occurred between goals, inverted the logic. Unified the duplicate implementations into a single `isBreakScore()` method.

```typescript
const sameTeam = prevEvent.team === event.team;
return crossedHalftime ? !sameTeam : sameTeam;
```

### 5. Note events showing "Note"

**Fix:** `event.message || 'Note'` instead of hardcoded `'Note'`.

### 6. Game selector not updating URL

**Fix:** Added `window.history.replaceState` on selection change to sync `?game=` param.

## Simplification Pass

- **Single source of truth:** `THROW_DESCRIPTORS` constant derives regex patterns and Set entries (was triplicated)
- **Static class properties:** `COMMON_WORDS` Set and compiled regex patterns hoisted from per-call to static (avoided recreation on every goal event)
- **Unified break detection:** Score table delegates to `isBreakScore()` method (was duplicated)

## Prevention

### Key patterns to watch

1. **Exclusion list brittleness:** When filtering by exclusion, domain vocabulary grows over time. Prefer multiple validation layers over a single exclusion pass.
2. **Optional params suppressing side effects:** `if (!param) { doSideEffect() }` hides business logic. Always apply state transitions; let the param control *what data* to use, not *whether* to transition.
3. **Greedy route matching:** Never use `startsWith` for dispatch. Use regex with boundaries (`/^\/path\/[^/]+$/`).
4. **State flips mid-game:** Any logic comparing events across halftime must check for state-changing events between them. Encapsulate in a helper used consistently everywhere.
5. **Hardcoded fallbacks:** Display layers should prefer `data || fallback`, not hardcoded strings.

### Test cases that would catch these

- Parse "Mason hammer to Asher" and assert no "Hammer" player exists
- Backfill game_start with custom timestamp, assert status transitions to FIRST_HALF
- GET `/games/:id/stats` returns stats object (not game object)
- Score break detection across halftime with known starting offense
- Note event with message renders that message, not "Note"
- Select game, read URL param, refresh, assert same game selected

## Related

- No prior docs/solutions/ entries (first documentation)
- Commits: c264f8c, b103e2d, 206249f, ad2fdd9, b4f00a2, a670146, 850f783
