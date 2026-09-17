import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseCanonicalDataset } from '../src/dataset.js';
import { HS_2025_V1 } from '../src/rules.js';
import { buildSnapshot } from '../src/snapshot.js';

const dir = dirname(fileURLToPath(import.meta.url));
const raw = JSON.parse(readFileSync(join(dir, 'fixtures/small-season.json'), 'utf8'));

function snap() {
  const { dataset } = parseCanonicalDataset(raw);
  return buildSnapshot(dataset, HS_2025_V1, { generatedAt: '2026-01-01T00:00:00.000Z' });
}

describe('buildSnapshot', () => {
  it('is deterministic and carries ruleset + solver diagnostics', () => {
    const a = snap();
    const b = snap();
    expect(a).toEqual(b);
    expect(a.meta.rulesetVersion).toBe('HS_2025_V1');
    expect(a.meta.fingerprint).toBe(b.meta.fingerprint);
    expect(typeof a.meta.converged).toBe('boolean');
    expect(a.meta.totalGames).toBe(18);
  });

  it('ranks varsity by rating with dense ranks; JV unranked', () => {
    const s = snap();
    const varsity = s.teams.filter((t) => t.id !== 'albany-jv');
    expect(varsity.map((t) => t.rank)).toEqual([1, 2, 3, 4, 5, 6]);
    const jv = s.teams.find((t) => t.id === 'albany-jv')!;
    expect(jv.rank).toBeNull();
    expect(jv.qualified).toBe(false);
    expect(jv.qualificationReason).toBe('jv');
  });

  it('league-only team is not qualified', () => {
    const s = snap();
    const l = s.teams.find((t) => t.id === 'leaguers')!;
    expect(l.qualified).toBe(false);
    expect(l.qualificationReason).toBe('league-only');
  });

  it('forfeit never enters the rating', () => {
    const s = snap();
    for (const t of s.teams) {
      expect(t.games.find((g) => g.gameId === 'g12')).toBeUndefined();
    }
    expect(s.meta.ratedGames).toBeLessThan(s.meta.totalGames);
  });

  it('exposes weights, SoS, and confidence per team', () => {
    const s = snap();
    for (const t of s.teams) {
      expect(t.sosPercentile).toBeGreaterThanOrEqual(0);
      expect(t.sosPercentile).toBeLessThanOrEqual(100);
      expect(['low', 'med', 'high']).toContain(t.confidence);
      for (const g of t.games) {
        expect(g.weight).toBeCloseTo(g.scoreWeight * g.dateWeight * g.seriesMultiplier, 3);
      }
    }
  });
});
