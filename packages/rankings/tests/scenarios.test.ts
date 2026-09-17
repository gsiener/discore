import { describe, expect, it } from 'vitest';
import { HS_2025_V1 } from '../src/rules.js';
import type { NormalizedGame } from '../src/normalize.js';
import { runScenario } from '../src/scenarios.js';

function ng(id: string, winnerId: string, loserId: string, w = 13, l = 11): NormalizedGame {
  return {
    id, winnerId, loserId, w, l, date: '2025-10-04', week: 8,
    dateWeight: 1, scoreWeight: 1, seriesMultiplier: 1, weight: 1,
    eventId: null, isLeague: false, countsTowardMinimum: true, rated: true,
  };
}

describe('runScenario', () => {
  it('empty scenario produces zero change', () => {
    const base = [
      ng('g1', 'A', 'B'),
      ng('g2', 'B', 'C'),
      ng('g3', 'C', 'A'),
      ng('g4', 'A', 'C'),
    ];
    const r = runScenario(base, [], HS_2025_V1);
    expect(r.anchorShift).toBeCloseTo(0, 6);
    for (const d of r.deltas) {
      expect(d.delta).toBeCloseTo(0, 6);
      expect(d.rankDelta).toBe(0);
    }
  });

  it('replacing a game inherits weights and stays net-zero in counts', () => {
    const base = [
      ng('g1', 'A', 'B', 13, 11),
      ng('g2', 'B', 'C'),
      ng('g3', 'C', 'A'),
    ];
    const r = runScenario(
      base,
      [{ id: 'h1', winnerId: 'B', loserId: 'A', w: 13, l: 10, replacesGameId: 'g1' }],
      HS_2025_V1,
    );
    // Flipping A->B to B->A must move B up and A down
    const dA = r.deltas.find((d) => d.teamId === 'A')!;
    const dB = r.deltas.find((d) => d.teamId === 'B')!;
    expect(dB.delta).toBeGreaterThan(0);
    expect(dA.delta).toBeLessThan(0);
  });
});
