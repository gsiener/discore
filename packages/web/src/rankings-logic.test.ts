import { describe, expect, it } from 'vitest';
import {
  buildTournamentSummaries,
  filterTeams,
  regionAbbrev,
  regionSeed,
  sortTeams,
  sortTeamsAlpha,
  sparkColor,
  sparkPoints,
  statusLabel,
  type RankRow,
} from './rankings-logic.js';
import type { CanonicalDataset } from '@scorebot/rankings';

const rows: RankRow[] = [
  { id: 'a', name: 'Albany Cougars', rank: 1, rating: 2100, qualified: true, region: 'Northeast', gamesPlayed: 8 },
  { id: 'b', name: 'Lincoln Lynx', rank: 2, rating: 1900, qualified: true, region: 'Midwest', gamesPlayed: 7 },
  { id: 'c', name: 'League Only FC', rank: 3, rating: 1500, qualified: false, region: 'South', gamesPlayed: 5 },
  { id: 'd', name: 'Eastside Prep', rank: 4, rating: 1950, qualified: true, region: 'Northeast', gamesPlayed: 6 },
];

describe('filterTeams', () => {
  it('matches query case-insensitively against name', () => {
    expect(filterTeams(rows, { query: 'lynx', region: 'all', hideProvisional: false }).map((r) => r.id)).toEqual(['b']);
    expect(filterTeams(rows, { query: 'ALBANY', region: 'all', hideProvisional: false }).map((r) => r.id)).toEqual(['a']);
  });
  it('filters by region', () => {
    expect(filterTeams(rows, { query: '', region: 'Northeast', hideProvisional: false }).map((r) => r.id)).toEqual(['a', 'd']);
  });
  it('hideProvisional drops unqualified teams', () => {
    expect(filterTeams(rows, { query: '', region: 'all', hideProvisional: true }).map((r) => r.id)).toEqual(['a', 'b', 'd']);
  });
  it('combines all three filters', () => {
    expect(filterTeams(rows, { query: 'east', region: 'Northeast', hideProvisional: true }).map((r) => r.id)).toEqual(['d']);
  });
});

describe('sortTeams', () => {
  it('sorts by rank ascending then descending', () => {
    const shuffled = [rows[2], rows[0], rows[3], rows[1]];
    expect(sortTeams(shuffled, 'asc').map((r) => r.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(sortTeams(shuffled, 'desc').map((r) => r.id)).toEqual(['d', 'c', 'b', 'a']);
  });
  it('puts unranked (null rank) last when ascending', () => {
    const withNull: RankRow[] = [...rows, { id: 'jv', name: 'Albany JV', rank: null, rating: 1200, qualified: false, region: 'Northeast', gamesPlayed: 4 }];
    expect(sortTeams(withNull, 'asc').at(-1)!.id).toBe('jv');
  });
});

describe('regionAbbrev', () => {
  it('uses initials for multi-word regions, first two letters otherwise', () => {
    expect(regionAbbrev('Southwest')).toBe('SW');
    expect(regionAbbrev('Northeast')).toBe('NE');
    expect(regionAbbrev('North Central')).toBe('NC');
    expect(regionAbbrev('Great Lakes')).toBe('GL');
    expect(regionAbbrev('Midwest')).toBe('MW');
  });
});

describe('regionSeed', () => {
  it('numbers teams within their region by rating order', () => {
    expect(regionSeed(rows, 'a')).toBe(1);
    expect(regionSeed(rows, 'd')).toBe(2);
    expect(regionSeed(rows, 'b')).toBe(1);
  });
});

describe('sortTeamsAlpha', () => {
  it('sorts case-insensitively by name', () => {
    const shuffled = [rows[2], rows[0], rows[3], rows[1]];
    expect(sortTeamsAlpha(shuffled).map((r) => r.id)).toEqual(['a', 'd', 'c', 'b']);
  });
});

describe('buildTournamentSummaries', () => {
  const dataset: CanonicalDataset = {
    season: '2025-26',
    division: 'boys',
    teams: [
      { id: 'a', displayName: 'Alpha', season: '2025-26', division: 'boys' },
      { id: 'b', displayName: 'Beta', season: '2025-26', division: 'boys' },
      { id: 'c', displayName: 'Gamma', season: '2025-26', division: 'boys' },
    ],
    events: {
      e1: { id: 'e1', name: 'Seattle Invite', league: false, sourceUrl: 'https://example.com/s' },
      e2: { id: 'e2', name: 'Fall League', league: true },
    },
    games: [
      { id: 'g1', season: '2025-26', division: 'boys', teamAId: 'a', teamBId: 'b', scoreA: 13, scoreB: 11, status: 'final', date: '2025-10-04', eventId: 'e1' },
      { id: 'g2', season: '2025-26', division: 'boys', teamAId: 'b', teamBId: 'c', scoreA: 13, scoreB: 12, status: 'final', date: '2025-10-05', eventId: 'e1' },
      { id: 'g3', season: '2025-26', division: 'boys', teamAId: 'a', teamBId: 'c', scoreA: 10, scoreB: 8, status: 'final', date: '2025-10-06', eventId: 'e2' },
    ],
  };

  it('summarizes games, teams, dates, and league flags per event', () => {
    const out = buildTournamentSummaries(dataset);
    expect(out).toHaveLength(2);
    const seattle = out.find((e) => e.id === 'e1')!;
    expect(seattle.games).toBe(2);
    expect(seattle.teams).toBe(3);
    expect(seattle.from).toBe('2025-10-04');
    expect(seattle.to).toBe('2025-10-05');
    expect(seattle.league).toBe(false);
    expect(seattle.url).toBe('https://example.com/s');
    const league = out.find((e) => e.id === 'e2')!;
    expect(league.league).toBe(true);
    expect(league.games).toBe(1);
  });

  it('orders by game count descending', () => {
    expect(buildTournamentSummaries(dataset)[0].id).toBe('e1');
  });

  it('ignores games without an event', () => {
    const d = { ...dataset, games: [...dataset.games, { ...dataset.games[0], id: 'gx', eventId: null }] };
    expect(buildTournamentSummaries(d)).toHaveLength(2);
  });
});

describe('statusLabel', () => {
  it('Ranked vs Provisional', () => {
    expect(statusLabel(rows[0])).toBe('Ranked');
    expect(statusLabel(rows[2])).toBe('Provisional');
  });
});

describe('sparkline', () => {
  it('maps effects to svg coordinates', () => {
    const pts = sparkPoints([10, -20, 5], 60, 20);
    expect(pts.split(' ')).toHaveLength(3);
    const [, yMin] = pts.split(' ')[1].split(',').map(Number);
    expect(yMin).toBeCloseTo(20, 5); // most negative effect sits at the bottom
  });
  it('returns empty for no data and colors by first-to-last direction', () => {
    expect(sparkPoints([], 60, 20)).toBe('');
    expect(sparkColor([1, 2, 5])).toBe('up');
    expect(sparkColor([5, 2, 1])).toBe('down');
    expect(sparkColor([3, 3])).toBe('flat');
  });
});
