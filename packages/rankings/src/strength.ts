import type { RatingsResult } from './ratings.js';

/** Mean opponent rating over non-ignored games + percentile across full field. */
export function strengthOfSchedule(result: RatingsResult): Map<string, { sos: number; percentile: number }> {
  const sos = new Map<string, number>();
  for (const [id, t] of result.teams) {
    const used = t.contributions.filter((c) => !c.ignored);
    if (!used.length) {
      sos.set(id, 0);
      continue;
    }
    let sum = 0;
    for (const c of used) sum += result.teams.get(c.opponentId)?.rating ?? 0;
    sos.set(id, sum / used.length);
  }
  const sorted = [...sos.entries()].sort((a, b) => a[1] - b[1]);
  const out = new Map<string, { sos: number; percentile: number }>();
  const denom = Math.max(sorted.length - 1, 1);
  sorted.forEach(([id, value], i) => {
    out.set(id, { sos: value, percentile: (i / denom) * 100 });
  });
  return out;
}
