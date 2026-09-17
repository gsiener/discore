import type { CanonicalDataset, RankingGame } from './model.js';
import { normalizeGames, type NormalizedGame } from './normalize.js';
import type { Ruleset } from './rules.js';
import { seasonWeek } from './math.js';

export interface SnapshotMeta {
  season: string;
  division: string;
  rulesetVersion: string;
  generatedAt: string;
  resultsThrough: string;
  totalGames: number;
  ratedGames: number;
  ignoredGames: number;
}

/** Build NormalizedGame[] from a canonical dataset under a ruleset. */
export function datasetToNormalized(dataset: CanonicalDataset, rules: Ruleset): {
  games: NormalizedGame[];
  lastRegularWeek: number;
  diagnostics: { duplicatesCollapsed: string[]; conflicts: { gameId: string; reason: string }[]; missingDates: string[] };
} {
  const overrides = new Map((dataset.overrides ?? []).map((o) => [o.gameId, o.action]));
  // lastRegularWeek: explicit rule or max week present
  const weeks = dataset.games
    .filter((g) => g.date)
    .map((g) => seasonWeek(g.date, rules.calendar.anchorMonth, rules.calendar.anchorDay, rules.calendar.seasonYear));
  const inferred = weeks.length ? Math.max(...weeks) : 1;
  const lastRegularWeek = rules.calendar.lastRegularWeek ?? inferred;

  const weekOf = (dateISO: string) =>
    seasonWeek(dateISO, rules.calendar.anchorMonth, rules.calendar.anchorDay, rules.calendar.seasonYear);
  const seriesMultiplierOf = (g: RankingGame) => {
    switch (g.seriesRound ?? 'regular') {
      case 'sectionals':
        return rules.seriesMultipliers.sectionals;
      case 'regionals':
        return rules.seriesMultipliers.regionals;
      case 'nationals':
        return rules.seriesMultipliers.nationals;
      default:
        return rules.seriesMultipliers.regular;
    }
  };
  const isLeagueGame = (g: RankingGame, events: CanonicalDataset['events']) => {
    if (!g.eventId) return false;
    return events[g.eventId]?.league ?? false;
  };

  const { games, diagnostics } = normalizeGames(dataset, {
    weekOf,
    lastRegularWeek,
    seriesMultiplierOf,
    isLeagueGame,
    overrideAction: (id) => overrides.get(id),
  });
  return { games, lastRegularWeek, diagnostics };
}

/** Canonical fingerprint for seeding/caching: scores + rules + membership. */
export function datasetFingerprint(dataset: CanonicalDataset, rules: Ruleset): string {
  const parts = dataset.games
    .map((g) => [g.id, g.teamAId, g.teamBId, g.scoreA, g.scoreB, g.status, g.date, g.eventId].join('|'))
    .sort()
    .join('\n');
  return `${dataset.season}|${dataset.division}|${rules.version}|${parts}`;
}
