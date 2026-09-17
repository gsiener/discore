import { describe, expect, it } from 'vitest';
import { normalizeGames, normalizeTeamName } from '../src/normalize.js';
import type { CanonicalDataset } from '../src/model.js';

const base: CanonicalDataset = {
  season: '2025-26',
  division: 'boys',
  teams: [],
  games: [],
  events: {},
};

describe('normalizeGames', () => {
  const opts = {
    weekOf: () => 5,
    lastRegularWeek: 14,
    seriesMultiplierOf: () => 1,
    isLeagueGame: () => false,
  };

  it('collapses duplicate reports sharing a game id', () => {
    const g = {
      id: 'g1', season: '2025-26', division: 'boys', teamAId: 'A', teamBId: 'B',
      scoreA: 13, scoreB: 11, status: 'final' as const, date: '2025-10-04',
    };
    const { games, diagnostics } = normalizeGames({ ...base, games: [g, { ...g }] }, opts);
    expect(games).toHaveLength(1);
    expect(diagnostics.duplicatesCollapsed).toEqual(['g1']);
  });

  it('keeps legitimate rematches with distinct ids', () => {
    const mk = (id: string) => ({
      id, season: '2025-26', division: 'boys', teamAId: 'A', teamBId: 'B',
      scoreA: 13, scoreB: 11, status: 'final' as const, date: '2025-10-04',
    });
    const { games } = normalizeGames({ ...base, games: [mk('g1'), mk('g2')] }, opts);
    expect(games).toHaveLength(2);
  });

  it('flags conflicting reports for the same id', () => {
    const g1 = {
      id: 'g1', season: '2025-26', division: 'boys', teamAId: 'A', teamBId: 'B',
      scoreA: 13, scoreB: 11, status: 'final' as const, date: '2025-10-04',
    };
    const g2 = { ...g1, scoreA: 13, scoreB: 10 };
    const { diagnostics } = normalizeGames({ ...base, games: [g1, g2] }, opts);
    expect(diagnostics.conflicts).toHaveLength(1);
  });

  it('excludes forfeits and non-final statuses', () => {
    const games = [
      { id: 'f1', season: '2025-26', division: 'boys', teamAId: 'A', teamBId: 'B', scoreA: null, scoreB: null, status: 'forfeit' as const, date: '2025-10-04' },
      { id: 's1', season: '2025-26', division: 'boys', teamAId: 'A', teamBId: 'B', scoreA: 13, scoreB: 11, status: 'scheduled' as const, date: '2025-10-04' },
    ];
    const { games: out } = normalizeGames({ ...base, games }, opts);
    expect(out.every((g) => !g.rated)).toBe(true);
  });

  it('orients winners and handles ties', () => {
    const games = [
      { id: 'g1', season: '2025-26', division: 'boys', teamAId: 'A', teamBId: 'B', scoreA: 10, scoreB: 13, status: 'final' as const, date: '2025-10-04' },
      { id: 'g2', season: '2025-26', division: 'boys', teamAId: 'A', teamBId: 'B', scoreA: 12, scoreB: 12, status: 'final' as const, date: '2025-10-04' },
    ];
    const { games: out } = normalizeGames({ ...base, games }, opts);
    expect(out[0].winnerId).toBe('B');
    expect(out[1].w).toBe(12);
    expect(out[1].l).toBe(12);
  });
});

describe('normalizeTeamName', () => {
  it('lowercases, strips Ultimate and punctuation', () => {
    expect(normalizeTeamName('Seattle Ultimate')).toBe('seattle');
    expect(normalizeTeamName("St. John's")).toBe('st johns');
  });
});
