import { runRatings, type RatingsResult } from './ratings.js';
import { rankDiff } from './math.js';
import type { NormalizedGame } from './normalize.js';
import type { Ruleset } from './rules.js';

/**
 * Top-K (golf-handicap style): rate on best K game ratings only, applied ONCE
 * on top of a converged standard rating. Never inside the iteration
 * (no fixed point — spread grows without settling).
 */
export function topKPostHoc(
  base: RatingsResult,
  k: number,
): Map<string, { teamId: string; rating: number; kept: number }> {
  const out = new Map<string, { teamId: string; rating: number; kept: number }>();
  for (const [id, t] of base.teams) {
    const used = t.contributions.filter((c) => !c.ignored);
    if (!used.length) {
      out.set(id, { teamId: id, rating: t.rating, kept: 0 });
      continue;
    }
    const ranked = [...used].sort((a, b) => b.gameRating - a.gameRating).slice(0, Math.max(k, 1));
    // Weight-aware average of kept games
    let num = 0;
    let den = 0;
    for (const c of ranked) {
      num += c.weight * c.gameRating;
      den += c.weight;
    }
    out.set(id, { teamId: id, rating: den > 0 ? num / den : t.rating, kept: ranked.length });
  }
  return out;
}

export interface BlowoutConfig {
  gap: number;
  marginFn: (w: number, l: number) => boolean;
  oneSided: boolean;
}

/**
 * Configurable blowout filter applied inside iteration via a custom ruleset.
 * gap=0 + margin always-true + oneSided=true gives "wins can never hurt you".
 */
export function runWithBlowoutConfig(
  games: NormalizedGame[],
  rules: Ruleset,
  cfg: BlowoutConfig,
): RatingsResult {
  const patched: Ruleset = {
    ...rules,
    blowout: { ratingGap: cfg.gap, minRetainedGames: rules.blowout.minRetainedGames, twoSidedExclude: !cfg.oneSided },
  };
  if (cfg.marginFn === alwaysTrue) {
    // Emulate margin=0 by rewriting game margins? No — instead shrink-wrap:
    // run with a pre-filter that marks every loss... Actually simplest correct
    // approach: delegate to runRatings with gap rule only when margin is trivial.
    // For non-trivial margins we need per-game margin checks, so reimplement thinly:
    return runRatingsWithMargin(games, patched, cfg);
  }
  return runRatingsWithMargin(games, patched, cfg);
}

export const alwaysTrue = () => true;
export const standardMargin = (w: number, l: number) => w > 2 * l + 1;

function runRatingsWithMargin(games: NormalizedGame[], rules: Ruleset, cfg: BlowoutConfig): RatingsResult {
  // Reuse runRatings when cfg matches standard semantics; else local loop.
  if (cfg.marginFn === standardMargin && cfg.gap === rules.blowout.ratingGap) {
    return runRatings(games, rules);
  }
  // Generic loop mirroring ratings.ts with custom margin predicate.
  const ids = Array.from(new Set(games.flatMap((g) => [g.winnerId, g.loserId])));
  const index = new Map(ids.map((id, i) => [id, i]));
  const n = ids.length;
  const rated = games.filter((g) => g.rated);
  const diffs = rated.map((g) => rankDiff(g.w, g.l));
  let ratings = new Float64Array(n).fill(rules.solver.startRating);
  let ignored = new Set<string>();
  let iterations = 0;
  let converged = false;
  let finalRms = Infinity;
  const teamGames: number[][] = ids.map(() => []);
  rated.forEach((g, gi) => {
    teamGames[index.get(g.winnerId)!].push(gi);
    teamGames[index.get(g.loserId)!].push(gi);
  });
  for (let iter = 0; iter < rules.solver.maxIterations; iter++) {
    iterations = iter + 1;
    const cands: { gi: number; gap: number }[] = [];
    rated.forEach((g, gi) => {
      const gap = ratings[index.get(g.winnerId)!] - ratings[index.get(g.loserId)!];
      if (gap > cfg.gap && cfg.marginFn(g.w, g.l)) cands.push({ gi, gap });
    });
    cands.sort((a, b) => b.gap - a.gap || rated[a.gi].id.localeCompare(rated[b.gi].id));
    const nextIgnored = new Set<string>();
    const retained = new Map<string, number>();
    for (const id of ids) retained.set(id, teamGames[index.get(id)!].length);
    for (const c of cands) {
      const g = rated[c.gi];
      if ((retained.get(g.winnerId) ?? 0) - 1 >= rules.blowout.minRetainedGames) {
        nextIgnored.add(g.id);
        retained.set(g.winnerId, (retained.get(g.winnerId) ?? 0) - 1);
        if (!cfg.oneSided) retained.set(g.loserId, (retained.get(g.loserId) ?? 0) - 1);
      }
    }
    ignored = nextIgnored;
    // Sequential in-place updates (see ratings.ts): Jacobi oscillates on a
    // 2-team single game, Gauss-Seidel settles. Full step, no damping.
    const prev = ratings.slice();
    for (let i = 0; i < n; i++) {
      let num = 0;
      let den = 0;
      for (const gi of teamGames[i]) {
        const g = rated[gi];
        if (ignored.has(g.id)) continue;
        if (g.winnerId === ids[i]) {
          num += g.weight * (ratings[index.get(g.loserId)!] + diffs[gi]);
        } else {
          num += g.weight * (ratings[index.get(g.winnerId)!] - diffs[gi]);
        }
        den += g.weight;
      }
      if (den > 0) ratings[i] = num / den;
    }
    let sq = 0;
    for (let i = 0; i < n; i++) sq += (ratings[i] - prev[i]) ** 2;
    finalRms = Math.sqrt(sq / Math.max(n, 1));
    if (finalRms < rules.solver.rmsTolerance) {
      converged = true;
      break;
    }
  }
  // Build minimal result via runRatings-compatible shape
  const base = runRatings([], rules, ids);
  void base;
  const teams = new Map();
  ids.forEach((id, i) => {
    teams.set(id, { teamId: id, rating: ratings[i], gamesUsed: 0, contributions: [] });
  });
  return { teams, ignoredGameIds: ignored, iterations, converged, finalRms, connectedComponents: [ids] };
}
