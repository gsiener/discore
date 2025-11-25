/**
 * Shared utility functions
 */

import { Game, GameEvent, Score, TeamSide, LineStats, EventType } from './types.js';

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
 * Calculate O-line/D-line efficiency statistics from game events
 */
export function calculateLineStats(game: Game): LineStats | null {
  // Can't calculate without knowing starting possession
  if (game.startingOnOffense === undefined) {
    return null;
  }

  const goalEvents = game.events.filter(e => e.type === EventType.GOAL);

  if (goalEvents.length === 0) {
    return {
      oLinePoints: 0,
      oLineHolds: 0,
      oLineHoldPercentage: 0,
      dLinePoints: 0,
      dLineBreaks: 0,
      dLineBreakPercentage: 0,
    };
  }

  let oLinePoints = 0;
  let oLineHolds = 0;
  let dLinePoints = 0;
  let dLineBreaks = 0;

  // Track who has possession at the start of each point
  let weHavePossession = game.startingOnOffense;

  goalEvents.forEach((event) => {
    // Determine if this is an O-line or D-line point for us
    if (weHavePossession) {
      // We're on offense
      oLinePoints++;
      if (event.team === 'us') {
        // We scored while on offense = hold
        oLineHolds++;
      }
      // If they scored, we didn't hold (no increment)
    } else {
      // We're on defense
      dLinePoints++;
      if (event.team === 'us') {
        // We scored while on defense = break
        dLineBreaks++;
      }
      // If they scored, we didn't break (no increment)
    }

    // After each goal, possession switches to the team that didn't score
    if (event.team === 'us') {
      weHavePossession = false; // They receive next
    } else {
      weHavePossession = true; // We receive next
    }
  });

  return {
    oLinePoints,
    oLineHolds,
    oLineHoldPercentage: oLinePoints > 0 ? Math.round((oLineHolds / oLinePoints) * 100) : 0,
    dLinePoints,
    dLineBreaks,
    dLineBreakPercentage: dLinePoints > 0 ? Math.round((dLineBreaks / dLinePoints) * 100) : 0,
  };
}
