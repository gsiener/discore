/**
 * Core rating math from the gist (sections 1, 6).
 * All score functions take winner-oriented scores: w >= l.
 */

export function rankDiff(w: number, l: number): number {
  if (w === l) return 0;
  if (w < l) throw new Error(`rankDiff requires w >= l, got ${w}-${l}`);
  if (w - l === 1) return 125; // one-point game; also guards w=1 (l/(w-1) -> 0/0)
  const r = l / (w - 1); // 1.0 for a one-point game
  const x = Math.min(1, 2 * (1 - r));
  return 125 + (475 * Math.sin(x * 0.4 * Math.PI)) / Math.sin(0.4 * Math.PI);
}

export function scoreWeight(w: number, l: number): number {
  return Math.min(1, Math.sqrt((w + Math.max(l, Math.floor((w - 1) / 2))) / 19));
}

/** Wednesday-to-Tuesday season week, 1-indexed. Returns <1 for pre-season dates. */
export function seasonWeek(dateISO: string, anchorMonth: number, anchorDay: number, seasonYear: number): number {
  const opener = Date.UTC(seasonYear, anchorMonth, anchorDay);
  const openerDow = new Date(opener).getUTCDay(); // 3 = Wednesday
  const week1 = opener + (((3 - openerDow + 7) % 7) * 86400000);
  const [y, m, d] = dateISO.split('-').map(Number);
  const day = Date.UTC(y, m - 1, d);
  return Math.floor((day - week1) / (7 * 86400000)) + 1;
}

export function dateWeight(week: number, lastRegularWeek: number): number {
  const t = Math.min(Math.max(week, 1), lastRegularWeek);
  const n = lastRegularWeek;
  return Math.pow(2, t / n - 1);
}

export const WIN_PROB_SCALE_DEFAULT = 200;

export function winProbability(ratingDiff: number, scale = WIN_PROB_SCALE_DEFAULT): number {
  return 1 / (1 + Math.exp(-ratingDiff / scale));
}

export interface ProjectedScore {
  winner: number;
  loser: number;
}

/** Invert rankDiff for display: rating gap -> expected score at cap. */
export function invertRankDiff(gap: number, cap = 15): ProjectedScore {
  const g = Math.abs(gap);
  if (g <= 125) return { winner: cap, loser: cap - 1 };
  const s = Math.min(1, ((g - 125) / 475) * Math.sin(0.4 * Math.PI));
  const x = Math.min(1, Math.asin(s) / (0.4 * Math.PI));
  const r = 1 - x / 2;
  return { winner: cap, loser: Math.max(0, Math.min(cap - 1, Math.round(r * (cap - 1)))) };
}

/**
 * Simulation score projection: extrapolates past the 600 cap so heavy
 * favorites produce blowout-eligible scores (e.g. 15-3 not 15-7).
 */
export function projectScore(gap: number, cap = 15): ProjectedScore {
  const g = Math.abs(gap);
  if (g <= 600) return invertRankDiff(g, cap);
  const floor = Math.round((cap - 1) / 2);
  return { winner: cap, loser: Math.max(0, floor - Math.ceil((g - 600) / 150)) };
}
