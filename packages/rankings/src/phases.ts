import type { CanonicalDataset, RankingGame } from './model.js';

export type GamePhase = 'pool' | 'bracket';

/**
 * Infers pool play vs bracket for tournament games. The source has no round
 * field, so this reads the shape of each event: pools show up as complete
 * round-robins (every pair of teams in the group met). A pool team's first game
 * against a poolmate is pool play; every other game is bracket.
 *
 * Only labels an event when that reading is unambiguous: every team sits in a
 * round-robin pool of 3+, and no team plays a bracket game on an earlier day
 * than one of its pool games. Swiss-style or partially reported events, and
 * leagues, get no labels rather than a guess.
 */
export function inferGamePhases(dataset: CanonicalDataset): Map<string, GamePhase> {
  const byEvent = new Map<string, RankingGame[]>();
  for (const g of dataset.games) {
    if (g.status !== 'final' || !g.eventId) continue;
    if (dataset.events[g.eventId]?.league) continue;
    let list = byEvent.get(g.eventId);
    if (!list) byEvent.set(g.eventId, (list = []));
    list.push(g);
  }
  const out = new Map<string, GamePhase>();
  for (const games of byEvent.values()) {
    for (const [id, phase] of eventPhases(games)) out.set(id, phase);
  }
  return out;
}

function eventPhases(games: RankingGame[]): Map<string, GamePhase> {
  const adj = new Map<string, Set<string>>();
  const link = (a: string, b: string) => {
    if (!adj.has(a)) adj.set(a, new Set());
    adj.get(a)!.add(b);
  };
  for (const g of games) {
    link(g.teamAId, g.teamBId);
    link(g.teamBId, g.teamAId);
  }

  // Disjoint pools: largest round-robin groups first.
  const cliques = maximalCliques(adj)
    .filter((c) => c.length >= 3)
    .sort((a, b) => b.length - a.length || a.join().localeCompare(b.join()));
  const poolOf = new Map<string, number>();
  cliques.forEach((c, i) => {
    if (c.some((t) => poolOf.has(t))) return;
    for (const t of c) poolOf.set(t, i);
  });
  if (poolOf.size !== adj.size) return new Map();

  const ordered = [...games].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const met = new Set<string>();
  const phases = new Map<string, GamePhase>();
  for (const g of ordered) {
    const pair = [g.teamAId, g.teamBId].sort().join('|');
    const pool = poolOf.get(g.teamAId) === poolOf.get(g.teamBId) && !met.has(pair);
    met.add(pair);
    phases.set(g.id, pool ? 'pool' : 'bracket');
  }

  // Pool play must come first for every team.
  const lastPool = new Map<string, string>();
  const firstBracket = new Map<string, string>();
  for (const g of ordered) {
    for (const t of [g.teamAId, g.teamBId]) {
      if (phases.get(g.id) === 'pool') lastPool.set(t, g.date);
      else if (!firstBracket.has(t)) firstBracket.set(t, g.date);
    }
  }
  for (const [t, d] of firstBracket) {
    if ((lastPool.get(t) ?? '') > d) return new Map();
  }
  return phases;
}

/** Bron–Kerbosch with pivoting; events have at most a few dozen teams. */
function maximalCliques(adj: Map<string, Set<string>>): string[][] {
  const out: string[][] = [];
  const nbrs = (v: string) => adj.get(v) ?? new Set<string>();
  const visit = (r: string[], p: Set<string>, x: Set<string>) => {
    if (p.size === 0 && x.size === 0) {
      out.push([...r].sort());
      return;
    }
    let pivot = '';
    let best = -1;
    for (const u of [...p, ...x]) {
      const n = [...p].filter((v) => nbrs(u).has(v)).length;
      if (n > best) [pivot, best] = [u, n];
    }
    for (const v of [...p].filter((v) => !nbrs(pivot).has(v)).sort()) {
      const n = nbrs(v);
      visit([...r, v], new Set([...p].filter((w) => n.has(w))), new Set([...x].filter((w) => n.has(w))));
      p.delete(v);
      x.add(v);
    }
  };
  visit([], new Set([...adj.keys()].sort()), new Set());
  return out;
}
