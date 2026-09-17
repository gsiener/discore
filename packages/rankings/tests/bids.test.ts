import { describe, expect, it } from 'vitest';
import { allocateBids, bidProbabilities } from '../src/bids.js';

describe('allocateBids', () => {
  it('one auto per region then strength bids down ranking', () => {
    const teams = [
      { id: 'a', region: 'NW', rating: 2000 },
      { id: 'b', region: 'NE', rating: 1900 },
      { id: 'c', region: 'NW', rating: 1800 },
      { id: 'd', region: 'NE', rating: 1700 },
    ];
    const bids = allocateBids(teams, 3, ['NW', 'NE']);
    expect(bids).toEqual({ NW: 2, NE: 1 });
  });

  it('respects maxPerRegion', () => {
    const teams = [
      { id: 'a', region: 'NW', rating: 2000 },
      { id: 'b', region: 'NW', rating: 1900 },
      { id: 'c', region: 'NW', rating: 1800 },
      { id: 'd', region: 'NE', rating: 100 },
    ];
    const bids = allocateBids(teams, 3, ['NW', 'NE'], 1);
    expect(bids.NW).toBe(1);
  });
});

describe('bidProbabilities', () => {
  it('seeded runs are deterministic and sum correctly', () => {
    const teams = [
      { id: 'a', region: 'NW', rating: 2000, confidence: 'high' as const, stdDev: 5 },
      { id: 'b', region: 'NE', rating: 1900, confidence: 'high' as const, stdDev: 5 },
      { id: 'c', region: 'NW', rating: 1800, confidence: 'low' as const, stdDev: 50 },
    ];
    const r1 = bidProbabilities(teams, 2, ['NW', 'NE'], { runs: 200, seed: 42 });
    const r2 = bidProbabilities(teams, 2, ['NW', 'NE'], { runs: 200, seed: 42 });
    expect(r1).toEqual(r2);
    for (const region of ['NW', 'NE']) {
      const total = r1.p0[region] + r1.p1[region] + r1.p2[region] + r1.p3plus[region];
      expect(total).toBeCloseTo(1, 6);
    }
  });
});
