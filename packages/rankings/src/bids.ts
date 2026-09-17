export interface BidTeam {
  id: string;
  region: string;
  rating: number;
  confidence?: 'low' | 'med' | 'high';
  stdDev?: number;
}

export function allocateBids(
  rankedTeams: BidTeam[],
  totalBids: number,
  regions: string[],
  maxPerRegion = Infinity,
): Record<string, number> {
  const bids: Record<string, number> = Object.fromEntries(regions.map((r) => [r, 0]));
  let assigned = 0;
  for (const r of regions) {
    if (rankedTeams.some((t) => t.region === r)) {
      bids[r] = 1;
      assigned++;
    }
  }
  const used = new Map<string, number>();
  for (const t of rankedTeams) {
    if (assigned >= totalBids) break;
    const u = used.get(t.region) ?? 0;
    used.set(t.region, u + 1);
    if (u === 0) continue; // auto bid covers region's top team
    if (bids[t.region] >= maxPerRegion) continue;
    bids[t.region]++;
    assigned++;
  }
  return bids;
}

export const BID_CUTOFFS = {
  club: 16,
  collegeDi: 20,
  collegeDiii: 16,
  collegeDiiiMaxPerRegion: 4,
} as const;

/** FNV-1a hash for seeding bid Monte Carlo from input ids. */
export function hashIds(ids: string[]): number {
  let h = 0x811c9dc5;
  for (const id of ids) {
    for (let i = 0; i < id.length; i++) {
      h ^= id.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
  }
  return h >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface BidProbabilities {
  regions: string[];
  expected: Record<string, number>;
  p0: Record<string, number>;
  p1: Record<string, number>;
  p2: Record<string, number>;
  p3plus: Record<string, number>;
  runs: number;
  seed: number;
}

/**
 * Seeded 5,000-run Monte Carlo over ratings. Low-confidence teams stay at
 * point estimate (their SD is noise). Returns P(0/1/2/3+) + expected bids.
 */
export function bidProbabilities(
  teams: BidTeam[],
  totalBids: number,
  regions: string[],
  opts: { runs?: number; maxPerRegion?: number; seed?: number } = {},
): BidProbabilities {
  const runs = opts.runs ?? 5000;
  const maxPerRegion = opts.maxPerRegion ?? Infinity;
  const seed = opts.seed ?? hashIds(teams.map((t) => t.id).sort());
  const randn = makeGaussian(mulberry32(seed));

  const counts: Record<string, number[]> = Object.fromEntries(regions.map((r) => [r, [0, 0, 0, 0]]));
  const totals: Record<string, number> = Object.fromEntries(regions.map((r) => [r, 0]));

  for (let k = 0; k < runs; k++) {
    const sampled = teams.map((t) => ({
      id: t.id,
      region: t.region,
      rating: t.confidence === 'low' ? t.rating : t.rating + randn() * (t.stdDev ?? 0),
    }));
    sampled.sort((a, b) => b.rating - a.rating);
    const bids = allocateBids(sampled, totalBids, regions, maxPerRegion);
    for (const r of regions) {
      const b = bids[r] ?? 0;
      totals[r] += b;
      const bucket = b >= 3 ? 3 : b;
      counts[r][bucket]++;
    }
  }
  const expected: Record<string, number> = {};
  const p0: Record<string, number> = {};
  const p1: Record<string, number> = {};
  const p2: Record<string, number> = {};
  const p3plus: Record<string, number> = {};
  for (const r of regions) {
    expected[r] = totals[r] / runs;
    p0[r] = counts[r][0] / runs;
    p1[r] = counts[r][1] / runs;
    p2[r] = counts[r][2] / runs;
    p3plus[r] = counts[r][3] / runs;
  }
  return { regions, expected, p0, p1, p2, p3plus, runs, seed };
}

function makeGaussian(uniform: () => number): () => number {
  let spare: number | null = null;
  return () => {
    if (spare != null) {
      const v = spare;
      spare = null;
      return v;
    }
    let u = 0;
    let v = 0;
    do {
      u = uniform();
    } while (u === 0);
    v = uniform();
    const mag = Math.sqrt(-2 * Math.log(u));
    spare = mag * Math.sin(2 * Math.PI * v);
    return mag * Math.cos(2 * Math.PI * v);
  };
}
