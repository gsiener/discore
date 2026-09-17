import { rankDiff } from './math.js';
import type { NormalizedGame } from './normalize.js';
import type { Ruleset } from './rules.js';

export interface GameContribution {
  gameId: string;
  opponentId: string;
  won: boolean;
  w: number;
  l: number;
  diff: number;
  gameRating: number;
  effect: number; // gameRating - teamRating (explanatory, NOT causal delta)
  weight: number;
  scoreWeight: number;
  dateWeight: number;
  seriesMultiplier: number;
  ignored: boolean;
  ignoreReason?: string;
}

export interface TeamRating {
  teamId: string;
  rating: number;
  gamesUsed: number;
  contributions: GameContribution[];
}

export interface RatingsResult {
  teams: Map<string, TeamRating>;
  ignoredGameIds: Set<string>;
  iterations: number;
  converged: boolean;
  finalRms: number;
  connectedComponents: string[][];
}

/**
 * Weighted iterative ratings with per-iteration deterministic blowout filtering.
 * - start all at rules.solver.startRating
 * - full step, no damping
 * - stop at RMS < tolerance, cap maxIterations
 * - blowout candidates recomputed every iteration; largest gaps first subject to floor
 * - two-sided exclusion (documented compatibility choice)
 */
export function runRatings(games: NormalizedGame[], rules: Ruleset, teamIds?: string[]): RatingsResult {
  const ids = teamIds ?? Array.from(new Set(games.flatMap((g) => [g.winnerId, g.loserId])));
  const index = new Map(ids.map((id, i) => [id, i]));
  const n = ids.length;

  const ratedGames = games.filter((g) => g.rated);
  // Precompute diff per game
  const diffs = ratedGames.map((g) => rankDiff(g.w, g.l));

  let ratings = new Float64Array(n).fill(rules.solver.startRating);
  let ignored = new Set<string>();
  let iterations = 0;
  let converged = false;
  let finalRms = Infinity;

  const teamGameList: number[][] = ids.map(() => []);
  ratedGames.forEach((g, gi) => {
    teamGameList[index.get(g.winnerId)!].push(gi);
    teamGameList[index.get(g.loserId)!].push(gi);
  });

  for (let iter = 0; iter < rules.solver.maxIterations; iter++) {
    iterations = iter + 1;
    // Blowout candidates in rating-gap order (deterministic)
    const candidates: { gi: number; gap: number }[] = [];
    ratedGames.forEach((g, gi) => {
      if (ignored.has(g.id)) {
        // re-evaluate: fall through to recompute
      }
      const gap = ratings[index.get(g.winnerId)!] - ratings[index.get(g.loserId)!];
      if (gap > rules.blowout.ratingGap && g.w > 2 * g.l + 1) {
        candidates.push({ gi, gap });
      }
    });
    candidates.sort((a, b) => b.gap - a.gap || ratedGames[a.gi].id.localeCompare(ratedGames[b.gi].id));

    const nextIgnored = new Set<string>();
    const retained = new Map<string, number>();
    for (const id of ids) {
      // count rated games per team (excluding currently ignored? recompute fresh)
      retained.set(id, teamGameList[index.get(id)!].length);
    }
    for (const c of candidates) {
      const g = ratedGames[c.gi];
      const remaining = (retained.get(g.winnerId) ?? 0);
      if (remaining - 1 >= rules.blowout.minRetainedGames) {
        nextIgnored.add(g.id);
        retained.set(g.winnerId, remaining - 1);
        if (rules.blowout.twoSidedExclude) {
          retained.set(g.loserId, (retained.get(g.loserId) ?? 0) - 1);
        }
      }
    }
    ignored = nextIgnored;

    // One weighted pass, sequential in-place (Gauss-Seidel): each team's
    // update sees already-updated opponents earlier in the order. Pure
    // simultaneous (Jacobi) updates oscillate forever on a 2-team single
    // game (A=B+d, B=A-d flips each step), while sequential settles at once.
    // Still a full step with no damping, per the gist.
    const prev = ratings.slice();
    // Accumulate per-team sums from the live ratings array in team order.
    for (let i = 0; i < n; i++) {
      let num = 0;
      let den = 0;
      for (const gi of teamGameList[i]) {
        const g = ratedGames[gi];
        if (ignored.has(g.id)) continue;
        const d = diffs[gi];
        if (g.winnerId === ids[i]) {
          num += g.weight * (ratings[index.get(g.loserId)!] + d);
        } else {
          num += g.weight * (ratings[index.get(g.winnerId)!] - d);
        }
        den += g.weight;
      }
      if (den > 0) ratings[i] = num / den;
    }
    let sumSq = 0;
    for (let i = 0; i < n; i++) sumSq += (ratings[i] - prev[i]) ** 2;
    finalRms = Math.sqrt(sumSq / Math.max(n, 1));
    if (finalRms < rules.solver.rmsTolerance) {
      converged = true;
      break;
    }
  }

  // Build contributions
  const teams = new Map<string, TeamRating>();
  ids.forEach((id, i) => {
    const rating = ratings[i];
    const contributions: GameContribution[] = [];
    for (const gi of teamGameList[i]) {
      const g = ratedGames[gi];
      const won = g.winnerId === id;
      const opp = won ? g.loserId : g.winnerId;
      const oppRating = ratings[index.get(opp)!];
      const d = diffs[gi];
      const gameRating = won ? oppRating + d : oppRating - d;
      const isIgnored = ignored.has(g.id);
      contributions.push({
        gameId: g.id,
        opponentId: opp,
        won,
        w: g.w,
        l: g.l,
        diff: d,
        gameRating,
        effect: gameRating - rating,
        weight: g.weight,
        scoreWeight: g.scoreWeight,
        dateWeight: g.dateWeight,
        seriesMultiplier: g.seriesMultiplier,
        ignored: isIgnored,
        ignoreReason: isIgnored ? 'blowout' : undefined,
      });
    }
    const used = contributions.filter((c) => !c.ignored).length;
    teams.set(id, { teamId: id, rating, gamesUsed: used, contributions });
  });

  const connectedComponents = findComponents(ids, ratedGames, ignored);

  return { teams, ignoredGameIds: ignored, iterations, converged, finalRms, connectedComponents };
}

function findComponents(ids: string[], games: NormalizedGame[], ignored: Set<string>): string[][] {
  const adj = new Map<string, Set<string>>();
  for (const id of ids) adj.set(id, new Set());
  for (const g of games) {
    if (ignored.has(g.id)) continue;
    adj.get(g.winnerId)?.add(g.loserId);
    adj.get(g.loserId)?.add(g.winnerId);
  }
  const seen = new Set<string>();
  const comps: string[][] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    const stack = [id];
    const comp: string[] = [];
    seen.add(id);
    while (stack.length) {
      const cur = stack.pop()!;
      comp.push(cur);
      for (const nb of adj.get(cur) ?? []) {
        if (!seen.has(nb)) {
          seen.add(nb);
          stack.push(nb);
        }
      }
    }
    comps.push(comp);
  }
  return comps;
}
