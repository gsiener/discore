import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateId,
  calculateScoreFromEvents,
  formatScore,
  parseScore,
  formatTime,
  getGameDuration,
  calculateLineStats,
} from './utils.js';
import { GameEvent, EventType, TeamSide, Game, GameStatus } from './types.js';

describe('generateId', () => {
  it('should generate a unique ID without prefix', () => {
    const id1 = generateId();
    const id2 = generateId();

    expect(id1).toBeTruthy();
    expect(id2).toBeTruthy();
    expect(id1).not.toBe(id2);
  });

  it('should generate a unique ID with prefix', () => {
    const id = generateId('game');

    expect(id).toMatch(/^game_/);
    expect(id.split('_')).toHaveLength(3);
  });

  it('should generate different IDs even with same prefix', () => {
    const id1 = generateId('event');
    const id2 = generateId('event');

    expect(id1).not.toBe(id2);
  });
});

describe('calculateScoreFromEvents', () => {
  it('should return 0-0 for empty events', () => {
    const score = calculateScoreFromEvents([]);

    expect(score).toEqual({ us: 0, them: 0 });
  });

  it('should count goals for us', () => {
    const events: GameEvent[] = [
      {
        id: '1',
        gameId: 'game1',
        type: EventType.GOAL,
        team: TeamSide.US,
        timestamp: Date.now(),
        score: { us: 1, them: 0 },
      },
      {
        id: '2',
        gameId: 'game1',
        type: EventType.GOAL,
        team: TeamSide.US,
        timestamp: Date.now(),
        score: { us: 2, them: 0 },
      },
    ];

    const score = calculateScoreFromEvents(events);

    expect(score).toEqual({ us: 2, them: 0 });
  });

  it('should count goals for them', () => {
    const events: GameEvent[] = [
      {
        id: '1',
        gameId: 'game1',
        type: EventType.GOAL,
        team: TeamSide.THEM,
        timestamp: Date.now(),
        score: { us: 0, them: 1 },
      },
    ];

    const score = calculateScoreFromEvents(events);

    expect(score).toEqual({ us: 0, them: 1 });
  });

  it('should count goals for both teams', () => {
    const events: GameEvent[] = [
      {
        id: '1',
        gameId: 'game1',
        type: EventType.GOAL,
        team: TeamSide.US,
        timestamp: Date.now(),
        score: { us: 1, them: 0 },
      },
      {
        id: '2',
        gameId: 'game1',
        type: EventType.GOAL,
        team: TeamSide.THEM,
        timestamp: Date.now(),
        score: { us: 1, them: 1 },
      },
      {
        id: '3',
        gameId: 'game1',
        type: EventType.GOAL,
        team: TeamSide.US,
        timestamp: Date.now(),
        score: { us: 2, them: 1 },
      },
    ];

    const score = calculateScoreFromEvents(events);

    expect(score).toEqual({ us: 2, them: 1 });
  });

  it('should ignore non-goal events', () => {
    const events: GameEvent[] = [
      {
        id: '1',
        gameId: 'game1',
        type: EventType.GOAL,
        team: TeamSide.US,
        timestamp: Date.now(),
        score: { us: 1, them: 0 },
      },
      {
        id: '2',
        gameId: 'game1',
        type: EventType.HALFTIME,
        timestamp: Date.now(),
        score: { us: 1, them: 0 },
      },
      {
        id: '3',
        gameId: 'game1',
        type: EventType.TIMEOUT,
        team: TeamSide.US,
        timestamp: Date.now(),
        score: { us: 1, them: 0 },
      },
    ];

    const score = calculateScoreFromEvents(events);

    expect(score).toEqual({ us: 1, them: 0 });
  });

  it('should ignore goal events without team', () => {
    const events: GameEvent[] = [
      {
        id: '1',
        gameId: 'game1',
        type: EventType.GOAL,
        timestamp: Date.now(),
        score: { us: 0, them: 0 },
      },
    ];

    const score = calculateScoreFromEvents(events);

    expect(score).toEqual({ us: 0, them: 0 });
  });
});

describe('formatScore', () => {
  it('should format score with dash separator', () => {
    expect(formatScore({ us: 5, them: 3 })).toBe('5-3');
  });

  it('should format score 0-0', () => {
    expect(formatScore({ us: 0, them: 0 })).toBe('0-0');
  });

  it('should format score with double digits', () => {
    expect(formatScore({ us: 15, them: 12 })).toBe('15-12');
  });
});

describe('parseScore', () => {
  it('should parse score with dash', () => {
    expect(parseScore('5-3')).toEqual({ us: 5, them: 3 });
  });

  it('should parse score with spaces around dash', () => {
    expect(parseScore('5 - 3')).toEqual({ us: 5, them: 3 });
  });

  it('should parse score with colon', () => {
    expect(parseScore('5:3')).toEqual({ us: 5, them: 3 });
  });

  it('should parse score with "to"', () => {
    expect(parseScore('5 to 3')).toEqual({ us: 5, them: 3 });
    expect(parseScore('5 TO 3')).toEqual({ us: 5, them: 3 });
  });

  it('should parse double digit scores', () => {
    expect(parseScore('15-12')).toEqual({ us: 15, them: 12 });
  });

  it('should return null for invalid format', () => {
    expect(parseScore('five-three')).toBeNull();
    expect(parseScore('not a score')).toBeNull();
    expect(parseScore('')).toBeNull();
  });

  it('should handle score in context', () => {
    expect(parseScore('The score is 5-3 now')).toEqual({ us: 5, them: 3 });
    expect(parseScore('We won 15-12!')).toEqual({ us: 15, them: 12 });
  });
});

describe('formatTime', () => {
  it('should format timestamp as time', () => {
    const timestamp = new Date('2024-01-15T14:30:00').getTime();
    const formatted = formatTime(timestamp);

    // Time format will vary by locale, but should contain time components
    expect(formatted).toMatch(/\d+:\d+/);
  });

  it('should format midnight', () => {
    const timestamp = new Date('2024-01-15T00:00:00').getTime();
    const formatted = formatTime(timestamp);

    expect(formatted).toMatch(/\d+:\d+/);
  });
});

describe('getGameDuration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('should return null if game not started', () => {
    const game: Game = {
      id: 'game1',
      status: GameStatus.NOT_STARTED,
      teams: {
        us: { name: 'Team A', side: TeamSide.US },
        them: { name: 'Team B', side: TeamSide.THEM },
      },
      score: { us: 0, them: 0 },
      events: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    expect(getGameDuration(game)).toBeNull();
  });

  it('should calculate duration for finished game', () => {
    const startTime = Date.now();
    const endTime = startTime + 60 * 60 * 1000; // 60 minutes later

    const game: Game = {
      id: 'game1',
      status: GameStatus.FINISHED,
      teams: {
        us: { name: 'Team A', side: TeamSide.US },
        them: { name: 'Team B', side: TeamSide.THEM },
      },
      score: { us: 15, them: 12 },
      events: [],
      startedAt: startTime,
      finishedAt: endTime,
      createdAt: startTime,
      updatedAt: endTime,
    };

    expect(getGameDuration(game)).toBe(60);
  });

  it('should calculate duration for ongoing game using current time', () => {
    const startTime = Date.now();
    vi.setSystemTime(startTime + 30 * 60 * 1000); // 30 minutes later

    const game: Game = {
      id: 'game1',
      status: GameStatus.FIRST_HALF,
      teams: {
        us: { name: 'Team A', side: TeamSide.US },
        them: { name: 'Team B', side: TeamSide.THEM },
      },
      score: { us: 5, them: 3 },
      events: [],
      startedAt: startTime,
      createdAt: startTime,
      updatedAt: Date.now(),
    };

    expect(getGameDuration(game)).toBe(30);
  });

  it('should floor fractional minutes', () => {
    const startTime = Date.now();
    const endTime = startTime + 90 * 1000; // 1.5 minutes later

    const game: Game = {
      id: 'game1',
      status: GameStatus.FINISHED,
      teams: {
        us: { name: 'Team A', side: TeamSide.US },
        them: { name: 'Team B', side: TeamSide.THEM },
      },
      score: { us: 1, them: 0 },
      events: [],
      startedAt: startTime,
      finishedAt: endTime,
      createdAt: startTime,
      updatedAt: endTime,
    };

    expect(getGameDuration(game)).toBe(1);
  });
});

describe('calculateLineStats', () => {
  const createGame = (startingOnOffense: boolean | undefined, goalSequence: TeamSide[]): Game => {
    const events: GameEvent[] = goalSequence.map((team, index) => ({
      id: `event_${index}`,
      gameId: 'game1',
      type: EventType.GOAL,
      team,
      timestamp: Date.now() + index * 1000,
      score: { us: 0, them: 0 }, // Score doesn't matter for line stats
    }));

    return {
      id: 'game1',
      status: GameStatus.FINISHED,
      teams: {
        us: { name: 'Team A', side: TeamSide.US },
        them: { name: 'Team B', side: TeamSide.THEM },
      },
      score: { us: 0, them: 0 },
      events,
      startingOnOffense,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  };

  it('should return null if startingOnOffense is undefined', () => {
    const game = createGame(undefined, [TeamSide.US, TeamSide.THEM]);
    expect(calculateLineStats(game)).toBeNull();
  });

  it('should return zero stats for game with no goals', () => {
    const game = createGame(true, []);
    const stats = calculateLineStats(game);

    expect(stats).toEqual({
      oLinePoints: 0,
      oLineHolds: 0,
      oLineHoldPercentage: 0,
      dLinePoints: 0,
      dLineBreaks: 0,
      dLineBreakPercentage: 0,
    });
  });

  it('should calculate perfect O-line performance (starting on offense)', () => {
    // We start on offense and score, they get it and score, we get it and score
    const game = createGame(true, [
      TeamSide.US,   // Point 1: We start O, we score = hold
      TeamSide.THEM, // Point 2: They start O, they score = their hold (our D failed)
      TeamSide.US,   // Point 3: We start O, we score = hold
    ]);
    const stats = calculateLineStats(game);

    expect(stats).toEqual({
      oLinePoints: 2,
      oLineHolds: 2,
      oLineHoldPercentage: 100,
      dLinePoints: 1,
      dLineBreaks: 0,
      dLineBreakPercentage: 0,
    });
  });

  it('should calculate perfect D-line performance (starting on defense)', () => {
    // We start on defense and score (break)
    // After we score, we pull to them (they're on O, we're on D)
    // They score (hold against our D), then they pull to us (we're on O)
    // We score (O-line hold)
    const game = createGame(false, [
      TeamSide.US,   // Point 1: We're on D, we score = break
      TeamSide.THEM, // Point 2: We're on D, they score = they held
      TeamSide.US,   // Point 3: We're on O, we score = hold
    ]);
    const stats = calculateLineStats(game);

    expect(stats).toEqual({
      oLinePoints: 1,
      oLineHolds: 1,
      oLineHoldPercentage: 100,
      dLinePoints: 2,
      dLineBreaks: 1,
      dLineBreakPercentage: 50,
    });
  });

  it('should calculate mixed performance starting on offense', () => {
    // Sequence: we start O
    const game = createGame(true, [
      TeamSide.US,   // Point 1: O-line hold (1/1)
      TeamSide.US,   // Point 2: D-line break (1/1)
      TeamSide.THEM, // Point 3: D-line failed (1/2)
      TeamSide.US,   // Point 4: O-line hold (2/2)
      TeamSide.US,   // Point 5: D-line break (2/3)
    ]);
    const stats = calculateLineStats(game);

    expect(stats).toEqual({
      oLinePoints: 2,
      oLineHolds: 2,
      oLineHoldPercentage: 100, // 2/2 = 100%
      dLinePoints: 3,
      dLineBreaks: 2,
      dLineBreakPercentage: 67, // 2/3 = 66.67% rounds to 67%
    });
  });

  it('should calculate mixed performance starting on defense', () => {
    // Sequence: we start D
    const game = createGame(false, [
      TeamSide.US,   // Point 1: We're D, we score = break (D: 1/1)
      TeamSide.THEM, // Point 2: We're D, they score = fail (D: 1/2)
      TeamSide.US,   // Point 3: We're O, we score = hold (O: 1/1)
      TeamSide.THEM, // Point 4: We're D, they score = fail (D: 1/3)
      TeamSide.US,   // Point 5: We're O, we score = hold (O: 2/2)
    ]);
    const stats = calculateLineStats(game);

    expect(stats).toEqual({
      oLinePoints: 2,
      oLineHolds: 2,
      oLineHoldPercentage: 100, // 2/2 = 100%
      dLinePoints: 3,
      dLineBreaks: 1,
      dLineBreakPercentage: 33, // 1/3 = 33.33% rounds to 33%
    });
  });

  it('should handle realistic game scenario (13-3 blowout starting on O)', () => {
    // Brooklyn Tech vs Bergen Ultimate from real data
    // When you score, you pull to them (they receive, you're on D for next point)
    const game = createGame(true, [
      TeamSide.US,   // 1-0: We're O, we score (hold) -> they receive
      TeamSide.US,   // 2-0: We're D, we score (break) -> they receive
      TeamSide.THEM, // 2-1: We're D, they score -> we receive
      TeamSide.US,   // 3-1: We're O, we score (hold) -> they receive
      TeamSide.US,   // 4-1: We're D, we score (break) -> they receive
      TeamSide.US,   // 5-1: We're D, we score (break) -> they receive
      TeamSide.US,   // 6-1: We're D, we score (break) -> they receive
      TeamSide.US,   // 7-1: We're D, we score (break) -> they receive
      TeamSide.US,   // 8-1: We're D, we score (break) -> they receive
      TeamSide.US,   // 9-1: We're D, we score (break) -> they receive (halftime)
      TeamSide.THEM, // 9-2: We're D, they score -> we receive
      TeamSide.US,   // 10-2: We're O, we score (hold) -> they receive
      TeamSide.THEM, // 10-3: We're D, they score -> we receive
      TeamSide.US,   // 11-3: We're O, we score (hold) -> they receive
      TeamSide.US,   // 12-3: We're D, we score (break) -> they receive
      TeamSide.US,   // 13-3: We're D, we score (break) -> game over
    ]);
    const stats = calculateLineStats(game);

    // We played 4 O-line points and held all 4
    // We played 12 D-line points and broke 9 of them
    expect(stats?.oLinePoints).toBe(4);
    expect(stats?.oLineHolds).toBe(4);
    expect(stats?.oLineHoldPercentage).toBe(100);
    expect(stats?.dLinePoints).toBe(12);
    expect(stats?.dLineBreaks).toBe(9);
    expect(stats?.dLineBreakPercentage).toBe(75); // 9/12 = 75%
  });

  it('should handle close game with alternating scores', () => {
    const game = createGame(true, [
      TeamSide.US,   // 1-0: O-hold
      TeamSide.THEM, // 1-1: D-hold for them
      TeamSide.US,   // 2-1: O-hold
      TeamSide.THEM, // 2-2: D-hold for them
      TeamSide.US,   // 3-2: O-hold
      TeamSide.THEM, // 3-3: D-hold for them
    ]);
    const stats = calculateLineStats(game);

    // Perfect O-line holds (3/3), zero D-line breaks (0/3)
    expect(stats).toEqual({
      oLinePoints: 3,
      oLineHolds: 3,
      oLineHoldPercentage: 100,
      dLinePoints: 3,
      dLineBreaks: 0,
      dLineBreakPercentage: 0,
    });
  });

  it('should ignore non-goal events', () => {
    const game: Game = {
      id: 'game1',
      status: GameStatus.FINISHED,
      teams: {
        us: { name: 'Team A', side: TeamSide.US },
        them: { name: 'Team B', side: TeamSide.THEM },
      },
      score: { us: 2, them: 1 },
      events: [
        {
          id: 'event_0',
          gameId: 'game1',
          type: EventType.GAME_START,
          timestamp: Date.now(),
          score: { us: 0, them: 0 },
        },
        {
          id: 'event_1',
          gameId: 'game1',
          type: EventType.GOAL,
          team: TeamSide.US,
          timestamp: Date.now(),
          score: { us: 1, them: 0 },
        },
        {
          id: 'event_2',
          gameId: 'game1',
          type: EventType.TIMEOUT,
          team: TeamSide.US,
          timestamp: Date.now(),
          score: { us: 1, them: 0 },
        },
        {
          id: 'event_3',
          gameId: 'game1',
          type: EventType.HALFTIME,
          timestamp: Date.now(),
          score: { us: 1, them: 0 },
        },
        {
          id: 'event_4',
          gameId: 'game1',
          type: EventType.GOAL,
          team: TeamSide.THEM,
          timestamp: Date.now(),
          score: { us: 1, them: 1 },
        },
        {
          id: 'event_5',
          gameId: 'game1',
          type: EventType.GOAL,
          team: TeamSide.US,
          timestamp: Date.now(),
          score: { us: 2, them: 1 },
        },
      ],
      startingOnOffense: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const stats = calculateLineStats(game);

    // Should only count the 3 goal events
    expect(stats?.oLinePoints).toBe(2); // Points 1 and 3
    expect(stats?.oLineHolds).toBe(2);
    expect(stats?.dLinePoints).toBe(1); // Point 2
    expect(stats?.dLineBreaks).toBe(0);
  });

  it('should round percentages correctly', () => {
    // Test 1/3 = 33.33...% should round to 33%
    // Start on O: us(O-hold), them(D-fail), us(O-hold), them(D-fail), us(O-hold), them(D-fail), us(O-hold)
    // Need to get 1/3 for D-line: start on D and get 1 break out of 3 D-line points
    const game1 = createGame(false, [
      TeamSide.US,   // D-break
      TeamSide.THEM, // D-fail
      TeamSide.US,   // O-hold
      TeamSide.THEM, // D-fail
    ]);
    expect(calculateLineStats(game1)?.dLineBreakPercentage).toBe(33); // 1/3 = 33.33% rounds to 33%

    // Test 2/3 = 66.66...% should round to 67%
    const game2 = createGame(false, [
      TeamSide.US,   // D-break
      TeamSide.THEM, // D-fail
      TeamSide.US,   // O-hold
      TeamSide.US,   // D-break
    ]);
    expect(calculateLineStats(game2)?.dLineBreakPercentage).toBe(67); // 2/3 = 66.67% rounds to 67%
  });
});
