/**
 * Canonical rankings data model.
 *
 * Distinct from packages/shared chat Game: rankings inputs are curated
 * final results with stable IDs, full dates, and provenance.
 */

export type Division = 'boys' | 'girls' | 'club-men' | 'club-women' | 'club-mixed' | 'college-di' | 'college-diii';

export interface TeamSeason {
  id: string;
  displayName: string;
  aliases?: string[];
  season: string; // e.g. "2025-26"
  division: Division | string;
  varsity?: boolean; // false for JV/B
  external?: boolean; // true for opponents auto-created by the legacy adapter
  region?: string;
  lat?: number | null;
  lon?: number | null;
}

export type GameStatus = 'final' | 'scheduled' | 'in-progress' | 'forfeit' | 'excluded';

export interface RankingGame {
  id: string;
  season: string;
  division: Division | string;
  teamAId: string;
  teamBId: string;
  scoreA: number | null; // null for forfeit / non-numeric W-F
  scoreB: number | null;
  status: GameStatus;
  date: string; // YYYY-MM-DD
  eventId?: string | null;
  seriesRound?: 'regular' | 'sectionals' | 'regionals' | 'nationals';
  sourceIds?: string[];
  notes?: string;
}

export interface RankingEvent {
  id: string;
  name: string;
  startDate?: string; // YYYY-MM-DD (optional for legacy imports)
  endDate?: string; // YYYY-MM-DD
  sourceUrl?: string;
  league?: boolean; // true = league play (HS eligibility rule)
  sanction?: 'regular' | 'series' | 'recreational';
}

export interface GameOverride {
  gameId: string;
  action: 'include' | 'exclude';
  reason: string;
}

export interface CanonicalDataset {
  season: string;
  division: Division | string;
  teams: TeamSeason[];
  games: RankingGame[];
  events: Record<string, RankingEvent>;
  overrides?: GameOverride[];
}
