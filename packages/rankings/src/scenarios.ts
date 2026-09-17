import type { NormalizedGame } from './normalize.js';
import { runRatings, type RatingsResult } from './ratings.js';
import type { Ruleset } from './rules.js';

export interface HypotheticalGame {
  id: string;
  winnerId: string;
  loserId: string;
  w: number;
  l: number;
  /** If replacing an existing game, inherit its weights to keep counts net-zero. */
  replacesGameId?: string;
  date?: string;
  week?: number;
  weight?: number;
  scoreWeight?: number;
  dateWeight?: number;
  seriesMultiplier?: number;
}

export interface ScenarioDelta {
  teamId: string;
  baseRating: number;
  scenarioRating: number;
  delta: number;
  baseRank: number | null;
  scenarioRank: number | null;
  rankDelta: number | null;
}

export interface ScenarioResult {
  baseline: RatingsResult;
  scenario: RatingsResult;
  anchorShift: number;
  deltas: ScenarioDelta[];
}

function rankOf(ratings: RatingsResult, teamId: string): number | null {
  const sorted = [...ratings.teams.entries()].sort((a, b) => b[1].rating - a[1].rating);
  const i = sorted.findIndex(([id]) => id === teamId);
  return i >= 0 ? i + 1 : null;
}

function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * What-if recompute: baseline and scenario through the same code path,
 * re-anchored by median shift of uninvolved teams (gauge freedom).
 */
export function runScenario(
  baseGames: NormalizedGame[],
  hypotheticals: HypotheticalGame[],
  rules: Ruleset,
  teamIds?: string[],
): ScenarioResult {
  const baseline = runRatings(baseGames, rules, teamIds);
  const byId = new Map(baseGames.map((g) => [g.id, g]));
  const replaced = new Set(hypotheticals.map((h) => h.replacesGameId).filter(Boolean) as string[]);

  const scenarioGames: NormalizedGame[] = baseGames
    .filter((g) => !replaced.has(g.id))
    .map((g) => ({ ...g }));

  for (const h of hypotheticals) {
    const inherit = h.replacesGameId ? byId.get(h.replacesGameId) : undefined;
    scenarioGames.push({
      id: h.id,
      winnerId: h.winnerId,
      loserId: h.loserId,
      w: h.w,
      l: h.l,
      date: h.date ?? inherit?.date ?? '2000-01-01',
      week: h.week ?? inherit?.week ?? 1,
      dateWeight: h.dateWeight ?? inherit?.dateWeight ?? 1,
      scoreWeight: h.scoreWeight ?? inherit?.scoreWeight ?? 1,
      seriesMultiplier: h.seriesMultiplier ?? inherit?.seriesMultiplier ?? 1,
      weight:
        h.weight ?? (inherit ? inherit.weight : (h.dateWeight ?? 1) * (h.scoreWeight ?? 1) * (h.seriesMultiplier ?? 1)),
      eventId: inherit?.eventId ?? null,
      isLeague: inherit?.isLeague ?? false,
      countsTowardMinimum: true,
      rated: true,
    });
  }

  const allIds = teamIds ?? Array.from(new Set([...baseGames, ...scenarioGames].flatMap((g) => [g.winnerId, g.loserId])));
  const scenario = runRatings(scenarioGames, rules, allIds);

  const involved = new Set<string>();
  for (const h of hypotheticals) {
    involved.add(h.winnerId);
    involved.add(h.loserId);
    if (h.replacesGameId) {
      const g = byId.get(h.replacesGameId);
      if (g) {
        involved.add(g.winnerId);
        involved.add(g.loserId);
      }
    }
  }
  const shifts: number[] = [];
  for (const id of allIds) {
    if (involved.has(id)) continue;
    const b = baseline.teams.get(id)?.rating;
    const s = scenario.teams.get(id)?.rating;
    if (b != null && s != null) shifts.push(s - b);
  }
  const anchorShift = median(shifts);

  const deltas: ScenarioDelta[] = allIds.map((id) => {
    const b = baseline.teams.get(id)?.rating ?? rules.solver.startRating;
    const sRaw = scenario.teams.get(id)?.rating ?? rules.solver.startRating;
    const s = sRaw - anchorShift;
    const br = rankOf(baseline, id);
    // scenario ranks computed on raw then shift-invariant (uniform shift preserves order)
    const sr = rankOf(scenario, id);
    return {
      teamId: id,
      baseRating: b,
      scenarioRating: s,
      delta: s - b,
      baseRank: br,
      scenarioRank: sr,
      rankDelta: br != null && sr != null ? br - sr : null,
    };
  });
  deltas.sort((a, b) => b.scenarioRating - a.scenarioRating);

  return { baseline, scenario, anchorShift, deltas };
}
