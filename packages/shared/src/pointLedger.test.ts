import { describe, it, expect } from 'vitest';
import { buildPointLedger, isTechDefensivePlayNote } from './pointLedger.js';
import { calculateLineStats } from './utils.js';
import { Game, GameEvent, EventType, TeamSide, GameStatus } from './types.js';

type Entry =
  | { goal: TeamSide; defensivePlay?: 'block' | 'steal' }
  | { note: string }
  | { halftime: true };

const makeGame = (startingOnOffense: boolean | undefined, sequence: Entry[]): Game => {
  const events: GameEvent[] = sequence.map((entry, index) => {
    const base = {
      id: `event_${index}`,
      gameId: 'game1',
      timestamp: 1000 + index * 1000,
      score: { us: 0, them: 0 }, // ledger derives its own running score
    };
    if ('goal' in entry) {
      return {
        ...base,
        type: EventType.GOAL,
        team: entry.goal,
        ...(entry.defensivePlay ? { defensivePlay: entry.defensivePlay } : {}),
      };
    }
    if ('halftime' in entry) {
      return { ...base, type: EventType.HALFTIME };
    }
    return { ...base, type: EventType.NOTE, message: entry.note };
  });
  return {
    id: 'game1',
    status: GameStatus.FINISHED,
    teams: {
      us: { name: 'Tech', side: TeamSide.US },
      them: { name: 'Opp', side: TeamSide.THEM },
    },
    score: { us: 0, them: 0 },
    events,
    startingOnOffense,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
};

/**
 * Verbatim copy of the old web isBreakScore (deleted breakDetection.ts) so we
 * can assert the ledger reproduces its hold/break call exactly — the timeline
 * must not change one pixel.
 */
function legacyIsBreakScore(event: GameEvent, allEvents: GameEvent[], game: Game): boolean {
  const eventIndex = allEvents.findIndex(e => e.id === event.id);
  let crossedHalftime = false;
  for (let i = eventIndex - 1; i >= 0; i--) {
    const prevEvent = allEvents[i];
    if (prevEvent.type === EventType.HALFTIME) {
      crossedHalftime = true;
    }
    if (prevEvent.type === EventType.GOAL && prevEvent.team) {
      if (crossedHalftime && game.startingOnOffense !== undefined && event.team) {
        return (event.team === 'us') === game.startingOnOffense;
      }
      return prevEvent.team === event.team;
    }
  }
  if (game.startingOnOffense !== undefined && event.team) {
    const weOnOffense = crossedHalftime ? !game.startingOnOffense : game.startingOnOffense;
    return event.team === 'us' ? !weOnOffense : weOnOffense;
  }
  return false;
}

describe('buildPointLedger — seeded games', () => {
  it('assigns definite holds and breaks for both teams', () => {
    // Start on offense: US hold, US break, THEM hold (our D), US hold
    const game = makeGame(true, [
      { goal: TeamSide.US },
      { goal: TeamSide.US },
      { goal: TeamSide.THEM },
      { goal: TeamSide.US },
    ]);
    const { points } = buildPointLedger(game);

    expect(points.map(p => p.result)).toEqual(['hold', 'break', 'hold', 'hold']);
    expect(points.map(p => p.ourLine)).toEqual(['O', 'D', 'D', 'O']);
    expect(points.map(p => p.scoringTeam)).toEqual([
      TeamSide.US, TeamSide.US, TeamSide.THEM, TeamSide.US,
    ]);
    expect(points.every(p => p.inferred === false)).toBe(true);
    expect(points.map(p => p.score)).toEqual([
      { us: 1, them: 0 },
      { us: 2, them: 0 },
      { us: 2, them: 1 },
      { us: 3, them: 1 },
    ]);
  });

  it('reflects the possession flip at halftime', () => {
    // Start on O. First half we hold. After half we pull, so we're on D and a
    // US goal is a break.
    const game = makeGame(true, [
      { goal: TeamSide.US },
      { halftime: true },
      { goal: TeamSide.US },
    ]);
    const { points } = buildPointLedger(game);

    expect(points[0]).toMatchObject({ result: 'hold', ourLine: 'O', firstAfterHalftime: false });
    expect(points[1]).toMatchObject({ result: 'break', ourLine: 'D', firstAfterHalftime: true });
    expect(points.filter(p => p.firstAfterHalftime)).toHaveLength(1);
  });

  it('flags a dirty hold: O-line forces a turn then scores', () => {
    const game = makeGame(true, [
      { note: 'Mason block' },
      { goal: TeamSide.US },
    ]);
    const point = buildPointLedger(game).points[0];
    expect(point).toMatchObject({ result: 'hold', ourLine: 'O', forcedTurn: true });

    const stats = calculateLineStats(game);
    expect(stats?.oLineHolds).toBe(1);
    expect(stats?.oLineDirtyHolds).toBe(1);
  });

  it('flags a failed conversion: D-line forces a turn but concedes', () => {
    const game = makeGame(false, [
      { note: 'Theo steal' },
      { goal: TeamSide.THEM },
    ]);
    const point = buildPointLedger(game).points[0];
    expect(point).toMatchObject({ result: 'hold', ourLine: 'D', forcedTurn: true, scoringTeam: TeamSide.THEM });

    const stats = calculateLineStats(game);
    expect(stats?.dLineBreaks).toBe(0);
    expect(stats?.dLineFailedConversions).toBe(1);
  });

  it('treats a goal tagged with a defensivePlay as a forced turn (D-line break)', () => {
    const game = makeGame(false, [
      { goal: TeamSide.US, defensivePlay: 'block' },
    ]);
    const point = buildPointLedger(game).points[0];
    expect(point).toMatchObject({ result: 'break', ourLine: 'D', forcedTurn: true });

    const stats = calculateLineStats(game);
    expect(stats?.dLineBreaks).toBe(1);
    expect(stats?.dLineFailedConversions).toBe(0);
  });
});

describe('buildPointLedger — unseeded games (reproduces legacy isBreakScore)', () => {
  it('guesses the first point of the game as an inferred hold', () => {
    const game = makeGame(undefined, [{ goal: TeamSide.US }]);
    const point = buildPointLedger(game).points[0];
    expect(point).toMatchObject({ result: 'hold', inferred: true });
    expect(point.ourLine).toBeUndefined();
  });

  it('calls consecutive same-team scores a break', () => {
    const game = makeGame(undefined, [{ goal: TeamSide.US }, { goal: TeamSide.US }]);
    const { points } = buildPointLedger(game);
    expect(points[0]).toMatchObject({ result: 'hold', inferred: true });
    expect(points[1]).toMatchObject({ result: 'break', inferred: false });
  });

  it('calls alternating scores a hold', () => {
    const game = makeGame(undefined, [{ goal: TeamSide.US }, { goal: TeamSide.THEM }]);
    const { points } = buildPointLedger(game);
    expect(points[1]).toMatchObject({ result: 'hold', inferred: false });
  });

  it('carries the consecutive-scoring rule across halftime (crossed-halftime fallthrough)', () => {
    // THEM scored just before half and again just after → break (same team),
    // NOT a fresh inferred hold. This matches the legacy fallthrough branch.
    const game = makeGame(undefined, [
      { goal: TeamSide.US },
      { goal: TeamSide.THEM },
      { halftime: true },
      { goal: TeamSide.THEM },
    ]);
    const afterHalf = buildPointLedger(game).points[2];
    expect(afterHalf).toMatchObject({ result: 'break', inferred: false, firstAfterHalftime: true });

    // Different team after half → hold.
    const game2 = makeGame(undefined, [
      { goal: TeamSide.US },
      { goal: TeamSide.THEM },
      { halftime: true },
      { goal: TeamSide.US },
    ]);
    expect(buildPointLedger(game2).points[2]).toMatchObject({ result: 'hold', inferred: false });
  });

  it('leaves inferred results out of efficiency stats', () => {
    const game = makeGame(undefined, [{ goal: TeamSide.US }, { goal: TeamSide.US }]);
    // Ledger still produces display points...
    expect(buildPointLedger(game).points).toHaveLength(2);
    // ...but efficiency stats refuse to use them.
    expect(calculateLineStats(game)).toBeNull();
  });
});

describe('buildPointLedger — legacy isBreakScore parity', () => {
  const sequences: Array<{ soo: boolean | undefined; seq: Entry[] }> = [
    { soo: true, seq: [{ goal: TeamSide.US }, { goal: TeamSide.US }, { goal: TeamSide.THEM }, { goal: TeamSide.US }] },
    { soo: false, seq: [{ goal: TeamSide.US }, { goal: TeamSide.THEM }, { goal: TeamSide.US }, { goal: TeamSide.THEM }] },
    { soo: true, seq: [{ goal: TeamSide.US }, { halftime: true }, { goal: TeamSide.THEM }, { goal: TeamSide.US }] },
    { soo: false, seq: [{ goal: TeamSide.THEM }, { halftime: true }, { goal: TeamSide.US }, { goal: TeamSide.US }] },
    { soo: undefined, seq: [{ goal: TeamSide.US }, { goal: TeamSide.US }, { goal: TeamSide.THEM }, { goal: TeamSide.THEM }] },
    { soo: undefined, seq: [{ goal: TeamSide.THEM }, { goal: TeamSide.US }, { halftime: true }, { goal: TeamSide.US }, { goal: TeamSide.THEM }] },
    { soo: undefined, seq: [{ halftime: true }, { goal: TeamSide.US }, { goal: TeamSide.THEM }] },
  ];

  it('matches legacy break/hold for every goal in every scenario', () => {
    for (const { soo, seq } of sequences) {
      const game = makeGame(soo, seq);
      const { points } = buildPointLedger(game);
      for (const point of points) {
        const legacyBreak = legacyIsBreakScore(point.goalEvent, game.events, game);
        expect(point.result === 'break').toBe(legacyBreak);
      }
    }
  });
});
