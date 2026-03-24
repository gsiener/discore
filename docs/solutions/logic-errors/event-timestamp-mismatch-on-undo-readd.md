---
problem_id: event-timestamp-mismatch-sorting
component: packages/bot/src/durable-objects/GameState.ts
function: addEvent, deleteEvent, recalculateGameState
problem_type: data-integrity
severity: high
date_fixed: 2026-03-24
symptoms:
  - Final goal events sorted to beginning of events array instead of end
  - Point-by-point progression table rendered final score (11-10) in first column
  - Game timeline displayed events in wrong chronological order
  - Undo/re-add workflow produced events with incorrect timestamps
tags:
  - timestamp-sorting
  - event-ordering
  - durable-objects
  - game-state
  - data-correction
  - api-tooling
related:
  - docs/solutions/logic-errors/scorebot-multi-fix-parser-state-routing.md
  - docs/solutions/logic-errors/halftime-crossover-break-detection.md
  - commits: d853714, e560b45, b103e2d
---

# Event Timestamp Mismatch on Undo/Re-Add

## Problem

Correcting a game event via undo and re-add caused the re-added events to sort to position 0 in the timeline, breaking the web UI's point-by-point progression table. The table showed the final score (11-10) in the first column instead of the first point's score.

**Observed in:** Jackson Reed game (game_mn2iypzy_nedt41l). The winning goal needed its message changed from "Jake to Mason" to "Alex to Mason". After undoing and re-adding the goal, it appeared at the start of the timeline instead of the end.

## Root Cause

Two issues converged:

### 1. Wrong timestamp on re-add

The `addEvent` method sorts events by timestamp after insertion:

```typescript
this.game.events.sort((a, b) => a.timestamp - b.timestamp);
```

The re-added events used timestamp `1742673180000` (from the load script's `edt()` helper, configured for a different date), while all other game events had timestamps around `1774193...` — roughly 32 days later. The events sorted to position 0.

### 2. No way to delete an arbitrary event

The only removal mechanism was `undoLastEvent`, which pops from the end of the sorted array. Once an event sorts to the wrong position, there is no API path to remove it without undoing all subsequent events — far too error-prone for production data.

### 3. Latent bug in `undoLastEvent`

`undoLastEvent` used a simplified status recalculation that only checked the last remaining event. It did not:
- Reset `finishedAt` when undoing a `GAME_END` event
- Properly recalculate `startedAt` for arbitrary event removals
- Use the existing `calculateScoreFromEvents()` utility (duplicated inline instead)

## Solution

### 1. Added `DELETE /games/{gameId}/events/{eventId}` endpoint

New route in `router.ts` and `deleteEvent(eventId)` method in `GameState.ts` that finds an event by ID, splices it out, and recalculates game state.

### 2. Extracted `recalculateGameState()` private method

Single method used by both `undoLastEvent` and `deleteEvent`:

```typescript
private recalculateGameState(): void {
  if (!this.game) return;

  this.game.score = calculateScoreFromEvents(this.game.events);

  let status = GameStatus.NOT_STARTED;
  this.game.startedAt = undefined;
  this.game.finishedAt = undefined;
  for (const event of this.game.events) {
    if (event.type === EventType.GAME_START) {
      status = GameStatus.FIRST_HALF;
      this.game.startedAt = event.timestamp;
    } else if (event.type === EventType.HALFTIME) {
      status = GameStatus.HALFTIME;
    } else if (event.type === EventType.SECOND_HALF_START) {
      status = GameStatus.SECOND_HALF;
    } else if (event.type === EventType.GAME_END) {
      status = GameStatus.FINISHED;
      this.game.finishedAt = event.timestamp;
    }
  }
  this.game.status = status;
  this.game.updatedAt = Date.now();
}
```

Uses `calculateScoreFromEvents()` from `@scorebot/shared` instead of duplicated inline score loop. Rebuilds score, status, `startedAt`, and `finishedAt` in a single pass.

### 3. Router consistency

Added `if (response.ok)` guard before DB save in `addEvent` and `undoLastEvent` (matching `deleteEvent`), preventing D1 writes on DO errors.

### 4. Data fix

```bash
# Delete misplaced events
curl -X DELETE '.../games/{id}/events/{goalEventId}'
curl -X DELETE '.../games/{id}/events/{gameEndEventId}'

# Re-add with correct timestamp (matching surrounding events)
curl -X POST '.../games/{id}/events' \
  -d '{"type":"goal","team":"us","message":"Alex to Mason","timestamp":1774193839000}'
curl -X POST '.../games/{id}/events' \
  -d '{"type":"game_end","timestamp":1774193839000}'
```

## Prevention

### Key Insight

**Event timestamps must be correct at insertion time** — there is no post-hoc fix once `addEvent` sorts events by timestamp. The sort is authoritative; wrong timestamps produce wrong ordering silently.

### Best Practices

1. **When re-adding events, always derive the timestamp from surrounding events** — never reuse timestamps from load script helpers, which are date-specific.
2. **Prefer delete+re-add over undo+re-add** when correcting non-last events, now that the delete-by-ID endpoint exists.
3. **Consider adding a PATCH endpoint** for simple field corrections (message, team) that don't require changing timestamps.
4. **Use `recalculateGameState()` for all state mutations** — never maintain incremental score/status logic separately.

### Recommended Test Cases

| # | Test | What it catches |
|---|------|-----------------|
| 1 | Add event with timestamp earlier than all existing events, verify sort position | The exact bug documented here |
| 2 | Delete mid-game goal, verify score recalculation | Score drift after arbitrary deletion |
| 3 | Delete GAME_END event, verify `finishedAt` is cleared and status reverts | The latent `undoLastEvent` bug |
| 4 | Delete GAME_START event, verify `startedAt` is cleared | Status regression |
| 5 | Undo last goal, re-add with different team, verify score consistency | Round-trip correction safety |
| 6 | Compare `game.score` to `calculateScoreFromEvents(game.events)` after every mutation | Score computation divergence |

### Related Patterns

This is the same class of bug as "backfilled events not updating game status" (documented in `scorebot-multi-fix-parser-state-routing.md`). Both stem from timestamp-driven event ordering interacting with state that was computed incrementally at insertion time. The `recalculateGameState()` extraction is the generalized fix for this class of problem.
