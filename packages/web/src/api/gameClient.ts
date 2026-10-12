/**
 * API client for fetching game data
 * The only module that knows the API base URL, endpoint paths, and HTTP error handling
 */

import { currentSeason, isInSeason, seasonRange } from '@scorebot/shared';
import type {
  AdvancedStats,
  AggregatedPlayerStats,
  Game,
  GameSummary,
  PlayerChemistry,
  TeamTrends,
} from '@scorebot/shared';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:8787';

export interface AggregatedStatsResponse {
  players: AggregatedPlayerStats[];
  totalGames: number;
  teamTrends?: TeamTrends;
  playerChemistry?: PlayerChemistry[];
}

/**
 * Season shown by every page: `?season=2025-26` picks one, `?season=all`
 * disables filtering (returns null), otherwise the current season.
 */
export function selectedSeason(search: string = window.location.search): string | null {
  const param = new URLSearchParams(search).get('season');
  if (param === 'all') return null;
  if (param && /^\d{4}-\d{2}$/.test(param)) return param;
  return currentSeason();
}

export async function fetchGames(limit = 100): Promise<GameSummary[]> {
  const response = await fetch(`${API_BASE_URL}/games?limit=${limit}`);
  if (!response.ok) throw new Error('Failed to fetch games');

  const data = await response.json();
  const games: GameSummary[] = data.games;
  const season = selectedSeason();
  if (!season) return games;

  return games.filter((g) => {
    const date =
      g.gameDate ?? (g.startedAt ? new Date(g.startedAt).toISOString().slice(0, 10) : undefined);
    return isInSeason(date, season);
  });
}

export async function fetchGame(gameId: string): Promise<Game> {
  const response = await fetch(`${API_BASE_URL}/games/${gameId}`);
  if (!response.ok) throw new Error('Failed to fetch game');

  const data = await response.json();
  return data.game;
}

export async function fetchGameStats(gameId: string): Promise<AdvancedStats> {
  const response = await fetch(`${API_BASE_URL}/games/${gameId}/stats`);
  if (!response.ok) throw new Error('Failed to fetch game stats');

  const data = await response.json();
  return data.stats;
}

export async function fetchAggregatedStats(
  tournament?: string,
  limit = 100
): Promise<AggregatedStatsResponse> {
  let url = `${API_BASE_URL}/stats/aggregated?limit=${limit}`;
  if (tournament) {
    url += `&tournament=${encodeURIComponent(tournament)}`;
  }

  const season = selectedSeason();
  if (season) {
    const { from, to } = seasonRange(season);
    url += `&from=${from}&to=${to}`;
  }

  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch aggregated stats');

  return response.json();
}

/**
 * Repeatedly invoke fn every intervalMs. When immediate is true, fn also
 * fires right away (fire-and-forget). Returns a stop function.
 */
export function poll(
  fn: () => void,
  intervalMs: number,
  immediate = false
): () => void {
  if (immediate) fn();
  const interval = window.setInterval(fn, intervalMs);
  return () => clearInterval(interval);
}
