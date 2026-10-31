import { describe, expect, it } from 'vitest';
import { inferGamePhases } from '../src/phases.js';
import type { CanonicalDataset, RankingGame } from '../src/model.js';

let n = 0;
function game(a: string, b: string, date: string, eventId = 'ev'): RankingGame {
  n++;
  return {
    id: `legacy-${String(n).padStart(5, '0')}`, season: 's', division: 'boys',
    teamAId: a, teamBId: b, scoreA: 13, scoreB: 9, status: 'final', date, eventId,
  };
}
function dataset(games: RankingGame[], league = false): CanonicalDataset {
  return { season: 's', division: 'boys', teams: [], games, events: { ev: { id: 'ev', name: 'Ev', league } } };
}
const roundRobin = (teams: string[], date: string) =>
  teams.flatMap((a, i) => teams.slice(i + 1).map((b) => game(a, b, date)));

describe('inferGamePhases', () => {
  it('labels round-robin pools then bracket games', () => {
    const pools = [...roundRobin(['a', 'b', 'c'], '2026-10-03'), ...roundRobin(['d', 'e', 'f'], '2026-10-03')];
    const semi = game('a', 'e', '2026-10-04');
    const final = game('a', 'b', '2026-10-04'); // rematch of poolmates
    const phases = inferGamePhases(dataset([...pools, semi, final]));
    for (const g of pools) expect(phases.get(g.id)).toBe('pool');
    expect(phases.get(semi.id)).toBe('bracket');
    expect(phases.get(final.id)).toBe('bracket');
  });

  it('leaves events without a pool structure unlabeled', () => {
    const swiss = [game('a', 'b', '2026-10-03'), game('c', 'd', '2026-10-03'), game('a', 'c', '2026-10-04'), game('b', 'd', '2026-10-04')];
    expect(inferGamePhases(dataset(swiss)).size).toBe(0);
  });

  it('gives up when a bracket game precedes pool play', () => {
    const early = game('a', 'd', '2026-10-03');
    const pools = [...roundRobin(['a', 'b', 'c'], '2026-10-04'), ...roundRobin(['d', 'e', 'f'], '2026-10-04')];
    expect(inferGamePhases(dataset([early, ...pools])).size).toBe(0);
  });

  it('skips leagues', () => {
    expect(inferGamePhases(dataset(roundRobin(['a', 'b', 'c'], '2026-10-03'), true)).size).toBe(0);
  });
});
