---
name: Parser Case-Insensitive Flag Extracted "leaping" and "diving" as Players
description: ASSIST_PATTERN used the 'i' regex flag, so [A-Z][a-z]+ matched lowercase throw descriptors like "diving" and registered them as scorers in player stats
problem_id: parser-case-insensitive-descriptors
problem_type: logic_error
component: packages/bot/src/services/PlayerNameParser.ts
function: ASSIST_PATTERN, parseGoalEvent
severity: medium
date_fixed: 2026-05-19
symptoms:
  - "leaping" and "diving" appeared as players in the advanced stats page
  - "Ellis to diving Cyrus" parsed as scorer="diving" instead of scorer="Cyrus"
  - Throw descriptors used after "to" got captured as receiver names
root_cause: wrong_api
resolution_type: code_fix
tags:
  - regex
  - parser
  - case-sensitivity
  - player-stats
  - false-positive
related:
  - commits fc2b1f1 (fix), c96509c (earlier blocklist for descriptors)
  - .claude/projects/-Users-gsiener-src-discore/memory/feedback_stats_no_descriptors.md
---

# Parser Case-Insensitive Flag Extracted "leaping" and "diving" as Players

## Problem

The advanced stats page on score.kcuda.org showed "leaping" and "diving" as players with goal totals. These are throw/play descriptors, not people.

## Investigation

- Confirmed via stats endpoint output: rows existed for player names `"leaping"` and `"diving"` with non-zero goal counts.
- `PlayerNameParser.THROW_DESCRIPTORS` already included `"diving"` and the blocklist (`NOT_A_PLAYER`) included `"Leaping"`. But the names appeared lowercase in the output — meaning they slipped past both filters.
- Read the active regex:

  ```ts
  // before
  static readonly ASSIST_PATTERN = new RegExp(
    `\\b([A-Z][a-z]+)\\s+(?:(?:${THROW_DESCRIPTOR_PATTERN})\\s+)?to\\s+([A-Z][a-z]+)\\b`,
    'i'  // ← the smoking gun
  );
  ```

- The `'i'` flag made `[A-Z][a-z]+` match case-insensitively, so it happily matched lowercase words. A message like `"Ellis to diving Cyrus"` parsed as scorer=`"diving"` (matching the `[A-Z][a-z]+` after `to`), with `"Cyrus"` ignored as trailing text. The descriptor blocklist checks against the *captured group*, which was `"diving"` lowercase — but the blocklist had `"Diving"` capitalized, so the comparison missed.

## Root Cause

Three compounding issues:

1. **`'i'` flag on a pattern whose whole point is case discrimination.** Player names are capitalized, descriptors are lowercase — the pattern was supposed to use that distinction to tell them apart. Adding `'i'` defeats it.
2. **Descriptors only allowed *before* `to`.** The grammar `"<thrower> [descriptor] to <receiver>"` didn't cover `"<thrower> to [descriptor] <receiver>"`. When a descriptor sat between `to` and the receiver, it got captured as the receiver itself.
3. **`"leaping"` was missing from `THROW_DESCRIPTORS`.** Even after fixing the regex, a literal "leaping" wouldn't be skipped over to find the real receiver.

## Solution

```ts
// packages/bot/src/services/PlayerNameParser.ts
//
// Case-sensitive: descriptors are lowercase, player names are capitalized.
// Descriptors may appear before "to" (modifying the thrower) or after "to"
// (modifying the receiver), e.g. "Ellis to diving Cyrus".
static readonly ASSIST_PATTERN = new RegExp(
  `\\b([A-Z][a-z]+)\\s+(?:(?:${THROW_DESCRIPTOR_PATTERN})\\s+)?to\\s+(?:(?:${THROW_DESCRIPTOR_PATTERN})\\s+)?([A-Z][a-z]+)\\b`,
  // no 'i' flag — case matters
);
```

Three changes:
- Removed the `'i'` flag.
- Added an optional descriptor group after `to`.
- Added `"leaping"` to `THROW_DESCRIPTORS`.

Test cases added (`PlayerNameParser.test.ts`) covering: descriptor on either side of `to`, and ensuring lowercase words alone never get captured as players.

## Prevention

- **Default to case-sensitive regex when capitalization carries semantic meaning.** If a pattern uses `[A-Z][a-z]+` to distinguish "name" from "word", the `'i'` flag breaks that distinction. The safe rule: never apply `'i'` to a pattern that has explicit case-class character ranges.
- **When adding a `to`-style join in a natural-language grammar, mirror the optional groups on both sides.** Whatever modifiers attach to the left of the join probably attach to the right too.
- **Maintain `THROW_DESCRIPTORS` and the `NOT_A_PLAYER` blocklist together.** Anything added to one should be considered for the other. The blocklist is the second line of defense; if the parser bypasses it (e.g. via case mismatch), descriptors leak into stats.
- See also: `memory/feedback_stats_no_descriptors.md` — Graham flagged this class of error explicitly. Throw/play descriptors must never appear in stats.
