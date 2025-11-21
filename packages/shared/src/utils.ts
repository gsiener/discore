/**
 * Shared utility functions
 */

import { Game, GameEvent, Score, TeamSide } from './types.js';

/**
 * Generate a unique ID for games and events
 */
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
}

/**
 * Calculate score from events
 */
export function calculateScoreFromEvents(events: GameEvent[]): Score {
  const score: Score = { us: 0, them: 0 };

  for (const event of events) {
    if (event.type === 'goal' && event.team) {
      score[event.team]++;
    }
  }

  return score;
}

/**
 * Format score as string (e.g., "5-3")
 */
export function formatScore(score: Score): string {
  return `${score.us}-${score.them}`;
}

/**
 * Parse score from string (e.g., "5-3", "5 - 3", "5:3")
 */
export function parseScore(text: string): Score | null {
  const patterns = [
    /(\d+)\s*[-:]\s*(\d+)/, // "5-3", "5 - 3", "5:3"
    /(\d+)\s+to\s+(\d+)/i,  // "5 to 3"
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return {
        us: parseInt(match[1], 10),
        them: parseInt(match[2], 10),
      };
    }
  }

  return null;
}

/**
 * Format timestamp as readable time
 */
export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get game duration in minutes
 */
export function getGameDuration(game: Game): number | null {
  if (!game.startedAt) return null;
  const endTime = game.finishedAt || Date.now();
  return Math.floor((endTime - game.startedAt) / 1000 / 60);
}
