import { describe, it, expect } from 'vitest';
import { seasonForDate, currentSeason, seasonRange, isInSeason } from './season.js';

describe('season', () => {
  it('rolls over on Aug 1', () => {
    expect(seasonForDate('2026-07-31')).toBe('2025-26');
    expect(seasonForDate('2026-08-01')).toBe('2026-27');
    expect(seasonForDate('2027-03-21')).toBe('2026-27');
  });

  it('labels century boundaries', () => {
    expect(seasonForDate('2099-10-01')).toBe('2099-00');
  });

  it('computes the current season from a date', () => {
    expect(currentSeason(new Date(2026, 9, 12))).toBe('2026-27');
    expect(currentSeason(new Date(2027, 5, 1))).toBe('2026-27');
  });

  it('returns the season date range', () => {
    expect(seasonRange('2026-27')).toEqual({ from: '2026-08-01', to: '2027-07-31' });
  });

  it('filters by season, excluding undated games', () => {
    expect(isInSeason('2026-06-13', '2026-27')).toBe(false);
    expect(isInSeason('2026-10-11', '2026-27')).toBe(true);
    expect(isInSeason(undefined, '2026-27')).toBe(false);
  });
});
