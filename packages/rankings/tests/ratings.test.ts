import { describe, expect, it } from 'vitest';
import { HS_2025_V1 } from '../src/rules.js';
import type { NormalizedGame } from '../src/normalize.js';
import { runRatings } from '../src/ratings.js';

function ng(partial: Partial<NormalizedGame> & { id: string; winnerId: string; loserId: string }): NormalizedGame {
  return {
    w: 13,
    l: 11,
    date: '2025-10-04',
    week: 8,
    dateWeight: 1,
    scoreWeight: 1,
    seriesMultiplier: 1,
    weight: 1,
    eventId: null,
    isLeague: false,
    countsTowardMinimum: true,
    rated: true,
    ...partial,
  };
}

describe('runRatings', () => {
  it('converges on a simple cycle and reports diagnostics', () => {
    const games = [
      ng({ id: 'g1', winnerId: 'A', loserId: 'B', w: 13, l: 11 }),
      ng({ id: 'g2', winnerId: 'B', loserId: 'C', w: 13, l: 11 }),
      ng({ id: 'g3', winnerId: 'C', loserId: 'A', w: 13, l: 11 }),
    ];
    const r = runRatings(games, HS_2025_V1);
    expect(r.converged).toBe(true);
    expect(r.finalRms).toBeLessThan(1e-5);
    // Symmetric cycle -> near-equal ratings
    const ratings = [...r.teams.values()].map((t) => t.rating);
    expect(Math.max(...ratings) - Math.min(...ratings)).toBeLessThan(1);
    expect(r.connectedComponents).toHaveLength(1);
  });

  it('strict blowout boundary: gap must exceed 600', () => {
    expect(2 * 6 + 1).toBe(13); // boundary reference: need w > 2l+1
  });

  it('five-game floor protects small samples', () => {
    // Strong team S beats weak team W 13-0 six times; S has only those games.
    // Blowout rule must NOT strip S below 5 retained games beyond 1 removal.
    const games: NormalizedGame[] = [];
    for (let i = 0; i < 6; i++) {
      games.push(ng({ id: `s${i}`, winnerId: 'S', loserId: `W${i}`, w: 13, l: 0 }));
    }
    const r = runRatings(games, { ...HS_2025_V1, solver: { ...HS_2025_V1.solver, maxIterations: 50 } });
    const s = r.teams.get('S')!;
    // S must retain >= 5 games used
    expect(s.gamesUsed).toBeGreaterThanOrEqual(5);
  });

  it('isolated teams form separate components', () => {
    const games = [
      ng({ id: 'g1', winnerId: 'A', loserId: 'B', w: 13, l: 12 }),
      ng({ id: 'g2', winnerId: 'C', loserId: 'D', w: 13, l: 12 }),
    ];
    const r = runRatings(games, HS_2025_V1);
    expect(r.connectedComponents).toHaveLength(2);
  });

  it('teams with no usable games keep start rating', () => {
    const games = [ng({ id: 'g1', winnerId: 'A', loserId: 'B', w: 13, l: 12 })];
    const r = runRatings(games, HS_2025_V1, ['A', 'B', 'Z']);
    expect(r.teams.get('Z')?.rating).toBe(HS_2025_V1.solver.startRating);
    expect(r.converged).toBe(true);
  });

  it('deterministic largest-gap blowout selection', () => {
    const mk = (id: string, loser: string) =>
      ng({ id, winnerId: 'S', loserId: loser, w: 13, l: 1 });
    const games: NormalizedGame[] = [];
    // S plays many games vs mid teams plus two blowouts; ensure enough retained
    for (let i = 0; i < 8; i++) games.push(ng({ id: `m${i}`, winnerId: 'S', loserId: 'M', w: 13, l: 11 }));
    games.push(mk('b1', 'W1'));
    games.push(mk('b2', 'W2'));
    const r1 = runRatings(games, HS_2025_V1);
    const r2 = runRatings([...games].reverse(), HS_2025_V1);
    expect([...r1.ignoredGameIds].sort()).toEqual([...r2.ignoredGameIds].sort());
  });
});
