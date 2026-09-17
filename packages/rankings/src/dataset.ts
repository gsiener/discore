import type { CanonicalDataset, RankingGame, TeamSeason } from './model.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const STATUSES = new Set(['final', 'scheduled', 'in-progress', 'forfeit', 'excluded']);
const SERIES = new Set(['regular', 'sectionals', 'regionals', 'nationals']);

/**
 * Validate an unknown input as a CanonicalDataset. Strict on structure:
 * duplicate ids, unknown team refs, bad dates/scores are errors, never
 * silently inferred. Unknown event refs become warnings (eventId nulled).
 */
export function parseCanonicalDataset(input: unknown): { dataset: CanonicalDataset; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const d = input as Partial<CanonicalDataset>;

  if (!d || typeof d !== 'object') throw new Error('dataset must be an object');
  if (!d.season || typeof d.season !== 'string') errors.push('missing season');
  if (!d.division || typeof d.division !== 'string') errors.push('missing division');
  if (!Array.isArray(d.teams)) errors.push('teams must be an array');
  if (!Array.isArray(d.games)) errors.push('games must be an array');

  const teams: TeamSeason[] = [];
  const teamIds = new Set<string>();
  for (const [i, t] of (d.teams ?? []).entries()) {
    if (!t?.id || typeof t.id !== 'string') {
      errors.push(`teams[${i}]: missing id`);
      continue;
    }
    if (teamIds.has(t.id)) errors.push(`duplicate team id ${t.id}`);
    teamIds.add(t.id);
    if (!t.displayName || typeof t.displayName !== 'string') errors.push(`team ${t.id}: missing displayName`);
    teams.push({
      id: t.id,
      displayName: t.displayName ?? t.id,
      aliases: Array.isArray(t.aliases) ? t.aliases : undefined,
      season: typeof t.season === 'string' ? t.season : (d.season as string),
      division: typeof t.division === 'string' ? t.division : (d.division as string),
      varsity: t.varsity ?? true,
      external: t.external ?? false,
      region: t.region,
      lat: t.lat ?? null,
      lon: t.lon ?? null,
    });
  }

  const events = d.events && typeof d.events === 'object' ? d.events : {};
  const games: RankingGame[] = [];
  const gameIds = new Set<string>();
  for (const [i, g] of (d.games ?? []).entries()) {
    const where = `games[${i}]${g?.id ? ` (${g.id})` : ''}`;
    if (!g?.id || typeof g.id !== 'string') {
      errors.push(`${where}: missing id`);
      continue;
    }
    if (gameIds.has(g.id)) {
      errors.push(`duplicate game id ${g.id}`);
      continue;
    }
    gameIds.add(g.id);
    if (!teamIds.has(g.teamAId)) errors.push(`${where}: unknown teamAId ${g.teamAId}`);
    if (!teamIds.has(g.teamBId)) errors.push(`${where}: unknown teamBId ${g.teamBId}`);
    if (g.teamAId === g.teamBId) errors.push(`${where}: teamAId equals teamBId`);
    if (!STATUSES.has(g.status)) errors.push(`${where}: bad status ${g.status}`);
    if (!g.date || !DATE_RE.test(g.date)) errors.push(`${where}: bad date ${g.date}`);
    for (const [label, v] of [['scoreA', g.scoreA], ['scoreB', g.scoreB]] as const) {
      if (v != null && (!Number.isInteger(v) || v < 0)) errors.push(`${where}: bad ${label} ${v}`);
    }
    if (g.seriesRound && !SERIES.has(g.seriesRound)) errors.push(`${where}: bad seriesRound ${g.seriesRound}`);
    let eventId = g.eventId ?? null;
    if (eventId && !events[eventId]) {
      warnings.push(`${where}: unknown eventId ${eventId} (nulled)`);
      eventId = null;
    }
    games.push({
      id: g.id,
      season: typeof g.season === 'string' ? g.season : (d.season as string),
      division: typeof g.division === 'string' ? g.division : (d.division as string),
      teamAId: g.teamAId,
      teamBId: g.teamBId,
      scoreA: g.scoreA ?? null,
      scoreB: g.scoreB ?? null,
      status: g.status,
      date: g.date,
      eventId,
      seriesRound: g.seriesRound ?? 'regular',
      sourceIds: Array.isArray(g.sourceIds) ? g.sourceIds : undefined,
      notes: g.notes,
    });
  }

  if (errors.length) throw new Error(`invalid dataset:\n- ${errors.join('\n- ')}`);
  return {
    dataset: {
      season: d.season as string,
      division: d.division as string,
      teams,
      games,
      events,
      overrides: Array.isArray(d.overrides) ? d.overrides : undefined,
    },
    warnings,
  };
}
