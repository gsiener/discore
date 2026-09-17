import { datasetFingerprint, datasetToNormalized } from './adapter.js';
import { computeEligibility } from './eligibility.js';
import type { CanonicalDataset } from './model.js';
import { runRatings } from './ratings.js';
import type { Ruleset } from './rules.js';
import { strengthOfSchedule } from './strength.js';
import { estimateUncertainty, type Confidence } from './uncertainty.js';

export interface SnapshotGame {
  gameId: string;
  opponentId: string;
  opponentName: string;
  result: 'W' | 'L' | 'T';
  scoreFor: number;
  scoreAgainst: number;
  date: string;
  eventName: string | null;
  gameRating: number;
  /** gameRating - teamRating. Explanatory, NOT the causal effect of this game. */
  effect: number;
  scoreWeight: number;
  dateWeight: number;
  seriesMultiplier: number;
  weight: number;
  ignored: boolean;
  ignoreReason: string | null;
}

export interface SnapshotTeam {
  id: string;
  name: string;
  region: string | null;
  rank: number | null;
  qualified: boolean;
  qualificationReason: string;
  rating: number;
  wins: number;
  losses: number;
  ties: number;
  gamesPlayed: number;
  sos: number;
  sosPercentile: number;
  sd: number | null;
  confidence: Confidence;
  componentId: number;
  games: SnapshotGame[];
}

export interface Snapshot {
  meta: {
    season: string;
    division: string;
    rulesetVersion: string;
    label: string;
    generatedAt: string;
    resultsThrough: string;
    totalGames: number;
    ratedGames: number;
    ignoredGames: number;
    converged: boolean;
    iterations: number;
    finalRms: number;
    fingerprint: string;
  };
  teams: SnapshotTeam[];
}

/**
 * Full reproducible pipeline: canonical dataset + ruleset -> published snapshot.
 * Deterministic: team order, tie-breaking, and seeding all derive from inputs.
 */
export function buildSnapshot(
  dataset: CanonicalDataset,
  rules: Ruleset,
  opts: { generatedAt?: string; resultsThrough?: string } = {},
): Snapshot {
  const { games: normalized, lastRegularWeek } = datasetToNormalized(dataset, rules);
  void lastRegularWeek;
  const teamIds = dataset.teams.map((t) => t.id);
  const ratings = runRatings(normalized, rules, teamIds);
  const names = new Map(dataset.teams.map((t) => [t.id, t.displayName]));
  const regions = new Map(dataset.teams.map((t) => [t.id, t.region ?? null]));
  const varsity = new Map(dataset.teams.map((t) => [t.id, t.varsity ?? true]));
  const eligibility = computeEligibility(teamIds, normalized, rules, (id) => varsity.get(id) ?? true);
  const sos = strengthOfSchedule(ratings);
  const uncert = estimateUncertainty(ratings, rules);
  const componentId = new Map<string, number>();
  ratings.connectedComponents.forEach((comp, i) => comp.forEach((id) => componentId.set(id, i)));

  const eventName = (id: string | null) => (id ? (dataset.events[id]?.name ?? id) : null);

  // Wins/losses from rated, non-ignored games only (matches legacy summary semantics)
  const wl = new Map<string, { w: number; l: number; t: number }>();
  for (const g of normalized) {
    if (!g.rated || ratings.ignoredGameIds.has(g.id)) continue;
    const e = (id: string) => {
      let r = wl.get(id);
      if (!r) {
        r = { w: 0, l: 0, t: 0 };
        wl.set(id, r);
      }
      return r;
    };
    if (g.w === g.l) {
      e(g.winnerId).t++;
      e(g.loserId).t++;
    } else {
      e(g.winnerId).w++;
      e(g.loserId).l++;
    }
  }

  const varsitySorted = [...ratings.teams.entries()]
    .filter(([id]) => varsity.get(id) ?? true)
    .sort((a, b) => b[1].rating - a[1].rating || a[0].localeCompare(b[0]));
  const rankOf = new Map(varsitySorted.map(([id], i) => [id, i + 1]));

  const teams: SnapshotTeam[] = [...ratings.teams.entries()]
    .sort((a, b) => {
      const va = varsity.get(a[0]) ?? true;
      const vb = varsity.get(b[0]) ?? true;
      if (va !== vb) return va ? -1 : 1;
      return b[1].rating - a[1].rating || a[0].localeCompare(b[0]);
    })
    .map(([id, t]) => {
      const elig = eligibility.get(id)!;
      const s = sos.get(id)!;
      const u = uncert.get(id)!;
      const rec = wl.get(id) ?? { w: 0, l: 0, t: 0 };
      const gameList: SnapshotGame[] = [...t.contributions]
        .sort((a, b) => a.gameId.localeCompare(b.gameId))
        .map((c) => {
          const g = normalized.find((x) => x.id === c.gameId)!;
          return {
            gameId: c.gameId,
            opponentId: c.opponentId,
            opponentName: names.get(c.opponentId) ?? c.opponentId,
            result: g.w === g.l ? 'T' : c.won ? 'W' : 'L',
            scoreFor: c.won ? c.w : c.l,
            scoreAgainst: c.won ? c.l : c.w,
            date: g.date,
            eventName: eventName(g.eventId),
            gameRating: round1(c.gameRating),
            effect: round1(c.effect),
            scoreWeight: round3(c.scoreWeight),
            dateWeight: round3(c.dateWeight),
            seriesMultiplier: c.seriesMultiplier,
            weight: round3(c.weight),
            ignored: c.ignored,
            ignoreReason: c.ignoreReason ?? null,
          };
        });
      return {
        id,
        name: names.get(id) ?? id,
        region: regions.get(id) ?? null,
        rank: rankOf.get(id) ?? null,
        qualified: elig.qualified,
        qualificationReason: elig.reason,
        rating: round1(t.rating),
        wins: rec.w,
        losses: rec.l,
        ties: rec.t,
        gamesPlayed: elig.totalGames,
        sos: round1(s.sos),
        sosPercentile: Math.round(s.percentile),
        sd: u.sd == null ? null : round1(u.sd),
        confidence: u.confidence,
        componentId: componentId.get(id) ?? 0,
        games: gameList,
      };
    });

  const ratedCount = normalized.filter((g) => g.rated && !ratings.ignoredGameIds.has(g.id)).length;
  const dates = normalized.filter((g) => g.rated).map((g) => g.date).sort();
  return {
    meta: {
      season: dataset.season,
      division: String(dataset.division),
      rulesetVersion: rules.version,
      label: rules.label,
      generatedAt: opts.generatedAt ?? new Date().toISOString(),
      resultsThrough: opts.resultsThrough ?? (dates[dates.length - 1] ?? ''),
      totalGames: normalized.length,
      ratedGames: ratedCount,
      ignoredGames: ratings.ignoredGameIds.size,
      converged: ratings.converged,
      iterations: ratings.iterations,
      finalRms: ratings.finalRms,
      fingerprint: datasetFingerprint(dataset, rules),
    },
    teams,
  };
}

const round1 = (x: number) => Math.round(x * 10) / 10;
const round3 = (x: number) => Math.round(x * 1000) / 1000;
