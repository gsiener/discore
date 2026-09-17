import { describe, expect, it } from 'vitest';
import {
  computePoolStandings,
  orderAcrossPools,
  prefillScore,
  templatePairings,
} from '../src/tournaments.js';

describe('computePoolStandings', () => {
  it('orders by wins then head-to-head then diff then rating then seed', () => {
    const teams = [
      { id: 'A', rating: 1500, seed: 1 },
      { id: 'B', rating: 1600, seed: 2 },
      { id: 'C', rating: 1400, seed: 3 },
    ];
    const games = [
      { aId: 'A', bId: 'B', aScore: 13, bScore: 11, simulated: false },
      { aId: 'A', bId: 'C', aScore: 13, bScore: 10, simulated: false },
      { aId: 'B', bId: 'C', aScore: 13, bScore: 5, simulated: false },
    ];
    const s = computePoolStandings(teams, games);
    expect(s[0].teamId).toBe('A'); // 2-0
    expect(s[1].teamId).toBe('B'); // 1-1, better diff
  });
});

describe('orderAcrossPools', () => {
  it('all winners by rating, then runners-up', () => {
    const order = orderAcrossPools([
      [
        { teamId: 'A1', wins: 3, pointDiff: 10, rating: 1500, seed: 1 },
        { teamId: 'A2', wins: 2, pointDiff: 5, rating: 1400, seed: 2 },
      ],
      [
        { teamId: 'B1', wins: 3, pointDiff: 8, rating: 1600, seed: 1 },
        { teamId: 'B2', wins: 2, pointDiff: 6, rating: 1300, seed: 2 },
      ],
    ]);
    expect(order).toEqual(['B1', 'A1', 'A2', 'B2']);
  });
});

describe('templates + prefill', () => {
  it('two pools of 4 produce 12 games', () => {
    const seeds = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'];
    expect(templatePairings('two-pools-of-4', seeds)).toHaveLength(12);
  });
  it('prefill favors higher rating', () => {
    const p = prefillScore(2000, 1200); // gap 800 > cap: extrapolates past 15-7
    expect(p.aScore).toBe(15);
    expect(p.bScore).toBeLessThan(7);
  });
});
