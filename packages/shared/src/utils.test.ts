import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateId,
  calculateScoreFromEvents,
  formatScore,
  parseScore,
  formatTime,
  getGameDuration,
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
