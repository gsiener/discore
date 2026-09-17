import type { CanonicalDataset, RankingEvent, RankingGame } from './model.js';

export interface NormalizedGame {
  id: string;
  winnerId: string;
  loserId: string;
  w: number;
  l: number;
  date: string;
  week: number;
  dateWeight: number;
  scoreWeight: number;
  seriesMultiplier: number;
  weight: number;
  eventId: string | null;
  isLeague: boolean;
  countsTowardMinimum: boolean;
  rated: boolean; // false for forfeits / non-final / excluded
  excludeReason?: string;
}

export interface NormalizeOptions {
  weekOf: (dateISO: string) => number;
  lastRegularWeek: number;
  seriesMultiplierOf: (g: RankingGame) => number;
  isLeagueGame: (g: RankingGame, events: Record<string, RankingEvent>) => boolean;
  overrideAction?: (gameId: string) => 'include' | 'exclude' | undefined;
}

export interface NormalizeResult {
  games: NormalizedGame[];
  diagnostics: {
    duplicatesCollapsed: string[];
    conflicts: { gameId: string; reason: string }[];
    missingDates: string[];
  };
}

function keyOf(g: RankingGame): string {
  return g.id;
}

/**
 * Normalize winner-oriented games, collapse duplicate source reports by game id,
 * and flag forfeits / non-final statuses. Rematches must use distinct ids —
 * same teams+score with different ids are kept as separate games.
 */
export function normalizeGames(
  dataset: CanonicalDataset,
  opts: NormalizeOptions,
): NormalizeResult {
  const seen = new Map<string, RankingGame>();
  const duplicatesCollapsed: string[] = [];
  const conflicts: { gameId: string; reason: string }[] = [];
  const missingDates: string[] = [];

  for (const g of dataset.games) {
    const k = keyOf(g);
    if (seen.has(k)) {
      const prev = seen.get(k)!;
      const same =
        prev.teamAId === g.teamAId &&
        prev.teamBId === g.teamBId &&
        prev.scoreA === g.scoreA &&
        prev.scoreB === g.scoreB &&
        prev.date === g.date;
      if (same) {
        duplicatesCollapsed.push(g.id);
        continue;
      }
      conflicts.push({ gameId: g.id, reason: `conflicting report for game id ${k}` });
      continue;
    }
    seen.set(k, g);
  }

  const games: NormalizedGame[] = [];
  for (const g of seen.values()) {
    if (!g.date) missingDates.push(g.id);
    const override = opts.overrideAction?.(g.id);

    let rated = true;
    let excludeReason: string | undefined;
    if (g.status === 'forfeit' || g.scoreA == null || g.scoreB == null) {
      rated = false;
      excludeReason = 'forfeit/non-numeric';
    } else if (g.status !== 'final') {
      rated = false;
      excludeReason = `status=${g.status}`;
    }
    if (override === 'exclude') {
      rated = false;
      excludeReason = 'manual-override';
    }
    if (override === 'include') {
      rated = g.status === 'final' && g.scoreA != null && g.scoreB != null;
      excludeReason = rated ? undefined : excludeReason;
    }

    // Winner orientation
    let winnerId = g.teamAId;
    let loserId = g.teamBId;
    let w = g.scoreA ?? 0;
    let l = g.scoreB ?? 0;
    if (rated && (g.scoreB ?? 0) > (g.scoreA ?? 0)) {
      winnerId = g.teamBId;
      loserId = g.teamAId;
      w = g.scoreB!;
      l = g.scoreA!;
    }
    if (rated && w === l) {
      // Ties: rankDiff 0, still rated (explicit HS policy; club/college would exclude)
      winnerId = g.teamAId;
      loserId = g.teamBId;
    }

    const week = g.date ? opts.weekOf(g.date) : 1;
    const dw = opts.lastRegularWeek > 0 ? Math.pow(2, Math.min(Math.max(week, 1), opts.lastRegularWeek) / opts.lastRegularWeek - 1) : 1;
    const sw = w + l > 0 ? Math.min(1, Math.sqrt((w + Math.max(l, Math.floor((w - 1) / 2))) / 19)) : 0;
    const sm = opts.seriesMultiplierOf(g);
    const isLeague = opts.isLeagueGame(g, dataset.events);

    games.push({
      id: g.id,
      winnerId,
      loserId,
      w,
      l,
      date: g.date,
      week,
      dateWeight: dw,
      scoreWeight: sw,
      seriesMultiplier: sm,
      weight: dw * sw * sm,
      eventId: g.eventId ?? null,
      isLeague,
      countsTowardMinimum: rated || override === 'include',
      rated,
      excludeReason,
    });
  }

  return { games, diagnostics: { duplicatesCollapsed, conflicts, missingDates } };
}

export function normalizeTeamName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.'"]/g, '')
    .replace(/\bultimate\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
