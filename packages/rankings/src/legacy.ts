import type { CanonicalDataset, RankingEvent, RankingGame, TeamSeason } from './model.js';
import { normalizeTeamName } from './normalize.js';

export interface LegacyGameLog {
  opponent: string;
  result: 'W' | 'L';
  score: string; // "13-4", always the team's own score first
  tournament: string | null;
  date: string | null; // "Oct 4", no year
  ignored?: boolean;
}

export interface LegacyTeam {
  name: string;
  games: LegacyGameLog[];
  hsniBid?: unknown;
  ultiworldRank?: number | null;
  scorereportId?: string | null;
  lat?: number | null;
  lon?: number | null;
}

export interface LegacyExport {
  season: string; // "2025-26"
  division: string;
  lastUpdated?: string;
  tournaments: Record<string, { name: string; league?: boolean; url?: string }>;
  teams: LegacyTeam[];
}

export interface LegacyReport {
  teamsIn: number;
  teamsOut: number;
  externalTeams: string[];
  logEntries: number;
  mirroredGames: number;
  singletonGames: number;
  unresolvedOpponents: string[];
  unresolvedTournaments: string[];
  unparseableScores: string[];
  undatedGames: number;
  mergedAliases: string[];
}

const MONTHS: Record<string, number> = {
  Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
  Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
};

function slug(name: string): string {
  return normalizeTeamName(name).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'team';
}

/** Mirror-collapse key: both teams' log entries for one game produce this. */
export function mirrorKey(
  teamId: string,
  oppId: string,
  date: string | null,
  winnerId: string,
  w: number,
  l: number,
  eventId: string | null,
): string {
  const pair = [teamId, oppId].sort().join('~');
  return [pair, date ?? 'nodate', winnerId, `${w}-${l}`, eventId ?? 'noevent'].join('|');
}

/**
 * Convert a legacy generated export (team game logs, mirrored per team) into
 * a canonical dataset. Each game appears in both teams' logs; entries are
 * collapsed by (teams, date, scores, event) with distinct ids kept as rematches.
 *
 * Limitations (reported, not hidden): dates carry no year (resolved by season),
 * JV flags and manual ignores from the Python data modules are not in the
 * export, and opponents missing from the team list become external teams.
 */
export function convertLegacyExport(
  legacy: LegacyExport,
  opts: { aliases?: Record<string, string> } = {},
): { dataset: CanonicalDataset; report: LegacyReport } {
  const fallYear = parseInt(legacy.season.split('-')[0], 10);
  const aliases = opts.aliases ?? {};
  const report: LegacyReport = {
    teamsIn: legacy.teams.length,
    teamsOut: 0,
    externalTeams: [],
    logEntries: 0,
    mirroredGames: 0,
    singletonGames: 0,
    unresolvedOpponents: [],
    unresolvedTournaments: [],
    unparseableScores: [],
    undatedGames: 0,
    mergedAliases: Object.entries(aliases).map(([from, to]) => `${from} -> ${to}`),
  };

  const teamByName = new Map<string, string>();
  const teams: TeamSeason[] = [];
  const skippedVariants = new Set(
    Object.keys(aliases).map((a) => a),
  );
  for (const t of legacy.teams) {
    if (skippedVariants.has(t.name)) continue; // folded into canonical entry
    const id = slug(t.name);
    if (teams.some((x) => x.id === id)) {
      throw new Error(
        `slug collision for ${t.name} (id ${id}); add an entry to aliases to declare the canonical name`,
      );
    }
    teamByName.set(t.name, id);
    teamByName.set(normalizeTeamName(t.name), id);
    teams.push({
      id,
      displayName: t.name,
      season: legacy.season,
      division: legacy.division,
      varsity: true,
      lat: t.lat ?? null,
      lon: t.lon ?? null,
    });
  }

  const present = new Set(legacy.teams.map((t) => t.name));
  for (const [from, to] of Object.entries(aliases)) {
    if (!present.has(from) && !present.has(to)) continue; // alias N/A to this export
    const canonicalId = teamByName.get(to);
    if (!canonicalId) throw new Error(`alias target missing: ${to}`);
    teamByName.set(from, canonicalId);
    teamByName.set(normalizeTeamName(from), canonicalId);
  }

  const eventByName = new Map<string, string>();
  const events: Record<string, RankingEvent> = {};
  for (const [eid, info] of Object.entries(legacy.tournaments ?? {})) {
    eventByName.set(info.name, eid);
    events[eid] = { id: eid, name: info.name, sourceUrl: info.url, league: info.league ?? false };
  }

  const resolveDate = (raw: string | null): string | null => {
    if (!raw) return null;
    const m = raw.match(/^([A-Za-z]+)\s+(\d{1,2})$/);
    if (!m) return null;
    const month = MONTHS[m[1].slice(0, 3)];
    if (!month) return null;
    const year = month >= 8 ? fallYear : fallYear + 1;
    return `${year}-${String(month).padStart(2, '0')}-${m[2].padStart(2, '0')}`;
  };

  const seen = new Map<string, RankingGame>();
  const keyCounts = new Map<string, number>();
  let n = 0;

  for (const t of legacy.teams) {
    const teamId = teamByName.get(t.name)!;
    for (const g of t.games ?? []) {
      report.logEntries++;
      let oppId = teamByName.get(g.opponent) ?? teamByName.get(normalizeTeamName(g.opponent));
      if (!oppId) {
        oppId = `ext-${slug(g.opponent)}`;
        if (!teamByName.has(g.opponent)) {
          teamByName.set(g.opponent, oppId);
          teamByName.set(normalizeTeamName(g.opponent), oppId);
          teams.push({
            id: oppId, displayName: g.opponent, season: legacy.season,
            division: legacy.division, varsity: true, external: true,
          });
          report.externalTeams.push(g.opponent);
          if (!report.unresolvedOpponents.includes(g.opponent)) report.unresolvedOpponents.push(g.opponent);
        } else {
          oppId = teamByName.get(g.opponent)!;
        }
      }
      const sm = g.score?.match(/(\d+)\s*[-:]\s*(\d+)/);
      if (!sm) {
        report.unparseableScores.push(`${t.name} vs ${g.opponent} (${g.score})`);
        continue;
      }
      const mine = parseInt(sm[1], 10);
      const theirs = parseInt(sm[2], 10);
      const teamWon = g.result === 'W';
      const date = resolveDate(g.date);
      if (!date) report.undatedGames++;
      let eventId: string | null = null;
      if (g.tournament) {
        eventId = eventByName.get(g.tournament) ?? null;
        if (!eventId && !report.unresolvedTournaments.includes(g.tournament)) {
          report.unresolvedTournaments.push(g.tournament);
        }
      }
      // Canonical key: sorted teams + full date + winner + scores + event.
      // Both mirrors produce the same key; rematches differ by date/score.
      const winner = teamWon ? teamId : oppId;
      const w = Math.max(mine, theirs);
      const l = Math.min(mine, theirs);
      const key = mirrorKey(teamId, oppId, date, winner, w, l, eventId);
      keyCounts.set(key, (keyCounts.get(key) ?? 0) + 1);
      if (seen.has(key)) continue;
      const id = `legacy-${String(n++).padStart(5, '0')}`;
      seen.set(key, {
        id,
        season: legacy.season,
        division: legacy.division,
        teamAId: teamId, // log owner; scoreA is their score
        teamBId: oppId,
        scoreA: mine,
        scoreB: theirs,
        status: date ? 'final' : 'excluded',
        date: date ?? '2000-01-01',
        eventId,
        seriesRound: 'regular',
        notes: date ? undefined : `undated legacy log entry (${g.date})`,
      });
    }
  }

  for (const [, count] of keyCounts) {
    if (count >= 2) report.mirroredGames++;
    else report.singletonGames++;
  }
  report.teamsOut = teams.length;
  return { dataset: { season: legacy.season, division: legacy.division, teams, games: [...seen.values()], events }, report };
}
