/**
 * Point Ledger — the single derived, per-point account of a game.
 *
 * One forward pass over game.events produces one Point per goal. All break/hold,
 * line (O/D), and forced-turn questions are answered from this ledger; the three
 * former algorithms (calculateLineStats, isBreakScore, findHalftimePointIndex)
 * are now folds/lookups over it.
 *
 * Possession model (identical to the old calculateLineStats):
 *   - `weHavePossession` is seeded from game.startingOnOffense.
 *   - At HALFTIME the team that received first now pulls, so it resets to
 *     `!startingOnOffense`.
 *   - After each goal possession goes to the non-scoring team.
 *
 * When startingOnOffense is undefined we cannot seed possession, so the first
 * point of the game is ambiguous: its result is guessed as a hold (inferred).
 * Crucially, halftime does NOT re-introduce ambiguity in the unseeded case —
 * possession is carried across the break — which reproduces the old
 * isBreakScore behaviour of comparing to the pre-halftime goal (consecutive
 * same-team scores = break). Inferred results are display-only and must never
 * feed efficiency stats.
 */

import { Game, GameEvent, Score, TeamSide, EventType } from './types.js';

export interface Point {
  /** 1-based; every goal ends exactly one point. */
  pointNumber: number;
  /** The goal event that ended this point. */
  goalEvent: GameEvent;
  scoringTeam: TeamSide;
  /** Relative to the scoring team: 'break' = they started the point on defense. */
  result: 'hold' | 'break';
  /** True when the result is a guess made without knowing starting possession. */
  inferred: boolean;
  /** Which of our lines played it — only known when startingOnOffense is set. */
  ourLine?: 'O' | 'D';
  /** A Tech-forced turn happened this point (logged block/steal, or a scored one). */
  forcedTurn: boolean;
  firstAfterHalftime: boolean;
  /** Running score after this point. */
  score: Score;
}

export interface PointLedger {
  points: Point[];
}

/** Match note messages like "Mason block", "Theo steal", "Mason foot block". */
const TECH_DEFENSIVE_NOTE_PATTERN = /^[A-Z][a-z]+\b.*\b(?:block|steal)\b/;

export function isTechDefensivePlayNote(message: string | undefined): boolean {
  if (!message) return false;
  return TECH_DEFENSIVE_NOTE_PATTERN.test(message);
}

export function buildPointLedger(game: Game): PointLedger {
  const points: Point[] = [];
  const seeded = game.startingOnOffense !== undefined;

  // Possession at the start of the current point. `undefined` means ambiguous —
  // only possible in an unseeded game before its first goal.
  let weHavePossession: boolean | undefined = game.startingOnOffense;
  let forcedTurnThisPoint = false;
  let pendingFirstAfterHalftime = false;
  const score: Score = { us: 0, them: 0 };

  for (const event of game.events) {
    if (event.type === EventType.HALFTIME) {
      // The team that received first now pulls. In the unseeded case we can't
      // name that team, so we deliberately leave possession as carried from the
      // last goal — this keeps the consecutive-scoring rule intact across the
      // break, matching the old isBreakScore.
      if (seeded) {
        weHavePossession = !game.startingOnOffense;
      }
      forcedTurnThisPoint = false;
      pendingFirstAfterHalftime = true;
      continue;
    }

    if (event.type === EventType.NOTE && isTechDefensivePlayNote(event.message)) {
      forcedTurnThisPoint = true;
      continue;
    }

    if (event.type !== EventType.GOAL) continue;

    const scoringTeam = event.team as TeamSide;
    const scoredByUs = event.team === TeamSide.US;

    // A goal with defensivePlay tagged is itself a Tech-forced turn that scored.
    const goalHadDefensivePlay = scoredByUs && !!event.defensivePlay;
    const forcedTurn = forcedTurnThisPoint || goalHadDefensivePlay;

    let result: 'hold' | 'break';
    let inferred: boolean;
    let ourLine: 'O' | 'D' | undefined;

    if (weHavePossession === undefined) {
      // Ambiguous first point of an unseeded game — guess a hold.
      result = 'hold';
      inferred = true;
    } else {
      // The team holding possession at point start is on offense; a break is
      // won by the team that started the point on defense.
      const scoringTeamStartedOnOffense = scoredByUs === weHavePossession;
      result = scoringTeamStartedOnOffense ? 'hold' : 'break';
      inferred = false;
      ourLine = weHavePossession ? 'O' : 'D';
    }

    if (scoringTeam) score[scoringTeam]++;

    points.push({
      pointNumber: points.length + 1,
      goalEvent: event,
      scoringTeam,
      result,
      inferred,
      ourLine,
      forcedTurn,
      firstAfterHalftime: pendingFirstAfterHalftime,
      score: { ...score },
    });

    // After each goal, possession switches to the team that didn't score.
    weHavePossession = event.team !== TeamSide.US;
    forcedTurnThisPoint = false;
    pendingFirstAfterHalftime = false;
  }

  return { points };
}
