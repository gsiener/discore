/**
 * Shared utility functions
 */

import { Game, GameEvent, Score, TeamSide, LineStats } from './types.js';
import { buildPointLedger } from './pointLedger.js';

/**
 * Generate a unique ID for games and events
 * Uses base-36 encoding for compact, URL-safe identifiers
 */
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36); // Base-36 timestamp
  const random = Math.random().toString(36).substring(2, 9); // Base-36 random string
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

/**
 * Calculate O-line/D-line efficiency statistics from game events.
 *
 * Beyond the headline hold/break counts, this also tracks:
 *   - oLineDirtyHolds: O-line points we held but only after turning it back over
 *     and reclaiming via a block/steal (counts as a hold but signals sloppy O).
 *   - dLineFailedConversions: D-line points where we forced at least one turn
 *     (logged Tech block/steal) but still gave up the goal.
 *
 * Detection of a "forced turn within this point" relies on note events whose
 * message starts with a capitalized player name followed by "block" or "steal",
 * or on goal events carrying a `defensivePlay` field.
 */
export function calculateLineStats(game: Game): LineStats | null {
  // Can't calculate without knowing starting possession — inferred results
  // from an unseeded ledger must never feed efficiency stats.
  if (game.startingOnOffense === undefined) {
    return null;
  }

  let oLinePoints = 0;
  let oLineHolds = 0;
  let oLineDirtyHolds = 0;
  let dLinePoints = 0;
  let dLineBreaks = 0;
  let dLineFailedConversions = 0;

  for (const point of buildPointLedger(game).points) {
    const scoredByUs = point.scoringTeam === TeamSide.US;
    if (point.ourLine === 'O') {
      oLinePoints++;
      if (scoredByUs) {
        oLineHolds++;
        if (point.forcedTurn) oLineDirtyHolds++;
      }
    } else {
      dLinePoints++;
      if (scoredByUs) {
        dLineBreaks++;
      } else if (point.forcedTurn) {
        dLineFailedConversions++;
      }
    }
  }

  return {
    oLinePoints,
    oLineHolds,
    oLineHoldPercentage: oLinePoints > 0 ? Math.round((oLineHolds / oLinePoints) * 100) : 0,
    oLineDirtyHolds,
    dLinePoints,
    dLineBreaks,
    dLineBreakPercentage: dLinePoints > 0 ? Math.round((dLineBreaks / dLinePoints) * 100) : 0,
    dLineFailedConversions,
  };
}
