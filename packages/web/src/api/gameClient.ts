/**
 * API client for fetching game data
 */

import type { Game, GameSummary } from '@scorebot/shared';

export const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:8787';

export async function fetchGames(): Promise<GameSummary[]> {
  const response = await fetch(`${API_BASE_URL}/games`);
  if (!response.ok) throw new Error('Failed to fetch games');

  const data = await response.json();
  return data.games;
}

export async function fetchGame(gameId: string): Promise<Game> {
  const response = await fetch(`${API_BASE_URL}/games/${gameId}`);
  if (!response.ok) throw new Error('Failed to fetch game');

  const data = await response.json();
  return data.game;
}
