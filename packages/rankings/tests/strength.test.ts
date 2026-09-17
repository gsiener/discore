import { describe, expect, it } from 'vitest';
import { HS_2025_V1 } from '../src/rules.js';
import type { NormalizedGame } from '../src/normalize.js';
import { runRatings } from '../src/ratings.js';
import { strengthOfSchedule } from '../src/strength.js';
import { estimateUncertainty } from '../src/uncertainty.js';

function ng(id: string, w: string, l: string): NormalizedGame {
  return {
    id, winnerId: w, loserId: l, w: 13, l: 11, date: '2025-10-04', week: 8,
    dateWeight: 1, scoreWeight: 1, seriesMultiplier: 1, weight: 1,
    eventId: null, isLeague: false, countsTowardMinimum: true, rated: true,
  };
}

describe('strength + uncertainty', () => {
  it('sos averages opponents and percentiles span 0-100', () => {
    const games = [ng('g1', 'A', 'B'), ng('g2', 'A', 'C'), ng('g3', 'B', 'C')];
    const r = runRatings(games, HS_2025_V1);
    const sos = strengthOfSchedule(r);
    const vals = [...sos.values()].map((v) => v.percentile);
    expect(Math.min(...vals)).toBe(0);
    expect(Math.max(...vals)).toBe(100);
  });

  it('low games => low confidence; null SD when insufficient', () => {
    const games = [ng('g1', 'A', 'B')];
    const r = runRatings(games, HS_2025_V1, ['A', 'B', 'Z']);
    const u = estimateUncertainty(r, HS_2025_V1);
    expect(u.get('A')?.confidence).toBe('low');
    expect(u.get('A')?.sd).toBeNull();
  });
});
