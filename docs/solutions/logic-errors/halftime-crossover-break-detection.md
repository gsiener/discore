---
problem_id: break-detection-halftime-crossover
component: packages/web/src/components/breakDetection.ts
function: isBreakScore
problem_type: logic_error
severity: medium
date_fixed: 2026-03-22
symptoms:
  - First goal after halftime incorrectly labeled as break instead of hold
  - Halftime offense/defense crossover logic was fundamentally flawed
  - Bug only manifests when the team that started on offense also scored last before halftime
tags:
  - halftime-logic
  - offense-defense-tracking
  - ultimate-frisbee-rules
  - break-detection
related:
  - docs/solutions/logic-errors/scorebot-multi-fix-parser-state-routing.md
  - commits: ad2fdd9, b4f00a2
---

# Halftime Crossover Break Detection Bug

## Problem

The `isBreakScore()` function in `breakDetection.ts` incorrectly labeled the first goal after halftime as a "break" when it should have been a "hold" (and vice versa in certain cases).

**Observed in:** Haverford HUDA game. HUDA scored 7-6 as the first point after halftime. Tech started on offense, so HUDA receives to start the second half (on offense). HUDA scoring while on offense = hold. But the UI showed "break."

## Root Cause

The function used alternation from the previous goal to determine who's on offense after halftime, then inverted it:

```typescript
// BUGGY
const sameTeam = prevEvent.team === event.team;
return crossedHalftime ? !sameTeam : sameTeam;
```

This is wrong because **after halftime in ultimate frisbee, who receives is determined by `startingOnOffense` (the team that received first now pulls), NOT by who scored last.**

The formula `crossedHalftime ? !sameTeam : sameTeam` applies a blanket inversion at halftime. But halftime doesn't always flip who receives relative to the alternation pattern — it depends on who scored last. Specifically:

- If Tech (us) scored last before half AND started on O: without halftime, HUDA receives (scoring team pulls). With halftime, HUDA also receives (team that received first now pulls). **Same result — halftime changes nothing.** But the code inverted anyway.

The bug only manifests when the team that started on offense also scored the last goal before halftime — a common scenario (holding through the half).

## Two-Bug History

This is the second fix to `isBreakScore()`. The first (commit `ad2fdd9`, documented in `scorebot-multi-fix-parser-state-routing.md`) fixed:

1. **`eventIndex === 0` check failed** because the first goal isn't the first event — game_start and note events precede it. Fixed by moving first-goal handling to the loop fallthrough.
2. **Only handled `event.team === 'us'`** for the first goal, not opponent goals.

This second fix addresses the halftime crossover formula itself.

## Solution

After halftime, determine offense directly from `startingOnOffense` instead of alternation:

```typescript
// FIXED
if (crossedHalftime && game.startingOnOffense !== undefined && event.team) {
  // After halftime, the team that received first now pulls (switches to D).
  // Break = scoring team is the one that started on O (now on D after half).
  return (event.team === 'us') === game.startingOnOffense;
}
// Normal: same team scoring consecutively = break
const sameTeam = prevEvent.team === event.team;
return sameTeam;
```

**Why this works:** After halftime, the team that started on offense is now on defense. If they score, it's a break. The formula `(event.team === 'us') === game.startingOnOffense` directly encodes this:

| `startingOnOffense` | Scorer | Result | Why |
|---|---|---|---|
| `true` | us | break | We started on O, now on D after half |
| `true` | them | hold | They started on D, now on O after half |
| `false` | us | hold | We started on D, now on O after half |
| `false` | them | break | They started on O, now on D after half |

The previous goal before halftime is irrelevant — only `startingOnOffense` matters.

## Prevention

### Key Insight

**Who scored last before halftime is irrelevant to post-halftime offense.** This is the core domain rule. Any implementation that references the previous goal to determine post-halftime state is wrong by construction.

### Recommended Test Cases

Test all 8 combinations at the halftime boundary:

| `startingOnOffense` | Last scorer before half | First scorer after half | Expected |
|---|---|---|---|
| `true` | us | us | break |
| `true` | us | them | hold |
| `true` | them | us | break |
| `true` | them | them | hold |
| `false` | us | us | hold |
| `false` | us | them | break |
| `false` | them | us | hold |
| `false` | them | them | break |

**Critical property test:** For any given `startingOnOffense`, the result must be identical regardless of who scored last before halftime (rows 1=3, 2=4, 5=7, 6=8). This property directly encodes the domain rule and catches the entire class of alternation-based bugs.

### Best Practices

1. **Model domain rules explicitly.** If the rulebook says "after halftime, the team that received first now pulls," write code that says exactly that. Do not rely on a general mechanism that happens to usually agree.
2. **Be suspicious of clever code.** The alternation approach avoids branching by making one mechanism handle everything. This elegance hides bugs — explicit branches that mirror the rulebook are safer.
3. **Count your cases.** 8 combinations exist at the halftime boundary. If your test suite has fewer, you have gaps.
