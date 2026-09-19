import { describe, expect, it } from 'vitest';
import { HS_2025_V1, HS_2026_V1, rulesetForSeason } from '../src/rules.js';

describe('season rulesets', () => {
  it('versions the 2026-27 HS season separately from 2025-26', () => {
    expect(HS_2026_V1.version).toBe('HS_2026_V1');
    expect(HS_2026_V1.season).toBe('2026-27');
    expect(HS_2026_V1.calendar.seasonYear).toBe(2026);
    expect(HS_2026_V1.version).not.toBe(HS_2025_V1.version);
  });

  it('resolves a ruleset per season, defaulting to latest', () => {
    expect(rulesetForSeason('2025-26')).toBe(HS_2025_V1);
    expect(rulesetForSeason('2026-27')).toBe(HS_2026_V1);
    expect(rulesetForSeason('unknown')).toBe(HS_2026_V1);
  });
});
