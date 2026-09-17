import { projectScore } from './math.js';

export interface PoolTeam {
  id: string;
  rating: number;
  seed: number;
}

export interface PoolGameResult {
  aId: string;
  bId: string;
  aScore: number;
  bScore: number;
  simulated: boolean;
}

export interface PoolStanding {
  teamId: string;
  wins: number;
  pointDiff: number;
  rating: number;
  seed: number;
}

export type BracketFormat = 'two-pools-of-4' | 'four-pools-of-4' | 'single-elim-8' | 'manual';

/**
 * Pool standings: wins, head-to-head among tied, point diff among tied,
 * overall pool point diff, rating, seed.
 */
export function computePoolStandings(teams: PoolTeam[], games: PoolGameResult[]): PoolStanding[] {
  const wins = new Map<string, number>();
  const diff = new Map<string, number>();
  for (const t of teams) {
    wins.set(t.id, 0);
    diff.set(t.id, 0);
  }
  for (const g of games) {
    if (g.aScore === g.bScore) continue;
    const winner = g.aScore > g.bScore ? g.aId : g.bId;
    wins.set(winner, (wins.get(winner) ?? 0) + 1);
    diff.set(g.aId, (diff.get(g.aId) ?? 0) + (g.aScore - g.bScore));
    diff.set(g.bId, (diff.get(g.bId) ?? 0) + (g.bScore - g.aScore));
  }
  const byId = new Map(teams.map((t) => [t.id, t]));
  const standings: PoolStanding[] = teams.map((t) => ({
    teamId: t.id,
    wins: wins.get(t.id) ?? 0,
    pointDiff: diff.get(t.id) ?? 0,
    rating: t.rating,
    seed: t.seed,
  }));

  // Group by wins, then apply h2h + tied-diff within group
  const groups = new Map<number, PoolStanding[]>();
  for (const s of standings) {
    const arr = groups.get(s.wins) ?? [];
    arr.push(s);
    groups.set(s.wins, arr);
  }
  const out: PoolStanding[] = [];
  for (const w of [...groups.keys()].sort((a, b) => b - a)) {
    const group = groups.get(w)!;
    if (group.length === 1) {
      out.push(group[0]);
      continue;
    }
    const ids = new Set(group.map((s) => s.teamId));
    const h2h = new Map<string, number>();
    const tiedDiff = new Map<string, number>();
    for (const s of group) {
      h2h.set(s.teamId, 0);
      tiedDiff.set(s.teamId, 0);
    }
    for (const g of games) {
      if (!ids.has(g.aId) || !ids.has(g.bId)) continue;
      if (g.aScore === g.bScore) continue;
      const winner = g.aScore > g.bScore ? g.aId : g.bId;
      h2h.set(winner, (h2h.get(winner) ?? 0) + 1);
      tiedDiff.set(g.aId, (tiedDiff.get(g.aId) ?? 0) + (g.aScore - g.bScore));
      tiedDiff.set(g.bId, (tiedDiff.get(g.bId) ?? 0) + (g.bScore - g.aScore));
    }
    group.sort(
      (a, b) =>
        (h2h.get(b.teamId) ?? 0) - (h2h.get(a.teamId) ?? 0) ||
        (tiedDiff.get(b.teamId) ?? 0) - (tiedDiff.get(a.teamId) ?? 0) ||
        b.pointDiff - a.pointDiff ||
        (byId.get(b.teamId)?.rating ?? 0) - (byId.get(a.teamId)?.rating ?? 0) ||
        (byId.get(a.teamId)?.seed ?? 0) - (byId.get(b.teamId)?.seed ?? 0),
    );
    out.push(...group);
  }
  return out;
}

/** Overall order across pools: all 1st by rating, then all 2nd, etc. */
export function orderAcrossPools(poolStandings: PoolStanding[][]): string[] {
  const maxDepth = Math.max(...poolStandings.map((p) => p.length));
  const out: string[] = [];
  for (let place = 0; place < maxDepth; place++) {
    const contenders = poolStandings.map((p) => p[place]).filter(Boolean);
    contenders.sort((a, b) => b.rating - a.rating);
    out.push(...contenders.map((c) => c.teamId));
  }
  return out;
}

/** Prefill an unplayed game between two rated teams using projectScore. */
export function prefillScore(ratingA: number, ratingB: number, cap = 15): { aScore: number; bScore: number } {
  const gap = ratingA - ratingB;
  const p = projectScore(gap, cap);
  return ratingA >= ratingB ? { aScore: p.winner, bScore: p.loser } : { aScore: p.loser, bScore: p.winner };
}

/** Pairings for supported templates. Manual format: caller supplies bracket rows. */
export function templatePairings(format: BracketFormat, seeds: string[]): [string, string][] {
  if (format === 'two-pools-of-4' || format === 'four-pools-of-4') {
    // Round-robin within each pool of 4: 6 games per pool
    const pairs: [string, string][] = [];
    const poolSize = 4;
    for (let p = 0; p < seeds.length; p += poolSize) {
      const pool = seeds.slice(p, p + poolSize);
      for (let i = 0; i < pool.length; i++) {
        for (let j = i + 1; j < pool.length; j++) pairs.push([pool[i], pool[j]]);
      }
    }
    return pairs;
  }
  if (format === 'single-elim-8') {
    const s = [...seeds].slice(0, 8);
    // 1v8, 4v5, 2v7, 3v6
    const order = [0, 7, 3, 4, 1, 6, 2, 5];
    const pairs: [string, string][] = [];
    for (let i = 0; i < order.length; i += 2) pairs.push([s[order[i]], s[order[i + 1]]]);
    return pairs;
  }
  return [];
}
