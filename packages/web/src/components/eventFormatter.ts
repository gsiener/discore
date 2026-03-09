/**
 * Event formatting utilities for displaying game events
 */

import type { Game, GameEvent } from '@scorebot/shared';
import { EventType } from '@scorebot/shared';
import { isBreakScore } from './breakDetection.js';

export function getEventIcon(event: GameEvent, allEvents: GameEvent[], game: Game): string {
  switch (event.type) {
    case EventType.GOAL:
      if (!event.team) return '\u26BD';
      const isBreak = isBreakScore(event, allEvents, game);
      return isBreak ? '\u26A0\uFE0F' : '\u2713';
    case EventType.GAME_START:
      return '\uD83C\uDFC1';
    case EventType.HALFTIME:
      return '\u23F8\uFE0F';
    case EventType.SECOND_HALF_START:
      return '\u25B6\uFE0F';
    case EventType.GAME_END:
      return '\uD83C\uDFC1';
    case EventType.TIMEOUT:
      return '\u23F1\uFE0F';
    case EventType.NOTE:
      // Show defensive play icon if present
      if (event.defensivePlay === 'block') return '\uD83D\uDEE1\uFE0F';
      if (event.defensivePlay === 'steal') return '\uD83C\uDFC3';
      return '\uD83D\uDCDD';
    default:
      return '\u2022';
  }
}

export function formatEventType(event: GameEvent, game: Game, allEvents: GameEvent[]): string {
  switch (event.type) {
    case EventType.GAME_START:
      return 'Game Start';
    case EventType.GOAL:
      if (!event.team) return 'Goal';

      // Determine if this is a hold or break
      const teamName = event.team === 'us' ? game.teams.us.name : game.teams.them.name;
      const isBreak = isBreakScore(event, allEvents, game);

      return isBreak
        ? `Break Score for ${teamName}`
        : `Offensive Hold for ${teamName}`;
    case EventType.HALFTIME:
      return 'Halftime';
    case EventType.SECOND_HALF_START:
      return 'Second Half Started';
    case EventType.GAME_END:
      return 'Game Ended';
    case EventType.TIMEOUT:
      const timeoutTeam = event.team === 'us' ? game.teams.us.name : event.team === 'them' ? game.teams.them.name : 'Unknown';
      return `Timeout - ${timeoutTeam}`;
    case EventType.NOTE:
      // Show defensive play type if present
      if (event.defensivePlay === 'block') return 'Block';
      if (event.defensivePlay === 'steal') return 'Steal';
      return event.message || 'Note';
    default:
      return event.type;
  }
}
