import type { RatingsResult } from './ratings.js';
import type { Ruleset } from './rules.js';

export type Confidence = 'low' | 'med' | 'high';

export interface Uncertainty {
  teamId: string;
  games: number;
  sd: number | null; // null when insufficient evidence
  confidence: Confidence;
}

/**
 * Shrunk per-game rating variability (gist section 4).
 * sd = sqrt((v*pooled + (g-1)*raw) / (v + (g-1))), v = 5.
 * Reported as performance variability, NOT a CI for true strength.
 */
export function estimateUncertainty(result: RatingsResult, rules: Ruleset): Map<string, Uncertainty> {
  const rawVar = new Map<string, number>();
  const counts = new Map<string, number>();
  for (const [id, t] of result.teams) {
    const used = t.contributions.filter((c) => !c.ignored).map((c) => c.gameRating);
    counts.set(id, used.length);
    if (used.length < 2) {
      rawVar.set(id, NaN);
      continue;
    }
    const mean = used.reduce((a, b) => a + b, 0) / used.length;
    const s = used.reduce((a, b) => a + (b - mean) ** 2, 0) / (used.length - 1);
    rawVar.set(id, s);
  }
  let num = 0;
  let den = 0;
  for (const [id, v] of rawVar) {
    const g = counts.get(id) ?? 0;
    if (g >= 2 && Number.isFinite(v)) {
      num += (g - 1) * v;
      den += g - 1;
    }
  }
  const pooled = den > 0 ? num / den : NaN;
  const sds: number[] = [];
  const tmp = new Map<string, number | null>();
  for (const [id] of result.teams) {
    const g = counts.get(id) ?? 0;
    const rv = rawVar.get(id);
    if (g < 2 || !Number.isFinite(rv) || !Number.isFinite(pooled)) {
      tmp.set(id, null);
      continue;
    }
    const v = 5;
    const shrunk = (v * pooled + (g - 1) * (rv as number)) / (v + (g - 1));
    const sd = Math.sqrt(Math.max(shrunk, 0));
    tmp.set(id, sd);
    sds.push(sd);
  }
  sds.sort((a, b) => a - b);
  const median = sds.length ? sds[Math.floor(sds.length / 2)] : Infinity;

  const out = new Map<string, Uncertainty>();
  for (const [id] of result.teams) {
    const g = counts.get(id) ?? 0;
    const sd = tmp.get(id) ?? null;
    let confidence: Confidence = 'med';
    if (g < rules.confidenceMinGamesLow) confidence = 'low';
    else if (g >= rules.confidenceMinGamesHigh && sd != null && sd <= median) confidence = 'high';
    out.set(id, { teamId: id, games: g, sd, confidence });
  }
  return out;
}
