import { describe, expect, it } from 'vitest';
import { computeEligibility } from '../src/eligibility.js';
import { HS_2025_V1 } from '../src/rules.js';
import type { NormalizedGame } from '../src/normalize.js';

function ng(id: string, winnerId: string, loserId: string, isLeague: boolean): NormalizedGame {
  return {
    id, winnerId, loserId, w: 13, l: 11, date: '2025-10-04', week: 8,
    dateWeight: 1, scoreWeight: 1, seriesMultiplier: 1, weight: 1,
    eventId: null, isLeague, countsTowardMinimum: true, rated: true,
  };
}

describe('computeEligibility', () => {
  it('HS default: 5 games + non-league required', () => {
    const games: NormalizedGame[] = [];
    for (let i = 0; i < 5; i++) games.push(ng(`l${i}`, 'A', 'B', true));
    const e = computeEligibility(['A'], games, HS_2025_V1);
    expect(e.get('A')?.qualified).toBe(false);
    expect(e.get('A')?.reason).toBe('league-only');

    games.push(ng('n1', 'A', 'C', false));
    const e2 = computeEligibility(['A'], games, HS_2025_V1);
    expect(e2.get('A')?.qualified).toBe(true);
  });

  it('JV excluded regardless of count', () => {
    const games: NormalizedGame[] = [];
    for (let i = 0; i < 6; i++) games.push(ng(`g${i}`, 'JV', 'B', false));
    const e = computeEligibility(['JV'], games, HS_2025_V1, () => false);
    expect(e.get('JV')?.qualified).toBe(false);
    expect(e.get('JV')?.reason).toBe('jv');
  });
});
