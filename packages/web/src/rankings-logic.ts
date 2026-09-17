/**
 * Pure view logic for the rankings page (filtering, sorting, badges,
 * sparklines, tournament summaries). Framework-free and DOM-free for testing.
 */
import type { CanonicalDataset } from '@scorebot/rankings';

export interface RankRow {
  id: string;
  name: string;
  rank: number | null;
  rating: number;
  qualified: boolean;
  region: string | null;
  gamesPlayed: number;
}

export interface TeamFilter {
  query: string;
  region: string; // 'all' or a region name
  hideProvisional: boolean;
}

export function filterTeams(rows: RankRow[], f: TeamFilter): RankRow[] {
  const q = f.query.trim().toLowerCase();
  return rows.filter((r) => {
    if (f.hideProvisional && !r.qualified) return false;
    if (f.region !== 'all' && r.region !== f.region) return false;
    if (q && !r.name.toLowerCase().includes(q)) return false;
    return true;
  });
}

export function sortTeams(rows: RankRow[], dir: 'asc' | 'desc'): RankRow[] {
  const key = (r: RankRow) => (r.rank == null ? Number.MAX_SAFE_INTEGER : r.rank);
  const sorted = [...rows].sort((a, b) => key(a) - key(b));
  return dir === 'asc' ? sorted : sorted.reverse();
}

/** Alphabetical directory order, case-insensitive. */
export function sortTeamsAlpha(rows: RankRow[]): RankRow[] {
  return [...rows].sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
}

export interface TournamentSummary {
  id: string;
  name: string;
  league: boolean;
  url: string | null;
  games: number;
  teams: number;
  from: string;
  to: string;
}

/** Per-event rollup over final games; games without an event are skipped. */
export function buildTournamentSummaries(dataset: CanonicalDataset): TournamentSummary[] {
  const acc = new Map<string, { games: number; teams: Set<string>; from: string; to: string }>();
  for (const g of dataset.games) {
    if (!g.eventId || g.status !== 'final') continue;
    let e = acc.get(g.eventId);
    if (!e) {
      e = { games: 0, teams: new Set(), from: g.date, to: g.date };
      acc.set(g.eventId, e);
    }
    e.games++;
    e.teams.add(g.teamAId);
    e.teams.add(g.teamBId);
    if (g.date < e.from) e.from = g.date;
    if (g.date > e.to) e.to = g.date;
  }
  return [...acc.entries()]
    .map(([id, e]) => ({
      id,
      name: dataset.events[id]?.name ?? id,
      league: dataset.events[id]?.league ?? false,
      url: dataset.events[id]?.sourceUrl ?? null,
      games: e.games,
      teams: e.teams.size,
      from: e.from,
      to: e.to,
    }))
    .sort((a, b) => b.games - a.games || a.name.localeCompare(b.name));
}

/** 'Southwest' -> 'SW', 'North Central' -> 'NC', 'Midwest' -> 'MW'. */
export function regionAbbrev(region: string | null): string {
  if (!region) return '—';
  const words = region.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  const compound = region.match(/^(North|South|East|West|Mid)(.+)$/i);
  if (compound) return (compound[1][0] + compound[2][0]).toUpperCase();
  return region.slice(0, 2).toUpperCase();
}

/** 1-based position of a team within its region, ordered by rating. */
export function regionSeed(rows: RankRow[], teamId: string): number | null {
  const team = rows.find((r) => r.id === teamId);
  if (!team || !team.region) return null;
  const mates = rows
    .filter((r) => r.region === team.region)
    .sort((a, b) => b.rating - a.rating);
  return mates.findIndex((r) => r.id === teamId) + 1;
}

export function statusLabel(row: RankRow): 'Ranked' | 'Provisional' {
  return row.qualified ? 'Ranked' : 'Provisional';
}

/** 'x,y x,y ...' polyline points scaling values into a w×h box. */
export function sparkPoints(values: number[], w: number, h: number): string {
  if (!values.length) return '';
  if (values.length === 1) return `0,${(h / 2).toFixed(1)} ${w.toFixed(1)},${(h / 2).toFixed(1)}`;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / span) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

export function sparkColor(values: number[]): 'up' | 'down' | 'flat' {
  if (values.length < 2) return 'flat';
  const last = values[values.length - 1];
  if (last > values[0]) return 'up';
  if (last < values[0]) return 'down';
  return 'flat';
}
